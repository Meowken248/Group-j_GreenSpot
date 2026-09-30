import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/client";
import {
  type LanguageCode,
  fetchBackendTranslations,
} from "../services/i18nService";

interface LanguageContextType {
  language: LanguageCode;
  translations: Record<string, string>;
  isLoading: boolean;
  isBackendConnected: boolean;
  changeLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem("greenspot_lang") as LanguageCode) || "vi";
  });
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const loadLanguage = useCallback(async (targetLang: LanguageCode) => {
    setIsLoading(true);
    try {
      const { translations: bundle, isBackend } = await fetchBackendTranslations(targetLang);
      setTranslations(bundle);
      setIsBackendConnected(isBackend);
      setLanguage(targetLang);
      localStorage.setItem("greenspot_lang", targetLang);
      document.documentElement.lang = targetLang;

      // Cập nhật header Accept-Language cho toàn bộ request Axios gửi tới Backend sau này
      api.defaults.headers.common["Accept-Language"] = targetLang;
    } catch (err) {
      console.error("[LanguageProvider] Lỗi nạp ngôn ngữ:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changeLanguage = async (newLang: LanguageCode) => {
    if (newLang === language && Object.keys(translations).length > 0) return;
    await loadLanguage(newLang);
  };

  const t = useCallback(
    (key: string, defaultText?: string): string => {
      if (translations[key]) {
        return translations[key];
      }
      return defaultText !== undefined ? defaultText : key;
    },
    [translations]
  );

  useEffect(() => {
    loadLanguage(language);
  }, [language, loadLanguage]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        translations,
        isLoading,
        isBackendConnected,
        changeLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation phải được sử dụng bên trong <LanguageProvider>");
  }
  return context;
};
