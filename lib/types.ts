export type City = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  state: string;
  seo_title: string;
  seo_description: string;
  intro_md: string;
  hero_image: string | null;
};

export type Property = {
  id: string;
  organization_id: string;
  city_id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  description: string;
  features: string[];
  image_url: string;
  status: string;
  cities?: City;
};

export type Agent = {
  id: string;
  organization_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  territories: string[];
  is_active: boolean;
};

export type LeadStatus = "new" | "contacted" | "closed";

export type OrganizationRole = "admin" | "agent" | "analyst" | "viewer";

export type Lead = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  property_id: string | null;
  city_slug: string | null;
  assigned_agent_id: string | null;
  source: string;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  properties?: Property | null;
  agents?: Agent | null;
};

export type SearchResult = Property & {
  match_score: number;
  semantic_score: number;
  filter_score: number;
};
