import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
import { getBackupRoot, getDb } from "./db";
import {
  CUSTOM_DEAL_KEYS,
  DEAL_LABEL_MAP,
  ORG_LABEL_MAP,
  PERSON_LABEL_MAP,
  parseCsvRecords,
  parseNoteContent,
  resolveLabelIds,
} from "./parsers";
import { CATALOG_SERVICES_SEED, REAL_PROPOSALS_SEED } from "./catalog-seed";

const globalForImport = globalThis as unknown as {
  __targetCrmImporting?: Promise<ImportSummary>;
};

export interface ImportSummary {
  success: boolean;
  durationMs: number;
  counts: {
    pipelines: number;
    stages: number;
    users: number;
    organizations: number;
    persons: number;
    deals: number;
    notes: number;
    activities: number;
    files: number;
    localFiles: number;
    dealFlowEvents: number;
    savedFilters: number;
    webhooks: number;
    servicesCatalog: number;
    proposals: number;
    auditedFiles: number;
  };
  importedAt: string;
}

function readJsonIfExists<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function walkFiles(dir: string, baseDir: string, out: Array<{ absPath: string; relPath: string; size: number }> = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(abs, baseDir, out);
    } else if (entry.isFile()) {
      const stat = fs.statSync(abs);
      out.push({
        absPath: abs,
        relPath: path.relative(baseDir, abs).replace(/\\/g, "/"),
        size: stat.size,
      });
    }
  }
  return out;
}

export async function ensureDatabaseSeeded(): Promise<void> {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM deals").get() as { cnt: number };
  const auditRow = db.prepare("SELECT COUNT(*) as cnt FROM imported_files_audit").get() as { cnt: number };
  if (row.cnt > 0 && auditRow.cnt > 0) return;
  await runFullBackupImport();
}

export async function runFullBackupImport(): Promise<ImportSummary> {
  if (globalForImport.__targetCrmImporting) {
    return globalForImport.__targetCrmImporting;
  }
  globalForImport.__targetCrmImporting = performFullBackupImport().finally(() => {
    globalForImport.__targetCrmImporting = undefined;
  });
  return globalForImport.__targetCrmImporting;
}

