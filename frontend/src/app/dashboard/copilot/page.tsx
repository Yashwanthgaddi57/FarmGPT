"use client";

import * as React from "react";
import { Bot, Loader2, Send, Trash2, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/chat/Markdown";
import {
  useChatMessages,
  useChatSessions,
  useDeleteChatSession,
  useSendMessage,
  sendMessageStream,
} from "@/hooks/use-api";
import type { ChatMessage } from "@/types";
import { cn, formatDate } from "@/lib/utils";

const SUGGESTIONS = [
  "What crop should I grow this season for maximum profit?",
  "How do I reduce fertilizer costs without hurting yield?",
  "When is the best time to sell my onion harvest?",
  "My tomato leaves are curling — what should I do?",
];

const AGENT_LABELS: Record<string, string> = {
  crop_recommendation: "Crop Agent",
  disease_detection: "Disease Agent",
  weather: "Weather Agent",
  market: "Market Agent",
  profit_optimization: "Profit Agent",
  general_advice: "Farm Advisor",
  crop: "Crop Agent",
  profit: "Profit Agent",
  advisor: "Farm Advisor",
};

export default function CopilotPage() {
  const { data: sessions } = useChatSessions();
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const { data: messages } = useChatMessages(sessionId);
  const send = useSendMessage();
  const deleteSession = useDeleteChatSession();
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Optimistic display: server messages + pending user message + streaming answer
  const [pending, setPending] = React.useState<ChatMessage[]>([]);
  const [streamText, setStreamText] = React.useState("");
  const [streamAgent, setStreamAgent] = React.useState<string | null>(null);
  const [isStreaming, setIsStreaming] = React.useState(false);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending, streamText]);

  const doSend = async (text: string) => {
    const content = text.trim();
    if (!content || send.isPending || isStreaming) return;
    setInput("");
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
      agent: null,
      created_at: new Date().toISOString(),
    };
    setPending([optimistic]);
    setStreamText("");
    setStreamAgent(null);
    setIsStreaming(true);

    let liveSessionId = sessionId;
    try {
      await sendMessageStream(
        { content, session_id: sessionId },
        (e) => {
          if (e.type === "meta" && e.session_id) {
            liveSessionId = e.session_id;
            if (!sessionId) setSessionId(e.session_id);
          } else if (e.type === "agent" && e.agent) {
            setStreamAgent(e.agent);
          } else if (e.type === "delta" && e.text) {
            setStreamText((prev) => prev + e.text);
          } else if (e.type === "done") {
            // Persisted server-side; refetch and clear transient state.
            if (!liveSessionId && e.session_id) setSessionId(e.session_id);
          }
        }
      );
    } catch {
      /* stream + fallback both failed; keep UI consistent */
    } finally {
      setPending([]);
      setStreamText("");
      setStreamAgent(null);
      setIsStreaming(false);
    }
  };

  const all: ChatMessage[] = [...(messages ?? []), ...pending];
  const showThinking = (send.isPending || isStreaming) && !streamText;

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col space-y-3 sm:h-[calc(100vh-8rem)] lg:flex-row lg:space-x-4 lg:space-y-0">
      {/* Sessions sidebar: collapsible on mobile (select), fixed on desktop */}
      <div className="hidden w-64 shrink-0 flex-col rounded-xl border bg-card lg:flex">
        <div className="border-b p-3">
          <Button className="w-full" onClick={() => setSessionId(null)}>
            New conversation
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {(sessions ?? []).map((s) => (
            <div
              key={s.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent",
                sessionId === s.id && "bg-accent"
              )}
            >
              <button className="min-w-0 flex-1 truncate text-left" onClick={() => setSessionId(s.id)}>
                {s.title}
              </button>
              <button
                className="opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                onClick={() => {
                  if (sessionId === s.id) setSessionId(null);
                  deleteSession.mutate(s.id);
                }}
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile session switcher */}
      <div className="lg:hidden">
        <select
          value={sessionId ?? ""}
          onChange={(e) => setSessionId(e.target.value || null)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          aria-label="Conversation"
        >
          <option value="">+ New conversation</option>
          {(sessions ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Chat pane */}
      <Card className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {all.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-leaf-600 text-white">
                  <Bot className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="font-semibold">Your AI Farm Copilot</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    Backed by six specialist agents — crop, disease, weather, market, profit and advisor —
                    coordinated automatically. Ask anything about your farm.
                  </p>
                </div>
                <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => doSend(s)}
                      className="rounded-lg border p-3 text-left text-sm transition-colors hover:border-leaf-400 hover:bg-leaf-50/50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(new Date())}</p>
              </div>
            )}

            {all.map((m) => (
              <div key={m.id} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role !== "user" && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-600 text-white">
                    <Bot className="h-4 w-4" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2.5 sm:max-w-[85%]",
                    m.role === "user"
                      ? "bg-leaf-600 text-white"
                      : "border bg-card"
                  )}
                >
                  {m.agent && m.role === "assistant" && (
                    <Badge variant="secondary" className="mb-1.5 text-[10px]">
                      {AGENT_LABELS[m.agent] ?? m.agent}
                    </Badge>
                  )}
                  {m.role === "user" ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                  ) : (
                    <Markdown>{m.content}</Markdown>
                  )}
                </div>
                {m.role === "user" && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}

            {showThinking && (
              <div className="flex gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-600 text-white">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agents are thinking…
                </div>
              </div>
            )}

            {streamText && (
              <div className="flex gap-3 justify-start">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf-600 text-white">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="max-w-[85%] rounded-2xl border bg-card px-4 py-2.5">
                  {streamAgent && (
                    <Badge variant="secondary" className="mb-1.5 text-[10px]">
                      {AGENT_LABELS[streamAgent] ?? streamAgent}
                    </Badge>
                  )}
                  <Markdown>{streamText}</Markdown>
                  <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-leaf-600 align-middle" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                doSend(input);
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about crops, disease, prices, weather…"
                rows={1}
                className="max-h-32 min-h-[44px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    doSend(input);
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={send.isPending || isStreaming || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
