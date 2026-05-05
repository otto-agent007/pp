export type UserRole = "admin" | "dispatcher" | "technician";

export type JobStatus = "scheduled" | "en_route" | "in_progress" | "completed";

export interface Customer {
  id: string;
  name: string;
  property_type: string | null;
}

export interface Location {
  id: string;
  customer_id: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

export interface Job {
  id: string;
  customer_id: string;
  assigned_tech_id: string | null;
  status: JobStatus;
}
