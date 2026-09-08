import type { JobFormSubmission } from "./forms";
import type { ChemicalLog } from "./inventory";
import type { Job } from "./jobs";
import type { JobMedia } from "./media";

export interface JobCloseoutReview {
  job: Job;
  form_submissions: JobFormSubmission[];
  chemical_logs: ChemicalLog[];
  media: JobMedia[];
  photos: JobMedia[];
  signatures: JobMedia[];
}

export interface CloseoutCaptureSummary {
  chemicalLogs: number;
  forms: number;
  jobId: string;
  photos: number;
  signatures: number;
}
