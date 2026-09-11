import { create } from "zustand";
import { translations, Language } from "../../../../packages/i18n";

import { readMobileJson, writeMobileJson } from "./mobilePersistence";
import { mobileStorageKeys } from "./storageKeys";

const LANGUAGE_STORAGE_KEY = mobileStorageKeys.languagePreference;

interface LanguageState {
  hasHydratedLanguagePreference: boolean;
  hydrateLanguagePreference: () => Promise<void>;
  lang: Language;
  t: typeof translations.en;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "es";
}

function languageState(lang: Language) {
  return {
    lang,
    t: translations[lang],
  };
}

export const useLanguage = create<LanguageState>((set, get) => ({
  hasHydratedLanguagePreference: false,
  hydrateLanguagePreference: async () => {
    const storedLanguage = await readMobileJson<unknown>(
      LANGUAGE_STORAGE_KEY,
      "en",
    );
    const lang = isLanguage(storedLanguage) ? storedLanguage : "en";

    set({
      ...languageState(lang),
      hasHydratedLanguagePreference: true,
    });
  },
  lang: "en",
  t: translations["en"],
  toggleLanguage: () => {
    const newLang = get().lang === "en" ? "es" : "en";
    get().setLanguage(newLang);
  },
  setLanguage: (lang) => {
    set(languageState(lang));
    writeMobileJson(LANGUAGE_STORAGE_KEY, lang);
  },
}));
