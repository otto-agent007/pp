import { translations } from "@pest-patrol/i18n";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLanguage } from "./useLanguage";

const secureStore = vi.hoisted(() => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => secureStore);

const LANGUAGE_STORAGE_KEY = "pest-patrol:language-preference:v1";

describe("useLanguage persistence", () => {
  beforeEach(() => {
    secureStore.getItemAsync.mockReset();
    secureStore.setItemAsync.mockReset();
    useLanguage.setState({
      hasHydratedLanguagePreference: false,
      lang: "en",
      t: translations.en,
    });
  });

  it("defaults to English when no preference is stored", async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(null);

    await useLanguage.getState().hydrateLanguagePreference();

    expect(useLanguage.getState()).toMatchObject({
      hasHydratedLanguagePreference: true,
      lang: "en",
      t: translations.en,
    });
  });

  it("setLanguage updates translations and persists Spanish", () => {
    useLanguage.getState().setLanguage("es");

    expect(useLanguage.getState()).toMatchObject({
      lang: "es",
      t: translations.es,
    });
    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      LANGUAGE_STORAGE_KEY,
      JSON.stringify("es"),
    );
  });

  it("toggleLanguage switches English to Spanish and persists it", () => {
    useLanguage.getState().toggleLanguage();

    expect(useLanguage.getState()).toMatchObject({
      lang: "es",
      t: translations.es,
    });
    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      LANGUAGE_STORAGE_KEY,
      JSON.stringify("es"),
    );
  });

  it("toggleLanguage switches Spanish to English and persists it", () => {
    useLanguage.getState().setLanguage("es");
    secureStore.setItemAsync.mockClear();

    useLanguage.getState().toggleLanguage();

    expect(useLanguage.getState()).toMatchObject({
      lang: "en",
      t: translations.en,
    });
    expect(secureStore.setItemAsync).toHaveBeenLastCalledWith(
      LANGUAGE_STORAGE_KEY,
      JSON.stringify("en"),
    );
  });

  it("falls back to English when the stored preference is invalid", async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify("fr"));
    useLanguage.setState({ lang: "es", t: translations.es });

    await useLanguage.getState().hydrateLanguagePreference();

    expect(useLanguage.getState()).toMatchObject({
      hasHydratedLanguagePreference: true,
      lang: "en",
      t: translations.en,
    });
  });

  it("falls back to English when storage read fails", async () => {
    secureStore.getItemAsync.mockRejectedValueOnce(new Error("storage offline"));
    useLanguage.setState({ lang: "es", t: translations.es });

    await expect(
      useLanguage.getState().hydrateLanguagePreference(),
    ).resolves.toBeUndefined();

    expect(useLanguage.getState()).toMatchObject({
      hasHydratedLanguagePreference: true,
      lang: "en",
      t: translations.en,
    });
  });

  it("keeps the current session language when storage write fails", async () => {
    secureStore.setItemAsync.mockRejectedValueOnce(new Error("write failed"));

    expect(() => useLanguage.getState().setLanguage("es")).not.toThrow();
    await Promise.resolve();

    expect(useLanguage.getState()).toMatchObject({
      lang: "es",
      t: translations.es,
    });
  });

  it("restores Spanish after simulated store rehydration", async () => {
    secureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify("es"));
    useLanguage.setState({ lang: "en", t: translations.en });

    await useLanguage.getState().hydrateLanguagePreference();

    expect(useLanguage.getState()).toMatchObject({
      hasHydratedLanguagePreference: true,
      lang: "es",
      t: translations.es,
    });
    expect(useLanguage.getState().t.jobs.fieldCopy.treatment.title).toBe(
      "Formulario de tratamiento",
    );
  });

  it("has English and Spanish work-mode copy for every mobile mode", () => {
    const modeIds = [
      "estimate",
      "recurring_service",
      "general_pest",
      "exclusion_project",
      "wdo_escrow",
      "warranty_callback",
      "follow_up",
      "inspection",
      "standard_service",
    ] as const;

    for (const modeId of modeIds) {
      expect(translations.en.jobs.workModes.labels[modeId]).toBeTruthy();
      expect(translations.en.jobs.workModes.summaries[modeId]).toBeTruthy();
      expect(translations.es.jobs.workModes.labels[modeId]).toBeTruthy();
      expect(translations.es.jobs.workModes.summaries[modeId]).toBeTruthy();
      if (modeId !== "wdo_escrow") {
        expect(translations.es.jobs.workModes.labels[modeId]).not.toBe(
          translations.en.jobs.workModes.labels[modeId],
        );
      }
    }

    expect(translations.es.jobs.workModes.labels.wdo_escrow).toBe("WDO / Escrow");
  });
});
