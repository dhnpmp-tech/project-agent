export interface BusinessKnowledge {
  id: string;
  client_id: string;

  // Company fundamentals
  website_url?: string;
  business_description?: string;
  brand_voice?: string;
  business_hours?: string;
  industry_keywords: string[];

  // Contact & locations
  contact_info: {
    phone?: string;
    email?: string;
    address?: string;
    locations?: string[];
  };

  // Products & services
  services: string[];

  // Knowledge base
  faq: { question: string; answer: string }[];

  // People
  team_members: { name: string; role?: string; bio?: string }[];

  // Online presence
  social_profiles: Record<string, string>;
  review_sources: {
    platform: string;
    url: string;
    rating?: number;
    count?: number;
  }[];

  // Sales intelligence
  icp_criteria: Record<string, unknown>;
  value_propositions: string[];
  competitor_info: {
    name: string;
    url?: string;
    differentiator?: string;
  }[];

  // HR intelligence
  job_listings: { title: string; description?: string; requirements?: string[] }[];
  scoring_criteria: Record<string, unknown>;
  company_culture?: string;

  // Financial intelligence
  transaction_categories: string[];
  currency: string;
  fiscal_year_start: string;

  // Content intelligence
  content_pillars: string[];
  posting_schedule: Record<string, string>;

  // Crawl metadata
  crawl_data: {
    pages_scanned?: string[];
    last_crawled_at?: string;
    raw_meta?: Record<string, unknown>;
  };

  created_at: string;
  updated_at: string;
}
