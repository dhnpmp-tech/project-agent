export type ClientStatus =
  | "pending"
  | "provisioning"
  | "active"
  | "suspended"
  | "terminated";

export type ClientCountry = "AE" | "SA";

export type ClientPlan = "starter" | "professional" | "enterprise" | "solopreneur";

export interface Client {
  id: string;
  slug: string;
  company_name: string;
  company_name_ar?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  country: ClientCountry;
  status: ClientStatus;
  plan: ClientPlan;
  container_port?: number;
  n8n_api_key?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientCreateInput {
  slug: string;
  company_name: string;
  company_name_ar?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  country: ClientCountry;
  plan: ClientPlan;
}
