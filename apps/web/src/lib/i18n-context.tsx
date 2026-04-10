import { createContext, useContext, useMemo, useState } from "react";
import { messages, type AppLanguage } from "@/i18n/messages";

interface I18nContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (path: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const stored = localStorage.getItem("language");
    return stored === "ar" ? "ar" : "fr";
  });

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: (next) => {
        setLanguageState(next);
        localStorage.setItem("language", next);
      },
      t: (path: string) => {
        const keys = path.split(".");
        const result = keys.reduce<unknown>((acc, key) => {
          if (!acc || typeof acc !== "object") {
            return undefined;
          }
          return (acc as Record<string, unknown>)[key];
        }, messages[language]);

        return typeof result === "string" ? result : path;
      }
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
