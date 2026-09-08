export type DemoSeedAction = "dry_run" | "seed" | "reset";

export type DemoSeedTarget = "local" | "preview";

export interface DemoSeedSummary {
  admin_users: number;
  chemical_logs: number;
  customers: number;
  form_submissions: number;
  inventory_items: number;
  invoices: number;
  jobs: number;
  locations: number;
  media_items: number;
  payments: number;
  technicians: number;
}

export interface DemoSeedRuntimeStatus {
  available: boolean;
  environment_label: string;
  reason: string | null;
  target: DemoSeedTarget;
}

export interface DemoSeedStatusResponse {
  status: DemoSeedRuntimeStatus;
  summary: DemoSeedSummary;
}

export interface DemoSeedActionInput {
  action: DemoSeedAction;
  confirm?: string;
  target: DemoSeedTarget;
}

export interface DemoSeedActionResponse {
  action: DemoSeedAction;
  result:
    | DemoSeedSummary
    | {
        reset: Partial<DemoSeedSummary>;
        seed: Partial<DemoSeedSummary>;
      };
  status: DemoSeedRuntimeStatus;
  summary: DemoSeedSummary;
}
