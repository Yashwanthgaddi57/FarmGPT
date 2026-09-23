"use client";

/**
 * Lightweight i18n for dashboard chrome. Persisted to localStorage; defaults
 * to the profile language when available. AI answers already adapt via the
 * coordinator's language detection — this covers the UI labels.
 */
import * as React from "react";

export type Lang = "en" | "hi" | "te";

const DICT: Record<Exclude<Lang, "en">, Record<string, string>> = {
  hi: {
    Overview: "अवलोकन",
    "Crop Advisor": "फसल सलाहकार",
    "Disease Scan": "रोग जाँच",
    "Profit Predictor": "लाभ अनुमान",
    "Market Intelligence": "बाज़ार जानकारी",
    Weather: "मौसम",
    "Vendors Near Me": "पास के विक्रेता",
    "AI Copilot": "एआई सहायक",
    Analytics: "विश्लेषण",
    "Sign out": "साइन आउट",
    Notifications: "सूचनाएँ",
    "New conversation": "नई बातचीत",
    "Weather, disease, market and profit alerts": "मौसम, रोग, बाज़ार और लाभ की चेतावनियाँ",
    "No notifications yet.": "अभी कोई सूचना नहीं।",
  },
  te: {
    Overview: "అవలోకనం",
    "Crop Advisor": "పంట సలహాదారు",
    "Disease Scan": "తెగులు పరీక్ష",
    "Profit Predictor": "లాభ అంచనా",
    "Market Intelligence": "మార్కెట్ సమాచారం",
    Weather: "వాతావరణం",
    "Vendors Near Me": "సమీప విక్రేతలు",
    "AI Copilot": "ఏఐ సహాయకుడు",
    Analytics: "విశ్లేషణలు",
    "Sign out": "సైన్ అవుట్",
    Notifications: "నోటిఫికేషన్లు",
    "New conversation": "కొత్త సంభాషణ",
    "Weather, disease, market and profit alerts": "వాతావరణ, తెగులు, మార్కెట్ మరియు లాభ హెచ్చరికలు",
    "No notifications yet.": "ఇంకా నోటిఫికేషన్లు లేవు.",
  },
};

const LangContext = React.createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (s: string) => string;
}>({ lang: "en", setLang: () => {}, t: (s) => s });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("en");

  React.useEffect(() => {
    const saved = localStorage.getItem("agrigpt-lang") as Lang | null;
    if (saved && saved in DICT) setLangState(saved);
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("agrigpt-lang", l);
  }, []);

  const t = React.useCallback(
    (s: string) => (lang !== "en" ? DICT[lang][s] ?? s : s),
    [lang]
  );

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
  );
}

export function useLang() {
  return React.useContext(LangContext);
}

/** Small language switcher for the dashboard header. */
export function LangSwitch() {
  const { lang, setLang } = useLang();
  const options: { value: Lang; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "hi", label: "हिं" },
    { value: "te", label: "తె" },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-full border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setLang(o.value)}
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
            lang === o.value ? "bg-leaf-600 text-white" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={`Language: ${o.value}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
