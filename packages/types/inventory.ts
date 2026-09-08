import type { Job } from "./jobs";

export type InventoryStatus = "active" | "archived";

export type InventoryUnit = "oz" | "gal" | "lb" | "each";

export interface ChemicalInventoryItem {
  id: string;
  name: string;
  epa_number: string | null;
  current_stock: number;
  unit: InventoryUnit;
  reorder_level: number | null;
  status: InventoryStatus;
  created_at: string;
  updated_at: string;
}

export interface ChemicalInventoryInput {
  name: string;
  epa_number?: string | null;
  current_stock: number;
  unit: InventoryUnit;
  reorder_level?: number | null;
}

export interface ChemicalLog {
  id: string;
  job_id: string;
  chemical_id: string;
  amount_used: number;
  notes: string | null;
  created_at: string;
  chemical?: ChemicalInventoryItem;
  job?: Job;
}

export interface ChemicalLogInput {
  job_id: string;
  chemical_id: string;
  amount_used: number;
  notes?: string | null;
}
