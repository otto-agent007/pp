import { primitive } from "./colors";

const neutral = {
  fg: primitive.slate[700],
  fgStrong: primitive.navy[950],
  bg: primitive.slate[50],
  border: primitive.slate[200],
  solid: primitive.slate[700],
} as const;

const info = {
  fg: primitive.sky[600],
  fgStrong: primitive.navy[900],
  bg: primitive.sky[50],
  border: primitive.sky[200],
  solid: primitive.sky[500],
} as const;

const route = {
  fg: primitive.sky[600],
  fgStrong: primitive.navy[900],
  bg: primitive.sky[50],
  border: primitive.sky[200],
  solid: primitive.sky[500],
} as const;

const success = {
  fg: primitive.green[600],
  fgStrong: primitive.green[600],
  bg: primitive.green[50],
  border: primitive.green[200],
  solid: primitive.green[500],
} as const;

const warning = {
  fg: primitive.slate[700],
  fgStrong: primitive.navy[950],
  bg: primitive.yellow[50],
  border: primitive.yellow[200],
  solid: primitive.yellow[400],
} as const;

const danger = {
  fg: primitive.red[600],
  fgStrong: primitive.red[600],
  bg: primitive.red[50],
  border: primitive.red[200],
  solid: primitive.red[500],
} as const;

export const status = {
  job: {
    scheduled: neutral,
    en_route: route,
    in_progress: warning,
    completed: success,
    canceled: neutral,
  },
  invoice: {
    draft: neutral,
    sent: info,
    paid: success,
    void: neutral,
  },
  inventory: {
    active: success,
    archived: neutral,
    low_stock: warning,
    out_of_stock: danger,
  },
  sync: {
    queued: info,
    retrying: warning,
    failed: danger,
    synced: success,
  },
  alert: {
    neutral,
    info,
    success,
    warning,
    danger,
  },
} as const;

export type StatusCategory = keyof typeof status;
export type JobStatusToken = keyof typeof status.job;
export type InvoiceStatusToken = keyof typeof status.invoice;
export type InventoryStatusToken = keyof typeof status.inventory;
export type SyncStatusToken = keyof typeof status.sync;
export type AlertStatusToken = keyof typeof status.alert;