async function performFullBackupImport(): Promise<ImportSummary> {
  const start = Date.now();
  const db = getDb();
  const backupRoot = getBackupRoot();
  const apiDir = path.join(backupRoot, "api-2026-09-28");
  const arquivosDir = path.join(apiDir, "arquivos");

  const manifest = readJsonIfExists<{
    atualizado_em?: string;
    dominio?: string;
    entidades?: Record<string, { registros: number; bytes: number; sha256: string }>;
  }>(path.join(apiDir, "manifest.json"), {});

  const pipelines = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "pipelines.json"), []);
  const stages = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "stages.json"), []);
  const users = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "users.json"), []);
  const organizations = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "organizations.json"), []);
  const persons = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "persons.json"), []);
  const deals = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "deals.json"), []);
  const notes = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "notes.json"), []);
  const activities = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "activities.json"), []);
  const files = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "files.json"), []);
  const filters = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "filters.json"), []);
  const webhooks = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "webhooks.json"), []);
  const mailInbox = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, "mailThreads_inbox.json"), []);
  const dealsFlow = readJsonIfExists<Array<{ deal_id: number; eventos: Array<Record<string, unknown>> }>>(
    path.join(apiDir, "deals_flow.json"),
    []
  );

  const fieldFiles: Array<[string, string]> = [
    ["deal", "dealFields.json"],
    ["person", "personFields.json"],
    ["organization", "organizationFields.json"],
    ["activity", "activityFields.json"],
    ["note", "noteFields.json"],
    ["product", "productFields.json"],
  ];

  // Build map of local files in arquivos/
  const localFileById = new Map<number, string>();
  if (fs.existsSync(arquivosDir)) {
    for (const fname of fs.readdirSync(arquivosDir)) {
      const idx = fname.indexOf("__");
      if (idx > 0) {
        const fid = Number(fname.slice(0, idx));
        if (!Number.isNaN(fid)) localFileById.set(fid, fname);
      }
    }
  }

  const pipelineMap = new Map<number, string>();
  for (const p of pipelines) {
    pipelineMap.set(Number(p.id), String(p.name || ""));
  }
  const stageMap = new Map<number, { name: string; order_nr: number; pipeline_id: number }>();
  for (const s of stages) {
    stageMap.set(Number(s.id), {
      name: String(s.name || ""),
      order_nr: Number(s.order_nr || 0),
      pipeline_id: Number(s.pipeline_id || 0),
    });
  }

  const fieldNameMap = new Map<string, string>();

  const nowIso = new Date().toISOString();

  db.exec("BEGIN TRANSACTION;");
  try {
    // Clear core synced tables (preserve user-created proposals/notes only if not from backup? Full sync refreshes backup cleanly)
    db.exec(`
      DELETE FROM pipelines;
      DELETE FROM stages;
      DELETE FROM users;
      DELETE FROM field_definitions;
      DELETE FROM organizations;
      DELETE FROM persons;
      DELETE FROM deals;
      DELETE FROM notes;
      DELETE FROM activities;
      DELETE FROM files;
      DELETE FROM deal_flow_events;
      DELETE FROM saved_filters;
      DELETE FROM webhooks;
      DELETE FROM mail_threads;
      DELETE FROM imported_files_audit;
    `);

    const insPipeline = db.prepare(`
      INSERT INTO pipelines (id, name, url_title, order_nr, active, deal_probability, add_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of pipelines) {
      insPipeline.run(
        Number(p.id),
        String(p.name || ""),
        String(p.url_title || ""),
        Number(p.order_nr || 0),
        p.active ? 1 : 0,
        p.deal_probability ? 1 : 0,
        String(p.add_time || ""),
        String(p.update_time || "")
      );
    }

    const insStage = db.prepare(`
      INSERT INTO stages (id, pipeline_id, pipeline_name, order_nr, name, active_flag, deal_probability, rotten_flag, rotten_days)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of stages) {
      insStage.run(
        Number(s.id),
        Number(s.pipeline_id),
        String(s.pipeline_name || pipelineMap.get(Number(s.pipeline_id)) || ""),
        Number(s.order_nr || 0),
        String(s.name || ""),
        s.active_flag ? 1 : 0,
        Number(s.deal_probability ?? 100),
        s.rotten_flag ? 1 : 0,
        s.rotten_days != null ? Number(s.rotten_days) : null
      );
    }

    const insUser = db.prepare(`
      INSERT INTO users (id, name, email, phone, locale, role_id, is_admin, active_flag, created, last_login)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of users) {
      insUser.run(
        Number(u.id),
        String(u.name || ""),
        String(u.email || ""),
        u.phone ? String(u.phone) : null,
        String(u.locale || "pt_BR"),
        Number(u.role_id || 1),
        Number(u.is_admin || 0),
        u.active_flag ? 1 : 0,
        String(u.created || ""),
        String(u.last_login || "")
      );
    }

    const insField = db.prepare(`
      INSERT OR REPLACE INTO field_definitions (entity_type, id, key, name, field_type, edit_flag, options_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const [entityType, fname] of fieldFiles) {
      const defs = readJsonIfExists<Array<Record<string, unknown>>>(path.join(apiDir, fname), []);
      for (const f of defs) {
        const key = String(f.key || "");
        const name = String(f.name || key);
        if (entityType === "deal" && key) fieldNameMap.set(key, name);
        insField.run(
          entityType,
          f.id != null ? Number(f.id) : null,
          key,
          name,
          String(f.field_type || ""),
          f.edit_flag ? 1 : 0,
          f.options ? JSON.stringify(f.options) : null
        );
      }
    }

    const insOrg = db.prepare(`
      INSERT INTO organizations (
        id, name, owner_id, owner_name, label, label_name, label_color, label_ids_json,
        address, city, state, country, postal_code, website, linkedin, industry, annual_revenue, employee_count,
        people_count, open_deals_count, won_deals_count, lost_deals_count, closed_deals_count,
        activities_count, done_activities_count, undone_activities_count, notes_count, files_count,
        cc_email, add_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const o of organizations) {
      const ownerObj = o.owner_id as Record<string, unknown> | number | null;
      const ownerId = typeof ownerObj === "object" && ownerObj ? Number(ownerObj.id || ownerObj.value || 0) : Number(ownerObj || 0);
      const ownerName =
        String(o.owner_name || (typeof ownerObj === "object" && ownerObj ? ownerObj.name : "") || "");
      const rawLabels = Array.isArray(o.label_ids) && o.label_ids.length > 0 ? o.label_ids.join(",") : o.label;
      const { labelName, labelColor } = resolveLabelIds(rawLabels, ORG_LABEL_MAP);

      insOrg.run(
        Number(o.id),
        String(o.name || ""),
        ownerId || null,
        ownerName,
        o.label != null ? Number(o.label) : null,
        labelName,
        labelColor,
        JSON.stringify(o.label_ids || []),
        o.address ? String(o.address) : null,
        o.address_locality ? String(o.address_locality) : null,
        o.address_admin_area_level_1 ? String(o.address_admin_area_level_1) : null,
        o.address_country ? String(o.address_country) : null,
        o.address_postal_code ? String(o.address_postal_code) : null,
        o.website ? String(o.website) : null,
        o.linkedin ? String(o.linkedin) : null,
        o.industry != null ? String(o.industry) : null,
        o.annual_revenue != null ? String(o.annual_revenue) : null,
        o.employee_count != null ? Number(o.employee_count) : null,
        Number(o.people_count || 0),
        Number(o.open_deals_count || 0),
        Number(o.won_deals_count || 0),
        Number(o.lost_deals_count || 0),
        Number(o.closed_deals_count || 0),
        Number(o.activities_count || 0),
        Number(o.done_activities_count || 0),
        Number(o.undone_activities_count || 0),
        Number(o.notes_count || 0),
        Number(o.files_count || 0),
        o.cc_email ? String(o.cc_email) : null,
        String(o.add_time || ""),
        String(o.update_time || "")
      );
    }

    const insPerson = db.prepare(`
      INSERT INTO persons (
        id, name, first_name, last_name, owner_id, owner_name, org_id, org_name,
        primary_email, emails_json, primary_phone, phones_json,
        label, label_name, label_color, label_ids_json,
        open_deals_count, won_deals_count, lost_deals_count, closed_deals_count,
        activities_count, done_activities_count, undone_activities_count, notes_count, files_count,
        next_activity_date, last_activity_date, add_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of persons) {
      const ownerObj = p.owner_id as Record<string, unknown> | number | null;
      const ownerId = typeof ownerObj === "object" && ownerObj ? Number(ownerObj.id || ownerObj.value || 0) : Number(ownerObj || 0);
      const ownerName =
        String(p.owner_name || (typeof ownerObj === "object" && ownerObj ? ownerObj.name : "") || "");
      const orgObj = p.org_id as Record<string, unknown> | number | null;
      const orgId = typeof orgObj === "object" && orgObj ? Number(orgObj.value || orgObj.id || 0) : Number(orgObj || 0);
      const orgName = String(p.org_name || (typeof orgObj === "object" && orgObj ? orgObj.name : "") || "");

      const emails = Array.isArray(p.email) ? (p.email as Array<{ value?: string; primary?: boolean }>) : [];
      const phones = Array.isArray(p.phone) ? (p.phone as Array<{ value?: string; primary?: boolean }>) : [];
      const primaryEmail = emails.find((e) => e.primary && e.value)?.value || emails.find((e) => e.value)?.value || "";
      const primaryPhone = phones.find((e) => e.primary && e.value)?.value || phones.find((e) => e.value)?.value || "";

      const rawLabels = Array.isArray(p.label_ids) && p.label_ids.length > 0 ? p.label_ids.join(",") : p.label;
      const { labelName, labelColor } = resolveLabelIds(rawLabels, PERSON_LABEL_MAP);

      insPerson.run(
        Number(p.id),
        String(p.name || ""),
        p.first_name ? String(p.first_name) : null,
        p.last_name ? String(p.last_name) : null,
        ownerId || null,
        ownerName,
        orgId || null,
        orgName,
        primaryEmail,
        JSON.stringify(emails),
        primaryPhone,
        JSON.stringify(phones),
        p.label != null ? Number(p.label) : null,
        labelName,
        labelColor,
        JSON.stringify(p.label_ids || []),
        Number(p.open_deals_count || 0),
        Number(p.won_deals_count || 0),
        Number(p.lost_deals_count || 0),
        Number(p.closed_deals_count || 0),
        Number(p.activities_count || 0),
        Number(p.done_activities_count || 0),
        Number(p.undone_activities_count || 0),
        Number(p.notes_count || 0),
        Number(p.files_count || 0),
        p.next_activity_date ? String(p.next_activity_date) : null,
        p.last_activity_date ? String(p.last_activity_date) : null,
        String(p.add_time || ""),
        String(p.update_time || "")
      );
    }

    const insDeal = db.prepare(`
      INSERT INTO deals (
        id, title, value, currency, formatted_value, weighted_value, status, probability,
        pipeline_id, pipeline_name, stage_id, stage_name, stage_order_nr,
        user_id, owner_name, creator_user_id, person_id, person_name, org_id, org_name,
        label, label_name, label_color, lost_reason, origin, channel, is_archived,
        add_time, update_time, stage_change_time, next_activity_date, last_activity_date,
        won_time, lost_time, close_time, expected_close_date,
        activities_count, done_activities_count, undone_activities_count, notes_count, files_count, email_messages_count,
        meeting_reminder, conversation_context, last_email_sent, custom_email_tag,
        service_interest, origin_country, lead_ip, device_info, form_page_url, form_filled,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id, utm_adgroup, gclid, gbraid,
        segment, product_interest, website, meeting_date, meeting_link, cnpj, score,
        expat_count, dou_act_type, dou_process, dou_link, company_size, company_porte, is_dou, custom_fields_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    for (const d of deals) {
      const userObj = d.user_id as Record<string, unknown> | number | null;
      const userId = typeof userObj === "object" && userObj ? Number(userObj.id || userObj.value || 0) : Number(userObj || 0);
      const creatorObj = d.creator_user_id as Record<string, unknown> | number | null;
      const creatorId =
        typeof creatorObj === "object" && creatorObj ? Number(creatorObj.id || creatorObj.value || 0) : Number(creatorObj || 0);
      const personObj = d.person_id as Record<string, unknown> | number | null;
      const personId =
        typeof personObj === "object" && personObj ? Number(personObj.value || personObj.id || 0) : Number(personObj || 0);
      const orgObj = d.org_id as Record<string, unknown> | number | null;
      const orgId = typeof orgObj === "object" && orgObj ? Number(orgObj.value || orgObj.id || 0) : Number(orgObj || 0);

      const pipelineId = Number(d.pipeline_id || 0);
      const stageId = Number(d.stage_id || 0);
      const stageInfo = stageMap.get(stageId);

      const { labelName, labelColor } = resolveLabelIds(d.label, DEAL_LABEL_MAP);
      const titleStr = String(d.title || "");
      const isDou = titleStr.includes("DOU") || pipelineId === 2 ? 1 : 0;

      const s = (k: string) => (d[k] != null && d[k] !== "" ? String(d[k]) : null);
      const n = (k: string) => (d[k] != null && d[k] !== "" && !Number.isNaN(Number(d[k])) ? Number(d[k]) : null);

      const customSnapshot: Record<string, unknown> = {};
      for (const [alias, hash] of Object.entries(CUSTOM_DEAL_KEYS)) {
        if (d[hash] !== undefined && d[hash] !== null && d[hash] !== "") {
          customSnapshot[alias] = d[hash];
        }
      }

      insDeal.run(
        Number(d.id),
        titleStr,
        Number(d.value || 0),
        String(d.currency || "BRL"),
        s("formatted_value") || `R$ ${Number(d.value || 0).toLocaleString("pt-BR")}`,
        Number(d.weighted_value || 0),
        String(d.status || "open"),
        d.probability != null ? Number(d.probability) : null,
        pipelineId || null,
        pipelineMap.get(pipelineId) || "",
        stageId || null,
        stageInfo?.name || "",
        Number(d.stage_order_nr ?? stageInfo?.order_nr ?? 0),
        userId || null,
        s("owner_name") || (typeof userObj === "object" && userObj ? String(userObj.name || "") : ""),
        creatorId || null,
        personId || null,
        s("person_name") || (typeof personObj === "object" && personObj ? String(personObj.name || "") : ""),
        orgId || null,
        s("org_name") || (typeof orgObj === "object" && orgObj ? String(orgObj.name || "") : ""),
        d.label != null ? String(d.label) : null,
        labelName,
        labelColor,
        s("lost_reason"),
        s("origin"),
        d.channel != null ? Number(d.channel) : null,
        d.is_archived ? 1 : 0,
        s("add_time"),
        s("update_time"),
        s("stage_change_time"),
        s("next_activity_date"),
        s("last_activity_date"),
        s("won_time"),
        s("lost_time"),
        s("close_time"),
        s("expected_close_date"),
        Number(d.activities_count || 0),
        Number(d.done_activities_count || 0),
        Number(d.undone_activities_count || 0),
        Number(d.notes_count || 0),
        Number(d.files_count || 0),
        Number(d.email_messages_count || 0),
        s(CUSTOM_DEAL_KEYS.meeting_reminder),
        s(CUSTOM_DEAL_KEYS.conversation_context),
        s(CUSTOM_DEAL_KEYS.last_email_sent),
        s(CUSTOM_DEAL_KEYS.custom_email_tag),
        s(CUSTOM_DEAL_KEYS.service_interest),
        s(CUSTOM_DEAL_KEYS.origin_country),
        s(CUSTOM_DEAL_KEYS.lead_ip),
        s(CUSTOM_DEAL_KEYS.device_info),
        s(CUSTOM_DEAL_KEYS.form_page_url),
        s(CUSTOM_DEAL_KEYS.form_filled),
        s(CUSTOM_DEAL_KEYS.utm_source),
        s(CUSTOM_DEAL_KEYS.utm_medium),
        s(CUSTOM_DEAL_KEYS.utm_campaign),
        s(CUSTOM_DEAL_KEYS.utm_term),
        s(CUSTOM_DEAL_KEYS.utm_content),
        s(CUSTOM_DEAL_KEYS.utm_id),
        s(CUSTOM_DEAL_KEYS.utm_adgroup),
        s(CUSTOM_DEAL_KEYS.gclid),
        s(CUSTOM_DEAL_KEYS.gbraid),
        s(CUSTOM_DEAL_KEYS.segment),
        s(CUSTOM_DEAL_KEYS.product_interest),
        s(CUSTOM_DEAL_KEYS.website),
        s(CUSTOM_DEAL_KEYS.meeting_date),
        s(CUSTOM_DEAL_KEYS.meeting_link),
        s(CUSTOM_DEAL_KEYS.cnpj),
        n(CUSTOM_DEAL_KEYS.score),
        n(CUSTOM_DEAL_KEYS.expat_count) || 0,
        s(CUSTOM_DEAL_KEYS.dou_act_type),
        null,
        s(CUSTOM_DEAL_KEYS.dou_link),
        n(CUSTOM_DEAL_KEYS.company_size),
        s(CUSTOM_DEAL_KEYS.company_porte),
        isDou,
        JSON.stringify(customSnapshot)
      );
    }

    const insNote = db.prepare(`
      INSERT INTO notes (
        id, deal_id, deal_title, person_id, person_name, org_id, org_name,
        user_id, user_name, content, note_category, parsed_meta_json, pinned_to_deal_flag, add_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updDealDou = db.prepare(`
      UPDATE deals
      SET expat_count = MAX(expat_count, ?),
          dou_act_type = COALESCE(dou_act_type, ?),
          dou_process = COALESCE(dou_process, ?),
          is_dou = 1
      WHERE id = ?
    `);
    const updDealRf = db.prepare(`
      UPDATE deals
      SET cnpj = COALESCE(cnpj, ?),
          score = COALESCE(score, ?),
          segment = COALESCE(segment, ?)
      WHERE id = ?
    `);

    for (const nt of notes) {
      const parsed = parseNoteContent(String(nt.content || ""));
      const dealObj = nt.deal as Record<string, unknown> | null;
      const personObj = nt.person as Record<string, unknown> | null;
      const orgObj = nt.organization as Record<string, unknown> | null;
      const userObj = nt.user as Record<string, unknown> | null;
      const dealId = nt.deal_id != null ? Number(nt.deal_id) : null;

      insNote.run(
        Number(nt.id),
        dealId,
        dealObj?.title ? String(dealObj.title) : null,
        nt.person_id != null ? Number(nt.person_id) : null,
        personObj?.name ? String(personObj.name) : null,
        nt.org_id != null ? Number(nt.org_id) : null,
        orgObj?.name ? String(orgObj.name) : null,
        nt.user_id != null ? Number(nt.user_id) : null,
        userObj?.name ? String(userObj.name) : null,
        parsed.cleanHtml,
        parsed.category,
        JSON.stringify(parsed.meta),
        nt.pinned_to_deal_flag ? 1 : 0,
        String(nt.add_time || ""),
        String(nt.update_time || "")
      );

      if (dealId && parsed.category === "dou_authorization") {
        updDealDou.run(
          parsed.meta.expat_count || 1,
          parsed.meta.normative_resolution || null,
          parsed.meta.process_number || null,
          dealId
        );
      } else if (dealId && parsed.category === "enrichment_score") {
        const cleanCnpj = parsed.meta.cnpj && parsed.meta.cnpj !== "N/D" ? parsed.meta.cnpj : null;
        const cleanCnae = parsed.meta.cnae && parsed.meta.cnae !== "N/D" ? parsed.meta.cnae : null;
        if (cleanCnpj || parsed.meta.score != null || cleanCnae) {
          updDealRf.run(cleanCnpj, parsed.meta.score ?? null, cleanCnae, dealId);
        }
      }
    }

    const insActivity = db.prepare(`
      INSERT INTO activities (
        id, subject, type, type_name, done, due_date, due_time, duration, marked_as_done_time,
        deal_id, deal_title, person_id, person_name, org_id, org_name,
        user_id, owner_name, note, cadence_period, is_auto_cadence, priority, location, conference_meeting_url,
        add_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const a of activities) {
      const subj = String(a.subject || "");
      const noteText = a.note ? String(a.note) : "";
      let period = "GERAL";
      if (subj.includes("[MANHÃ]") || subj.includes("[MANHA]")) period = "MANHÃ";
      else if (subj.includes("[TARDE]")) period = "TARDE";
      const isAuto = noteText.includes("cadencia-auto") || subj.includes("[MANHÃ]") || subj.includes("[TARDE]") ? 1 : 0;

      insActivity.run(
        Number(a.id),
        subj,
        a.type ? String(a.type) : null,
        a.type_name ? String(a.type_name) : null,
        a.done ? 1 : 0,
        a.due_date ? String(a.due_date) : null,
        a.due_time ? String(a.due_time) : null,
        a.duration ? String(a.duration) : null,
        a.marked_as_done_time ? String(a.marked_as_done_time) : null,
        a.deal_id != null ? Number(a.deal_id) : null,
        a.deal_title ? String(a.deal_title) : null,
        a.person_id != null ? Number(a.person_id) : null,
        a.person_name ? String(a.person_name) : null,
        a.org_id != null ? Number(a.org_id) : null,
        a.org_name ? String(a.org_name) : null,
        a.user_id != null ? Number(a.user_id) : null,
        a.owner_name ? String(a.owner_name) : null,
        noteText || null,
        period,
        isAuto,
        a.priority != null ? String(a.priority) : null,
        a.location ? String(a.location) : null,
        a.conference_meeting_url ? String(a.conference_meeting_url) : null,
        String(a.add_time || ""),
        String(a.update_time || "")
      );
    }

    const insFile = db.prepare(`
      INSERT INTO files (
        id, name, file_name, local_filename, has_local_file, file_type, file_size,
        deal_id, deal_name, person_id, person_name, org_id, org_name, user_id, url, description, add_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const f of files) {
      const fid = Number(f.id);
      const localName = localFileById.get(fid) || null;
      insFile.run(
        fid,
        f.name ? String(f.name) : null,
        f.file_name ? String(f.file_name) : null,
        localName,
        localName ? 1 : 0,
        f.file_type ? String(f.file_type) : null,
        f.file_size != null ? Number(f.file_size) : null,
        f.deal_id != null ? Number(f.deal_id) : null,
        f.deal_name ? String(f.deal_name) : null,
        f.person_id != null ? Number(f.person_id) : null,
        f.person_name ? String(f.person_name) : null,
        f.org_id != null ? Number(f.org_id) : null,
        f.org_name ? String(f.org_name) : null,
        f.user_id != null ? Number(f.user_id) : null,
        f.url ? String(f.url) : null,
        f.description ? String(f.description) : null,
        String(f.add_time || ""),
        String(f.update_time || "")
      );
    }

    // Import deal_flow_events (key state transitions & important field changes)
    const importantKeys = new Set([
      "stage_id",
      "status",
      "value",
      "user_id",
      "pipeline_id",
      "lost_reason",
      "won_time",
      "lost_time",
      CUSTOM_DEAL_KEYS.score,
      CUSTOM_DEAL_KEYS.meeting_date,
    ]);
    const insFlow = db.prepare(`
      INSERT INTO deal_flow_events (
        external_event_id, deal_id, object_type, timestamp, user_id, field_key, field_name,
        old_value, new_value, old_label, new_label, change_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    let flowCount = 0;
    for (const df of dealsFlow) {
      const dealId = Number(df.deal_id);
      const events = Array.isArray(df.eventos) ? df.eventos : [];
      for (const ev of events) {
        const data = (ev.data || {}) as Record<string, unknown>;
        const fKey = String(data.field_key || "");
        if (!importantKeys.has(fKey)) continue;
        const addData = (data.additional_data || {}) as Record<string, unknown>;
        insFlow.run(
          data.id != null ? Number(data.id) : null,
          dealId,
          String(ev.object || "dealChange"),
          String(ev.timestamp || ""),
          data.user_id != null ? Number(data.user_id) : null,
          fKey,
          fieldNameMap.get(fKey) || fKey,
          data.old_value != null ? String(data.old_value) : null,
          data.new_value != null ? String(data.new_value) : null,
          addData.old_value_formatted ? String(addData.old_value_formatted) : null,
          addData.new_value_formatted ? String(addData.new_value_formatted) : null,
          data.change_source ? String(data.change_source) : null
        );
        flowCount++;
      }
    }

    const insFilter = db.prepare(`
      INSERT INTO saved_filters (id, name, filter_code, type, user_id, visible_to, add_time, last_used_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const fl of filters) {
      insFilter.run(
        Number(fl.id),
        String(fl.name || ""),
        fl.filter_code ? String(fl.filter_code) : null,
        fl.type ? String(fl.type) : null,
        fl.user_id != null ? Number(fl.user_id) : null,
        fl.visible_to ? String(fl.visible_to) : null,
        String(fl.add_time || ""),
        fl.last_used_time ? String(fl.last_used_time) : null
      );
    }

    const insWebhook = db.prepare(`
      INSERT INTO webhooks (id, name, event_action, event_object, subscription_url, is_active, last_http_status, last_delivery_time, add_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const wh of webhooks) {
      insWebhook.run(
        Number(wh.id),
        String(wh.name || ""),
        String(wh.event_action || ""),
        String(wh.event_object || ""),
        String(wh.subscription_url || ""),
        wh.is_active ? 1 : 0,
        wh.last_http_status ? String(wh.last_http_status) : null,
        wh.last_delivery_time ? String(wh.last_delivery_time) : null,
        String(wh.add_time || "")
      );
    }

    const insMail = db.prepare(`
      INSERT INTO mail_threads (id, subject, snippet, from_party_json, to_parties_json, linked_person_id, linked_person_name, linked_org_id, message_time, folders_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const mt of mailInbox) {
      const parties = (mt.parties || {}) as {
        from?: Array<Record<string, unknown>>;
        to?: Array<Record<string, unknown>>;
      };
      const firstTo = parties.to?.[0];
      insMail.run(
        Number(mt.id),
        String(mt.subject || ""),
        String(mt.snippet || ""),
        JSON.stringify(parties.from || []),
        JSON.stringify(parties.to || []),
        firstTo?.linked_person_id != null ? Number(firstTo.linked_person_id) : null,
        firstTo?.linked_person_name ? String(firstTo.linked_person_name) : null,
        firstTo?.linked_organization_id != null ? Number(firstTo.linked_organization_id) : null,
        firstTo?.message_time != null ? Number(firstTo.message_time) : null,
        JSON.stringify(mt.folders || [])
      );
    }

    // Seed Catalog & Real Proposals if not yet populated
    const insService = db.prepare(`
      INSERT OR IGNORE INTO services_catalog (code, country, category, name, description, scope, price, currency, unit, notes, source_document)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const svc of CATALOG_SERVICES_SEED) {
      insService.run(
        svc.code,
        svc.country,
        svc.category,
        svc.name,
        svc.description,
        svc.scope,
        svc.price,
        svc.currency,
        svc.unit,
        svc.notes,
        svc.source_document
      );
    }

    const propCountRow = db.prepare("SELECT COUNT(*) as cnt FROM proposals").get() as { cnt: number };
    if (propCountRow.cnt === 0) {
      const insProp = db.prepare(`
        INSERT INTO proposals (
          title, client_company, client_contact, client_email, client_phone,
          deal_id, org_id, person_id, country_route, currency, total_value, discount_amount,
          status, valid_days, items_json, notes, attachment_file_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const prop of REAL_PROPOSALS_SEED) {
        insProp.run(
          prop.title,
          prop.client_company,
          prop.client_contact,
          prop.client_email,
          prop.client_phone,
          prop.deal_id,
          prop.org_id,
          prop.person_id,
          prop.country_route,
          prop.currency,
          prop.total_value,
          prop.discount_amount,
          prop.status,
          prop.valid_days,
          JSON.stringify(prop.items),
          prop.notes,
          prop.attachment_file_id,
          prop.created_at
        );
      }
    }

    // Audit every file in backup_pipedrive/ + root zip
    const allFolderFiles = walkFiles(backupRoot, process.cwd());
    const rootZipPath = path.join(process.cwd(), "backup_pipedrive-20261113T162657Z-1-001.zip");
    if (fs.existsSync(rootZipPath)) {
      allFolderFiles.push({
        absPath: rootZipPath,
        relPath: "backup_pipedrive-20261113T162657Z-1-001.zip",
        size: fs.statSync(rootZipPath).size,
      });
    }

    const manifestEntities = manifest.entidades || {};
    const insAudit = db.prepare(`
      INSERT OR REPLACE INTO imported_files_audit (filename, relative_path, file_format, file_size, records_count, entity_target, sha256, status, imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const f of allFolderFiles) {
      const ext = path.extname(f.relPath).replace(".", "").toUpperCase() || "FILE";
      const base = path.basename(f.relPath);
      const baseNoExt = path.basename(f.relPath, path.extname(f.relPath));

      let recordsCount = 0;
      let entityTarget = "Anexo / Backup";
      let sha = manifestEntities[baseNoExt]?.sha256 || null;
      let status = "Importado";

      if (f.relPath.includes("api-2026-09-28/") && ext === "JSON") {
        const mInfo = manifestEntities[baseNoExt];
        recordsCount = mInfo?.registros ?? 0;
        entityTarget = baseNoExt;
        if (baseNoExt === "deals_flow") recordsCount = flowCount;
      } else if (ext === "CSV") {
        if (base.startsWith("deals-")) {
          entityTarget = "deals (CSV espelho)";
          recordsCount = deals.length;
        } else if (base.startsWith("organizations-")) {
          entityTarget = "organizations (CSV espelho)";
          recordsCount = organizations.length;
        } else if (base.startsWith("people-")) {
          entityTarget = "persons (CSV espelho)";
          recordsCount = persons.length;
        } else if (base.startsWith("notes-")) {
          entityTarget = "notes (CSV espelho)";
          recordsCount = notes.length;
        } else if (base.startsWith("activities-")) {
          entityTarget = "activities (CSV lote)";
          recordsCount = Math.ceil(activities.length / 4);
        } else if (base.startsWith("files-")) {
          entityTarget = "files (CSV espelho)";
          recordsCount = files.length;
        } else if (base.startsWith("leads-")) {
          entityTarget = "leads (vazio no backup)";
        } else if (base.startsWith("products-")) {
          entityTarget = "products (vazio no backup)";
        } else if (base.startsWith("projects-")) {
          entityTarget = "projects (vazio no backup)";
        }
      } else if (f.relPath.includes("/arquivos/")) {
        entityTarget = ext === "XLSX" || ext === "PDF" ? "propostas & catálogo" : "anexos / screenshots";
        recordsCount = 1;
      } else if (ext === "ZIP") {
        entityTarget = "arquivo compactado fonte";
        recordsCount = allFolderFiles.length - 1;
      } else if (base === "backup-log.txt") {
        entityTarget = "log de extração Pipedrive";
        recordsCount = 1;
      }

      if (!sha && f.size < 5_000_000) {
        try {
          sha = crypto.createHash("sha256").update(fs.readFileSync(f.absPath)).digest("hex");
        } catch {
          sha = null;
        }
      }

      insAudit.run(base, f.relPath, ext, f.size, recordsCount, entityTarget, sha, status, nowIso);
    }

    const setMeta = db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)");
    setMeta.run("last_sync_at", nowIso);
    setMeta.run("manifest_updated_at", manifest.atualizado_em || "");
    setMeta.run("pipedrive_domain", manifest.dominio || "target3");

    db.exec("COMMIT;");

    const svcCount = (db.prepare("SELECT COUNT(*) as c FROM services_catalog").get() as { c: number }).c;
    const propCount = (db.prepare("SELECT COUNT(*) as c FROM proposals").get() as { c: number }).c;
    const auditCount = (db.prepare("SELECT COUNT(*) as c FROM imported_files_audit").get() as { c: number }).c;

    return {
      success: true,
      durationMs: Date.now() - start,
      counts: {
        pipelines: pipelines.length,
        stages: stages.length,
        users: users.length,
        organizations: organizations.length,
        persons: persons.length,
        deals: deals.length,
        notes: notes.length,
        activities: activities.length,
        files: files.length,
        localFiles: localFileById.size,
        dealFlowEvents: flowCount,
        savedFilters: filters.length,
        webhooks: webhooks.length,
        servicesCatalog: svcCount,
        proposals: propCount,
        auditedFiles: auditCount,
      },
      importedAt: nowIso,
    };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}

export async function importUploadedDocument(filename: string, buffer: Buffer): Promise<{
  filename: string;
  format: string;
  importedRecords: number;
  entityTarget: string;
  details: string;
}> {
  const db = getDb();
  const ext = path.extname(filename).toLowerCase();
  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const savedPath = path.join(uploadsDir, `${Date.now()}__${filename}`);
  fs.writeFileSync(savedPath, buffer);
  const sha = crypto.createHash("sha256").update(buffer).digest("hex");
  const nowIso = new Date().toISOString();

  let importedRecords = 0;
  let entityTarget = "arquivo_anexo";
  let details = `Arquivo ${filename} salvo no CRM.`;

  if (ext === ".csv") {
    const records = parseCsvRecords(buffer.toString("utf-8"));
    importedRecords = importGenericRecords(records);
    entityTarget = detectEntityFromColumns(records[0] || {});
    details = `${importedRecords} registro(s) importado(s) via CSV para ${entityTarget}.`;
  } else if (ext === ".json") {
    const parsed = JSON.parse(buffer.toString("utf-8"));
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    importedRecords = importGenericRecords(arr);
    entityTarget = detectEntityFromColumns(arr[0] || {});
    details = `${importedRecords} registro(s) importado(s) via JSON para ${entityTarget}.`;
  } else if (ext === ".xlsx" || ext === ".xls") {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = wb.SheetNames[0];
    if (firstSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[firstSheet]);
      importedRecords = importGenericRecords(rows);
      entityTarget = detectEntityFromColumns(rows[0] || {});
      details = `${importedRecords} linha(s) processada(s) da planilha (${wb.SheetNames.length} abas) em ${entityTarget}.`;
    }
  } else if (ext === ".zip") {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    let total = 0;
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const entryExt = path.extname(entry.entryName).toLowerCase();
      if ([".csv", ".json", ".xlsx"].includes(entryExt)) {
        const res = await importUploadedDocument(path.basename(entry.entryName), entry.getData());
        total += res.importedRecords;
      }
    }
    importedRecords = total;
    entityTarget = "pacote_zip";
    details = `ZIP processado (${entries.length} arquivos, ${total} registros importados).`;
  } else {
    // PDF, PNG, JPG, DOCX -> register in files table
    const maxFileRow = db.prepare("SELECT COALESCE(MAX(id), 1000) as m FROM files").get() as { m: number };
    const newId = Math.max(1000, maxFileRow.m + 1);
    const localName = `${newId}__${filename}`;
    const arquivosDir = path.join(getBackupRoot(), "api-2026-09-28", "arquivos");
    if (!fs.existsSync(arquivosDir)) fs.mkdirSync(arquivosDir, { recursive: true });
    fs.writeFileSync(path.join(arquivosDir, localName), buffer);

    db.prepare(`
      INSERT INTO files (id, name, file_name, local_filename, has_local_file, file_type, file_size, add_time, update_time)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(newId, filename, filename, localName, ext.replace(".", ""), buffer.length, nowIso, nowIso);

    importedRecords = 1;
    entityTarget = "files";
    details = `Documento ${filename} indexado na galeria de arquivos (#${newId}).`;
  }

  db.prepare(`
    INSERT OR REPLACE INTO imported_files_audit (filename, relative_path, file_format, file_size, records_count, entity_target, sha256, status, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Importado (Upload)', ?)
  `).run(filename, `data/uploads/${path.basename(savedPath)}`, ext.replace(".", "").toUpperCase(), buffer.length, importedRecords, entityTarget, sha, nowIso);

  return { filename, format: ext.replace(".", "").toUpperCase(), importedRecords, entityTarget, details };
}

function detectEntityFromColumns(sample: Record<string, unknown>): string {
  const keys = Object.keys(sample).join(" ").toLowerCase();
  if (keys.includes("negócio") || keys.includes("stage") || keys.includes("pipeline") || keys.includes("title") || keys.includes("título")) {
    return "deals";
  }
  if (keys.includes("organização") || keys.includes("cnpj") || keys.includes("website") || keys.includes("empresa")) {
    return "organizations";
  }
  if (keys.includes("pessoa") || keys.includes("telefone") || keys.includes("phone") || keys.includes("email")) {
    return "persons";
  }
  return "deals";
}

function importGenericRecords(records: Array<Record<string, unknown>>): number {
  if (!records.length) return 0;
  const db = getDb();
  const target = detectEntityFromColumns(records[0]);
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  let count = 0;

  db.exec("BEGIN TRANSACTION;");
  try {
    if (target === "organizations") {
      const maxId = (db.prepare("SELECT COALESCE(MAX(id), 10000) as m FROM organizations").get() as { m: number }).m;
      let nextId = maxId + 1;
      const ins = db.prepare(`
        INSERT OR REPLACE INTO organizations (id, name, owner_name, address, website, add_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of records) {
        const name = String(r["Organização - Nome"] || r["name"] || r["Nome"] || r["empresa"] || "").trim();
        if (!name) continue;
        const id = Number(r["Organização - ID"] || r["id"] || nextId++);
        ins.run(
          id,
          name,
          String(r["Organização - Proprietário"] || r["owner_name"] || "Klaus"),
          String(r["Organização - Endereço"] || r["address"] || ""),
          String(r["Organização - Site"] || r["website"] || ""),
          now,
          now
        );
        count++;
      }
    } else if (target === "persons") {
      const maxId = (db.prepare("SELECT COALESCE(MAX(id), 10000) as m FROM persons").get() as { m: number }).m;
      let nextId = maxId + 1;
      const ins = db.prepare(`
        INSERT OR REPLACE INTO persons (id, name, primary_email, primary_phone, org_name, owner_name, add_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of records) {
        const name = String(r["Pessoa - Nome"] || r["name"] || r["Nome"] || "").trim();
        if (!name) continue;
        const id = Number(r["Pessoa - ID"] || r["id"] || nextId++);
        ins.run(
          id,
          name,
          String(r["Pessoa - E-mail - Trabalho"] || r["email"] || r["Email"] || ""),
          String(r["Pessoa - Telefone - Celular"] || r["Pessoa - Telefone - Trabalho"] || r["phone"] || r["Telefone"] || ""),
          String(r["Pessoa - Organização"] || r["org_name"] || r["Empresa"] || ""),
          String(r["Pessoa - Proprietário"] || r["owner_name"] || "Klaus"),
          now,
          now
        );
        count++;
      }
    } else {
      const maxId = (db.prepare("SELECT COALESCE(MAX(id), 10000) as m FROM deals").get() as { m: number }).m;
      let nextId = maxId + 1;
      const ins = db.prepare(`
        INSERT OR REPLACE INTO deals (id, title, value, currency, formatted_value, status, pipeline_id, pipeline_name, stage_id, stage_name, owner_name, org_name, person_name, add_time, update_time)
        VALUES (?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of records) {
        const title = String(r["Negócio - Título"] || r["title"] || r["Título"] || r["nome"] || "").trim();
        if (!title) continue;
        const id = Number(r["Negócio - ID"] || r["id"] || nextId++);
        const val = Number(r["Negócio - Valor"] || r["value"] || r["Valor"] || 0) || 0;
        const statusRaw = String(r["Negócio - Status"] || r["status"] || "open").toLowerCase();
        const status = statusRaw.includes("ganho") || statusRaw === "won" ? "won" : statusRaw.includes("perd") || statusRaw === "lost" ? "lost" : "open";
        ins.run(
          id,
          title,
          val,
          `R$ ${val.toLocaleString("pt-BR")}`,
          status,
          Number(r["pipeline_id"] || 1),
          String(r["Negócio - Funil"] || r["pipeline_name"] || "CRM - SDR"),
          Number(r["stage_id"] || 6),
          String(r["Negócio - Etapa"] || r["stage_name"] || "Nova oportunidade"),
          String(r["Negócio - Proprietário"] || r["owner_name"] || "Klaus"),
          String(r["Negócio - Organização"] || r["org_name"] || ""),
          String(r["Negócio - Pessoa de contato"] || r["person_name"] || ""),
          now,
          now
        );
        count++;
      }
    }
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
  return count;
}
