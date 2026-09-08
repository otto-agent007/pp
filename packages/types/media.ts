import type { Job } from "./jobs";

export type JobMediaType = "photo" | "signature";

export interface JobMedia {
  id: string;
  job_id: string;
  media_type: JobMediaType;
  storage_bucket: string;
  storage_path: string;
  signed_url?: string | null;
  description: string | null;
  uploaded_by: string | null;
  captured_at: string | null;
  created_at: string;
  updated_at: string;
  job?: Job;
}

export interface JobMediaInput {
  job_id: string;
  media_type: JobMediaType;
  storage_bucket: string;
  storage_path: string;
  description?: string | null;
  captured_at?: string | null;
}
