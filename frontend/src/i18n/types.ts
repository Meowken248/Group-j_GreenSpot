export type LanguageCode = "VI" | "EN";

export interface I18nContextType {
  currentLang: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
  translateDynamic: (text: string) => Promise<string>;
}

