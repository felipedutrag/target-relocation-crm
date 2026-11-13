import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "target-crm.sqlite");

const globalForDb = globalThis as unknown as {
  __targetCrmDb?: DatabaseSyncType;
  __targetCrmInitialized?: boolean;
};

function loadSqlite(): { DatabaseSync: new (path: string) => DatabaseSyncType } {
  // Using eval('require') prevents webpack/turbopack from trying to bundle built-in node:sqlite
  const req = eval("require") as NodeRequire;
  return req("node:sqlite");
}

export function getDb(): DatabaseSyncType {
  if (!globalForDb.__targetCrmDb) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const { DatabaseSync } = loadSqlite();
    const db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    db.exec("PRAGMA temp_store = MEMORY;");
    db.exec("PRAGMA cache_size = -64000;");
    initSchema(db);
    globalForDb.__targetCrmDb = db;
  }
  return globalForDb.__targetCrmDb;
}

export function initSchema(db: DatabaseSyncType) {
  if (globalForDb.__targetCrmInitialized) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      url_title TEXT,
      order_nr INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      deal_probability INTEGER DEFAULT 0,
      add_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS stages (
      id INTEGER PRIMARY KEY,
      pipeline_id INTEGER NOT NULL,
      pipeline_name TEXT,
      order_nr INTEGER DEFAULT 0,
      name TEXT NOT NULL,
      active_flag INTEGER DEFAULT 1,
      deal_probability INTEGER DEFAULT 100,
      rotten_flag INTEGER DEFAULT 0,
      rotten_days INTEGER
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      locale TEXT,
      role_id INTEGER,
      is_admin INTEGER DEFAULT 0,
      active_flag INTEGER DEFAULT 1,
      created TEXT,
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS field_definitions (
      entity_type TEXT NOT NULL,
      id INTEGER,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      field_type TEXT,
      edit_flag INTEGER DEFAULT 0,
      options_json TEXT,
      PRIMARY KEY (entity_type, key)
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id INTEGER,
      owner_name TEXT,
      label INTEGER,
      label_name TEXT,
      label_color TEXT,
      label_ids_json TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      postal_code TEXT,
      website TEXT,
      linkedin TEXT,
      industry TEXT,
      annual_revenue TEXT,
      employee_count INTEGER,
      people_count INTEGER DEFAULT 0,
      open_deals_count INTEGER DEFAULT 0,
      won_deals_count INTEGER DEFAULT 0,
      lost_deals_count INTEGER DEFAULT 0,
      closed_deals_count INTEGER DEFAULT 0,
      activities_count INTEGER DEFAULT 0,
      done_activities_count INTEGER DEFAULT 0,
      undone_activities_count INTEGER DEFAULT 0,
      notes_count INTEGER DEFAULT 0,
      files_count INTEGER DEFAULT 0,
      cc_email TEXT,
      add_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      owner_id INTEGER,
      owner_name TEXT,
      org_id INTEGER,
      org_name TEXT,
      primary_email TEXT,
      emails_json TEXT,
      primary_phone TEXT,
      phones_json TEXT,
      label INTEGER,
      label_name TEXT,
      label_color TEXT,
      label_ids_json TEXT,
      open_deals_count INTEGER DEFAULT 0,
      won_deals_count INTEGER DEFAULT 0,
      lost_deals_count INTEGER DEFAULT 0,
      closed_deals_count INTEGER DEFAULT 0,
      activities_count INTEGER DEFAULT 0,
      done_activities_count INTEGER DEFAULT 0,
      undone_activities_count INTEGER DEFAULT 0,
      notes_count INTEGER DEFAULT 0,
      files_count INTEGER DEFAULT 0,
      next_activity_date TEXT,
      last_activity_date TEXT,
      add_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      value REAL DEFAULT 0,
      currency TEXT DEFAULT 'BRL',
      formatted_value TEXT,
      weighted_value REAL DEFAULT 0,
      status TEXT DEFAULT 'open',
      probability INTEGER,
      pipeline_id INTEGER,
      pipeline_name TEXT,
      stage_id INTEGER,
      stage_name TEXT,
      stage_order_nr INTEGER DEFAULT 0,
      user_id INTEGER,
      owner_name TEXT,
      creator_user_id INTEGER,
      person_id INTEGER,
      person_name TEXT,
      org_id INTEGER,
      org_name TEXT,
      label TEXT,
      label_name TEXT,
      label_color TEXT,
      lost_reason TEXT,
      origin TEXT,
      channel INTEGER,
      is_archived INTEGER DEFAULT 0,
      add_time TEXT,
      update_time TEXT,
      stage_change_time TEXT,
      next_activity_date TEXT,
      last_activity_date TEXT,
      won_time TEXT,
      lost_time TEXT,
      close_time TEXT,
      expected_close_date TEXT,
      activities_count INTEGER DEFAULT 0,
      done_activities_count INTEGER DEFAULT 0,
      undone_activities_count INTEGER DEFAULT 0,
      notes_count INTEGER DEFAULT 0,
      files_count INTEGER DEFAULT 0,
      email_messages_count INTEGER DEFAULT 0,
      meeting_reminder TEXT,
      conversation_context TEXT,
      last_email_sent TEXT,
      custom_email_tag TEXT,
      service_interest TEXT,
      origin_country TEXT,
      lead_ip TEXT,
      device_info TEXT,
      form_page_url TEXT,
      form_filled TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_term TEXT,
      utm_content TEXT,
      utm_id TEXT,
      utm_adgroup TEXT,
      gclid TEXT,
      gbraid TEXT,
      segment TEXT,
      product_interest TEXT,
      website TEXT,
      meeting_date TEXT,
      meeting_link TEXT,
      cnpj TEXT,
      score REAL,
      expat_count INTEGER DEFAULT 0,
      dou_act_type TEXT,
      dou_process TEXT,
      dou_link TEXT,
      company_size REAL,
      company_porte TEXT,
      is_dou INTEGER DEFAULT 0,
      custom_fields_json TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      deal_id INTEGER,
      deal_title TEXT,
      person_id INTEGER,
      person_name TEXT,
      org_id INTEGER,
      org_name TEXT,
      user_id INTEGER,
      user_name TEXT,
      content TEXT,
      note_category TEXT DEFAULT 'general',
      parsed_meta_json TEXT,
      pinned_to_deal_flag INTEGER DEFAULT 0,
      add_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY,
      subject TEXT NOT NULL,
      type TEXT,
      type_name TEXT,
      done INTEGER DEFAULT 0,
      due_date TEXT,
      due_time TEXT,
      duration TEXT,
      marked_as_done_time TEXT,
      deal_id INTEGER,
      deal_title TEXT,
      person_id INTEGER,
      person_name TEXT,
      org_id INTEGER,
      org_name TEXT,
      user_id INTEGER,
      owner_name TEXT,
      note TEXT,
      cadence_period TEXT DEFAULT 'GERAL',
      is_auto_cadence INTEGER DEFAULT 0,
      priority TEXT,
      location TEXT,
      conference_meeting_url TEXT,
      add_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY,
      name TEXT,
      file_name TEXT,
      local_filename TEXT,
      has_local_file INTEGER DEFAULT 0,
      file_type TEXT,
      file_size INTEGER,
      deal_id INTEGER,
      deal_name TEXT,
      person_id INTEGER,
      person_name TEXT,
      org_id INTEGER,
      org_name TEXT,
      user_id INTEGER,
      url TEXT,
      description TEXT,
      add_time TEXT,
      update_time TEXT
    );

    CREATE TABLE IF NOT EXISTS deal_flow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_event_id INTEGER,
      deal_id INTEGER NOT NULL,
      object_type TEXT,
      timestamp TEXT,
      user_id INTEGER,
      field_key TEXT,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      old_label TEXT,
      new_label TEXT,
      change_source TEXT
    );

    CREATE TABLE IF NOT EXISTS saved_filters (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      filter_code TEXT,
      type TEXT,
      user_id INTEGER,
      visible_to TEXT,
      add_time TEXT,
      last_used_time TEXT
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      event_action TEXT,
      event_object TEXT,
      subscription_url TEXT,
      is_active INTEGER DEFAULT 1,
      last_http_status TEXT,
      last_delivery_time TEXT,
      add_time TEXT
    );

    CREATE TABLE IF NOT EXISTS mail_threads (
      id INTEGER PRIMARY KEY,
      subject TEXT,
      snippet TEXT,
      from_party_json TEXT,
      to_parties_json TEXT,
      linked_person_id INTEGER,
      linked_person_name TEXT,
      linked_org_id INTEGER,
      message_time INTEGER,
      folders_json TEXT
    );

    CREATE TABLE IF NOT EXISTS services_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE,
      country TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      scope TEXT,
      price REAL,
      currency TEXT DEFAULT 'BRL',
      unit TEXT,
      notes TEXT,
      source_document TEXT
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      client_company TEXT,
      client_contact TEXT,
      client_email TEXT,
      client_phone TEXT,
      deal_id INTEGER,
      org_id INTEGER,
      person_id INTEGER,
      country_route TEXT,
      currency TEXT DEFAULT 'BRL',
      total_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Enviada',
      valid_days INTEGER DEFAULT 30,
      items_json TEXT,
      notes TEXT,
      attachment_file_id INTEGER,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS imported_files_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      relative_path TEXT UNIQUE NOT NULL,
      file_format TEXT,
      file_size INTEGER DEFAULT 0,
      records_count INTEGER DEFAULT 0,
      entity_target TEXT,
      sha256 TEXT,
      status TEXT DEFAULT 'Importado',
      imported_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_deals_pipeline_stage ON deals(pipeline_id, stage_id);
    CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
    CREATE INDEX IF NOT EXISTS idx_deals_org ON deals(org_id);
    CREATE INDEX IF NOT EXISTS idx_deals_person ON deals(person_id);
    CREATE INDEX IF NOT EXISTS idx_deals_dou ON deals(is_dou, score);
    CREATE INDEX IF NOT EXISTS idx_deals_update ON deals(update_time DESC);
    CREATE INDEX IF NOT EXISTS idx_orgs_name ON organizations(name);
    CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(name);
    CREATE INDEX IF NOT EXISTS idx_persons_org ON persons(org_id);
    CREATE INDEX IF NOT EXISTS idx_notes_deal ON notes(deal_id);
    CREATE INDEX IF NOT EXISTS idx_notes_org ON notes(org_id);
    CREATE INDEX IF NOT EXISTS idx_notes_person ON notes(person_id);
    CREATE INDEX IF NOT EXISTS idx_notes_cat ON notes(note_category);
    CREATE INDEX IF NOT EXISTS idx_activities_deal ON activities(deal_id);
    CREATE INDEX IF NOT EXISTS idx_activities_done ON activities(done, due_date);
    CREATE INDEX IF NOT EXISTS idx_files_deal ON files(deal_id);
    CREATE INDEX IF NOT EXISTS idx_files_org ON files(org_id);
    CREATE INDEX IF NOT EXISTS idx_flow_deal ON deal_flow_events(deal_id, timestamp DESC);
  `);

  globalForDb.__targetCrmInitialized = true;
}

export function getBackupRoot(): string {
  return path.join(process.cwd(), "backup_pipedrive");
}
