export type CustomerStatus = "active" | "archived";

export type PropertyType = "residential" | "commercial" | "other";

export type LocationUnitStatus = "active" | "archived";

export type LocationUnitAreaType =
  | "common_area"
  | "exterior"
  | "other"
  | "unit";

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  property_type: PropertyType;
  service_notes: string | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
  locations?: Location[];
}

export interface Location {
  id: string;
  customer_id: string;
  address: string;
  nickname: string | null;
  service_notes: string | null;
  is_primary: boolean;
  latitude?: number | null;
  longitude?: number | null;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface CustomerLocationInput {
  id?: string;
  address: string;
  nickname?: string | null;
  service_notes?: string | null;
  is_primary?: boolean;
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  property_type: PropertyType;
  service_notes?: string | null;
  locations: CustomerLocationInput[];
}

export interface LocationUnit {
  id: string;
  location_id: string;
  unit_label: string;
  floor: string | null;
  area_type: LocationUnitAreaType;
  status: LocationUnitStatus;
  service_notes: string | null;
  created_at: string;
  updated_at: string;
  location?: Location;
}

export interface LocationUnitInput {
  area_type?: LocationUnitAreaType;
  floor?: string | null;
  location_id: string;
  service_notes?: string | null;
  unit_label: string;
}
