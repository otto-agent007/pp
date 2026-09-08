export type UserRole = "admin" | "dispatcher" | "technician";

export type TechnicianStatus = "active" | "inactive";

export interface UserProfile {
  id: string;
  role: UserRole;
  email?: string | null;
  display_name?: string | null;
  status?: TechnicianStatus;
  created_at: string;
  updated_at: string;
}

export interface TechnicianProfile extends UserProfile {
  role: "technician";
  email: string | null;
  display_name: string | null;
  status: TechnicianStatus;
}

export interface TechnicianInviteInput {
  email: string;
  display_name?: string | null;
}

export interface TechnicianInviteResult {
  technician: TechnicianProfile;
}
