"""Chat service: session management, memory, coordinator routing via LangGraph."""
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ai.agents import run_chat_turn
from app.core.exceptions import NotFoundError
from app.models.chat import ChatMessage, ChatSession
from app.models.user import User

logger = logging.getLogger("app.services.chat")

TITLE_MAX = 60


def build_farmer_context(user: User, db=None) -> str:
    """Compact farmer profile block injected into agent prompts.
    Includes exact coordinates + precision when available."""
    if user.latitude is not None and user.longitude is not None:
        place = ", ".join(filter(None, [user.village, user.district, user.state])) or "saved pin"
        location = (
            f"Location: {place} — EXACT coordinates {float(user.latitude):.4f}, "
            f"{float(user.longitude):.4f} (source: {user.location_source or 'pin'})"
        )
    else:
        location = "Location: " + ", ".join(filter(None, [user.village, user.district, user.state])).strip() or "Location: unknown (district-level only)"
    parts = [
        f"Name: {user.name}",
        location,
        f"Farm size: {user.farm_size_acres} acres",
        f"Soil: {user.soil_type}",
        f"Water: {user.water_availability}",
    ]
    return "\n".join(parts)


class ChatService:
    def __init__(self, db: Session):
        self.db = db

    def list_sessions(self, user_id: str) -> list[ChatSession]:
        return (
            self.db.query(ChatSession)
            .filter(ChatSession.user_id == uuid.UUID(user_id))
            .order_by(ChatSession.updated_at.desc())
            .limit(50)
            .all()
        )

    def create_session(self, user_id: str, title: str = "New conversation") -> ChatSession:
        session = ChatSession(user_id=uuid.UUID(user_id), title=title[:TITLE_MAX])
        self.db.add(session)
        self.db.flush()
        return session

    def get_session(self, user_id: str, session_id: str) -> ChatSession:
        session = (
            self.db.query(ChatSession)
            .filter(
                ChatSession.id == uuid.UUID(session_id),
                ChatSession.user_id == uuid.UUID(user_id),
            )
            .first()
        )
        if not session:
            raise NotFoundError("Chat session not found")
        return session

    def get_messages(self, user_id: str, session_id: str) -> list[ChatMessage]:
        session = self.get_session(user_id, session_id)
        return (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )

    def delete_session(self, user_id: str, session_id: str) -> None:
        session = self.get_session(user_id, session_id)
        self.db.delete(session)

    def _prepare_turn(
        self, user: User, session_id: str | None, content: str
    ) -> tuple[ChatSession, list[dict], str]:
        """Shared preamble: resolve session, persist the user message, build history/context."""
        if session_id:
            session = self.get_session(str(user.id), session_id)
        else:
            title = content.strip()[:TITLE_MAX] or "New conversation"
            session = self.create_session(str(user.id), title)

        user_msg = ChatMessage(
            session_id=session.id,
            user_id=user.id,
            role="user",
            content=content,
        )
        self.db.add(user_msg)
        self.db.flush()

        history = [
            {"role": m.role, "content": m.content}
            for m in self.get_messages(str(user.id), str(session.id))[:-1][-12:]
        ]
        context = build_farmer_context(user, self.db)
        return session, history, context

    def _persist_assistant(
        self, session: ChatSession, content: str, agent_used: str
    ) -> ChatMessage:
        assistant_msg = ChatMessage(
            session_id=session.id,
            user_id=session.user_id,
            role="assistant",
            content=content,
            agent=agent_used,
        )
        self.db.add(assistant_msg)
        session.updated_at = datetime.now(timezone.utc)
        self.db.flush()
        return assistant_msg

    async def send_message(
        self, user: User, session_id: str | None, content: str, forced_agent: str | None = None
    ) -> tuple[ChatSession, ChatMessage, ChatMessage, dict]:
        """Persist user msg, run agent graph, persist assistant msg."""
        session, history, context = self._prepare_turn(user, session_id, content)

        if forced_agent:
            # Direct-to-agent mode (bypass coordinator routing)
            from app.ai.claude_client import get_claude
            from app.ai.prompts import (
                ADVISOR_SYSTEM,
                CROP_RECOMMENDATION_SYSTEM,
                MARKET_FORECAST_SYSTEM,
                PROFIT_OPTIMIZATION_SYSTEM,
                WEATHER_AGENT_SYSTEM,
            )

            system_map = {
                "crop": CROP_RECOMMENDATION_SYSTEM,
                "disease": None,
                "weather": WEATHER_AGENT_SYSTEM,
                "market": MARKET_FORECAST_SYSTEM,
                "profit": PROFIT_OPTIMIZATION_SYSTEM,
                "advisor": ADVISOR_SYSTEM,
            }
            system_map["disease"] = (
                "You are a plant pathologist helping via chat. Ask targeted diagnostic "
                "questions and give likely causes plus immediate steps."
            )
            system = system_map.get(forced_agent, ADVISOR_SYSTEM)
            claude = get_claude()
            response_text = claude.complete(
                system=system + "\n\nFARMER CONTEXT:\n" + context,
                messages=[{"role": "user", "content": content}],
                max_tokens=1400,
            )
            agent_used = forced_agent
            meta = {"intent": forced_agent}
        else:
            result = await run_chat_turn(
                user_id=str(user.id),
                farmer_context=context,
                history=history,
                new_message=content,
            )
            response_text = result["response"]
            agent_used = result.get("intent", "general_advice")
            meta = {"intent": result.get("intent"), "entities": result.get("entities")}

        assistant_msg = self._persist_assistant(session, response_text, agent_used)
        return session, user_msg, assistant_msg, meta

    async def stream_message(
        self, user: User, session_id: str | None, content: str, forced_agent: str | None = None
    ):
        """Streaming variant: yields SSE-formatted dicts via the router.

        Flow: resolve session + persist user msg, run the routing graph
        (coordinator + specialist) with the specialist output STREAMED when
        possible, persist the full assistant msg at the end, emit done event
        with ids so the client can continue the conversation immediately.
        Falls back to non-streaming send_message on any streaming failure.
        """
        session, history, context = self._prepare_turn(user, session_id, content)
        yield {"type": "meta", "session_id": str(session.id)}

        agent_used = forced_agent or "general_advice"
        response_text = ""

        try:
            if forced_agent:
                from app.ai.claude_client import get_claude
                from app.ai.prompts import (
                    ADVISOR_SYSTEM,
                    CROP_RECOMMENDATION_SYSTEM,
                    MARKET_FORECAST_SYSTEM,
                    PROFIT_OPTIMIZATION_SYSTEM,
                    WEATHER_AGENT_SYSTEM,
                )

                system_map = {
                    "crop": CROP_RECOMMENDATION_SYSTEM,
                    "disease": "You are a plant pathologist helping via chat. Ask targeted diagnostic questions and give likely causes plus immediate steps.",
                    "weather": WEATHER_AGENT_SYSTEM,
                    "market": MARKET_FORECAST_SYSTEM,
                    "profit": PROFIT_OPTIMIZATION_SYSTEM,
                    "advisor": ADVISOR_SYSTEM,
                }
                system = system_map.get(forced_agent, ADVISOR_SYSTEM)
                claude = get_claude()
                agent_used = forced_agent
                yield {"type": "agent", "agent": agent_used}
                for delta in claude.complete_stream(
                    system=system + "\n\nFARMER CONTEXT:\n" + context,
                    messages=[{"role": "user", "content": content}],
                    max_tokens=1400,
                ):
                    response_text += delta
                    yield {"type": "delta", "text": delta}
            else:
                # Route first (coordinator is a fast model call), then stream
                # the specialist's answer with live weather data when relevant.
                from app.ai.agents import classify_intent, specialist_system_for, stream_specialist_turn

                intent, entities = await classify_intent(context, history, content)
                agent_used = intent
                yield {"type": "agent", "agent": intent}
                async for delta in stream_specialist_turn(
                    intent=intent,
                    entities=entities,
                    farmer_context=context,
                    history=history,
                    user_message=content,
                    user_id=str(user.id),
                ):
                    response_text += delta
                    yield {"type": "delta", "text": delta}
        except Exception as e:
            logger.warning("Streaming turn failed (%s); falling back to non-streaming", e)
            # Non-streaming fallback for the same turn
            result = await run_chat_turn(
                user_id=str(user.id),
                farmer_context=context,
                history=history,
                new_message=content,
            )
            response_text = result["response"]
            agent_used = result.get("intent", "general_advice")
            yield {"type": "agent", "agent": agent_used}
            yield {"type": "delta", "text": response_text}

        from app.ai.agents import sanitize_chat_output

        response_text = sanitize_chat_output(response_text) or response_text
        assistant_msg = self._persist_assistant(session, response_text, agent_used)
        yield {
            "type": "done",
            "session_id": str(session.id),
            "message_id": str(assistant_msg.id),
            "agent": agent_used,
        }
