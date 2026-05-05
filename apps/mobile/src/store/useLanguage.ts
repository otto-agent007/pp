import { create } from "zustand";
import { translations, Language } from "../../../../packages/i18n";

interface LanguageState {
  lang: Language;
  t: typeof translations.en;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

export const useLanguage = create<LanguageState>((set, get) => ({
  lang: "en",
  t: translations["en"],
  toggleLanguage: () => {
    const newLang = get().lang === "en" ? "es" : "en";
    set({ lang: newLang, t: translations[newLang] });
  },
  setLanguage: (lang) => set({ lang, t: translations[lang] }),
}));