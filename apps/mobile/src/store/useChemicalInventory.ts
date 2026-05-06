import { listChemicalInventoryForClient } from "@pest-patrol/domain";
import type { ChemicalInventoryItem } from "@pest-patrol/types";
import { create } from "zustand";

import { mobileSupabase } from "../lib/supabase";

type ChemicalInventoryStatus = "idle" | "loading" | "ready" | "error";

interface ChemicalInventoryState {
  error: string | null;
  items: ChemicalInventoryItem[];
  load: () => Promise<void>;
  status: ChemicalInventoryStatus;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load chemical inventory";
}

export const useChemicalInventory = create<ChemicalInventoryState>((set) => ({
  error: null,
  items: [],
  load: async () => {
    set({ error: null, status: "loading" });

    try {
      const items = await listChemicalInventoryForClient(mobileSupabase);

      set({
        error: null,
        items: items.filter((item) => item.status === "active"),
        status: "ready",
      });
    } catch (error) {
      set({
        error: errorMessage(error),
        status: "error",
      });
    }
  },
  status: "idle",
}));
