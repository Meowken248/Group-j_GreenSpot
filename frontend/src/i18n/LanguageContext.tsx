import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { LanguageCode, I18nContextType } from "./types";
import { I18N_DICTIONARY } from "./translations";
import { setGlobalPageLanguage, initDOMTranslation } from "./domTranslator";
import api from "../api/client";

const LANGUAGE_STORAGE_KEY = "greenspot_user_lang";

const getInitialLanguage = (): LanguageCode => {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === "EN" || saved === "VI") {
      return saved;
    }
  } catch {
    // Fallback to Vietnamese
  }
  return "VI";
};

const LanguageContext = createContext<I18nContextType | null>(null);

// In-memory dynamic translation cache for user-generated strings
const dynamicCache: Record<string, string> = {};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLang, setCurrentLangState] = useState<LanguageCode>(getInitialLanguage);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setCurrentLangState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.documentElement.setAttribute("lang", lang.toLowerCase());
      setGlobalPageLanguage(lang);
      window.dispatchEvent(
        new CustomEvent("greenspot_language_changed", { detail: { language: lang } })
      );
    } catch {
      // Ignored in SSR / test
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setCurrentLangState((prev) => {
      const next = prev === "VI" ? "EN" : "VI";
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        document.documentElement.setAttribute("lang", next.toLowerCase());
        setGlobalPageLanguage(next);
        window.dispatchEvent(
          new CustomEvent("greenspot_language_changed", { detail: { language: next } })
        );
      } catch {
        // Ignored in SSR / test
      }
      return next;
    });
  }, []);

  useEffect(() => {
    initDOMTranslation(document.body);
    document.documentElement.setAttribute("lang", currentLang.toLowerCase());
    setGlobalPageLanguage(currentLang);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && (e.newValue === "VI" || e.newValue === "EN")) {
        setCurrentLangState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [currentLang]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = I18N_DICTIONARY[currentLang];
      if (dict && dict[key]) {
        return dict[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [currentLang]
  );

  const translateDynamic = useCallback(
    async (text: string): Promise<string> => {
      if (!text || currentLang === "VI") {
        return text;
      }
      const cacheKey = `${text}_to_${currentLang}`;
      if (dynamicCache[cacheKey]) {
        return dynamicCache[cacheKey];
      }

      try {
        const resp = await api.post<{ translated_text: string }>("/api/v1/translation/translate", {
          text,
          target_lang: currentLang.toLowerCase(),
          source_lang: "vi",
        });
        if (resp.data?.translated_text) {
          dynamicCache[cacheKey] = resp.data.translated_text;
          return resp.data.translated_text;
        }
      } catch {
        // Return original if translation fails
      }
      return text;
    },
    [currentLang]
  );

  const value = useMemo(
    () => ({
      currentLang,
      setLanguage,
      toggleLanguage,
      t,
      translateDynamic,
    }),
    [currentLang, setLanguage, toggleLanguage, t, translateDynamic]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): I18nContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if rendered outside provider
    const fallbackLang = getInitialLanguage();
    return {
      currentLang: fallbackLang,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: string, fallback?: string) => I18N_DICTIONARY[fallbackLang]?.[key] || fallback || key,
      translateDynamic: async (text: string) => text,
    };
  }
  return context;
};

