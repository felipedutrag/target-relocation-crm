export type CrmTab =
  | "overview"
  | "pipelines"
  | "dou"
  | "organizations"
  | "people"
  | "activities"
  | "proposals"
  | "import"
  | "ai_chat"
  | "ai_prompts"
  | "whatsapp_demo"
  | "account"
  | "editorial"
  | "email_marketing"
  | "analytics"
  | "sdr_ops";

export interface Pipeline {
  id: number;
  name: string;
  url_title: string;
  order_nr: number;
  active: number;
}

export interface Stage {
  id: number;
  pipeline_id: number;
  pipeline_name: string;
  order_nr: number;
  name: string;
  deal_probability: number;
  deal_count?: number;
  open_count?: number;
  won_count?: number;
  lost_count?: number;
  total_value?: number;
}

export interface DealRecord {
  id: number;
  title: string;
  value: number;
  currency: string;
  formatted_value?: string;
  status: string;
  pipeline_id: number;
  pipeline_name: string;
  stage_id: number;
  stage_name: string;
  stage_order_nr?: number;
  owner_name: string;
  person_id: number | null;
  person_name: string | null;
  org_id: number | null;
  org_name: string | null;
  label_name: string | null;
  label_color: string | null;
  lost_reason: string | null;
  origin?: string | null;
  cnpj: string | null;
  score: number | null;
  segment: string | null;
  website: string | null;
  expat_count: number;
  dou_act_type: string | null;
  dou_process: string | null;
  is_dou: number;
  notes_count: number;
  activities_count: number;
  undone_activities_count: number;
  files_count: number;
  service_interest?: string | null;
  origin_country?: string | null;
  conversation_context?: string | null;
  meeting_date?: string | null;
  meeting_link?: string | null;
  meeting_reminder?: string | null;
  last_email_sent?: string | null;
  custom_email_tag?: string | null;
  form_filled?: string | null;
  form_page_url?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  lead_ip?: string | null;
  device_info?: string | null;
  expected_close_date?: string | null;
  won_time?: string | null;
  lost_time?: string | null;
  add_time: string;
  update_time: string;
}

export interface ParsedExpat {
  name: string;
  country: string;
  birth_date?: string;
  passport?: string;
}

export interface ParsedNoteMeta {
  category?: string;
  expat_count?: number;
  company_name?: string;
  normative_resolution?: string;
  process_number?: string;
  term?: string;
  expats?: ParsedExpat[];
  score?: number;
  qualified?: boolean;
  criteria?: string;
  rf_status?: string;
  porte?: string;
  cnpj?: string;
  foundation?: string;
  cnae?: string;
  capital?: string;
  phone?: string;
  city?: string;
  partners?: string[];
  linkedin_url?: string;
  hook?: string;
  target_contact?: string;
  emails?: Array<{ step: string; subject: string; body: string }>;
}

export interface NoteRecord {
  id: number;
  deal_id: number | null;
  deal_title: string | null;
  person_id: number | null;
  person_name: string | null;
  org_id: number | null;
  org_name: string | null;
  user_name: string | null;
  content: string;
  note_category: string;
  parsed_meta: ParsedNoteMeta | null;
  pinned_to_deal_flag: number;
  add_time: string;
  update_time: string;
}

export interface ActivityRecord {
  id: number;
  subject: string;
  type: string;
  type_name: string;
  done: number;
  due_date: string | null;
  due_time: string | null;
  duration: string | null;
  marked_as_done_time: string | null;
  deal_id: number | null;
  deal_title: string | null;
  person_id: number | null;
  person_name: string | null;
  org_id: number | null;
  org_name: string | null;
  owner_name: string | null;
  note: string | null;
  cadence_period: string;
  is_auto_cadence: number;
  conference_meeting_url?: string | null;
  add_time: string;
}

export interface FileRecord {
  id: number;
  name: string;
  file_name: string;
  local_filename: string | null;
  has_local_file: number;
  file_type: string | null;
  file_size: number | null;
  deal_id: number | null;
  deal_name: string | null;
  person_id: number | null;
  person_name: string | null;
  org_id: number | null;
  org_name: string | null;
  url: string | null;
  add_time: string;
}

export interface ServiceCatalogItem {
  id: number;
  code: string;
  country: string;
  category: string;
  name: string;
  description: string;
  scope: string;
  price: number | null;
  currency: "BRL" | "USD";
  unit: string;
  notes: string;
  source_document: string;
}

export interface ProposalItem {
  name: string;
  beneficiaries: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface ProposalRecord {
  id: number;
  title: string;
  client_company: string;
  client_contact: string;
  client_email: string;
  client_phone: string;
  deal_id: number | null;
  org_id: number | null;
  person_id: number | null;
  country_route: string;
  currency: "BRL" | "USD";
  total_value: number;
  discount_amount: number;
  status: string;
  valid_days: number;
  items: ProposalItem[];
  notes: string;
  attachment_file_id: number | null;
  created_at: string;
}
