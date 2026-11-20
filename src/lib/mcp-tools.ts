import type { McpCallerContext } from "@/lib/mcp-auth";

export const ALLOWED_MCP_TABLES = new Set([
  "action_plan_milestones",
  "activities",
  "ads_campaigns",
  "ai_chat_messages",
  "ai_chat_sessions",
  "app_meta",
  "blog_posts",
  "deal_flow_events",
  "deals",
  "editorial_items",
  "field_definitions",
  "files",
  "geo_audit_tests",
  "imported_files_audit",
  "kpi_snapshots",
  "mail_threads",
  "notes",
  "organizations",
  "persons",
  "pipelines",
  "proposals",
  "saved_filters",
  "sdr_call_audits",
  "sdr_daily_logs",
  "services_catalog",
  "stages",
  "users",
  "webhooks",
  "weekly_meetings",
  "workspace_members",
]);

const READONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export const MCP_TOOLS_DEFINITION = [
  {
    name: "search",
    description:
      "Busca unificada somente leitura em toda a base da Target Relocation (negócios CRM, empresas/CNPJs, contatos, Radar DOU, artigos do blog e pautas editoriais). Compatível com Conectores OpenAI.",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string", description: "Termo de busca (empresa, CNPJ, processo DOU, contato, visto ou artigo)" },
      },
    },
  },
  {
    name: "fetch",
    description:
      "Recupera o registro completo (somente leitura) a partir de um ID retornado por 'search' (ex: deal:4756, org:1565, person:239, blog:visto-chines-brasileiro, table:deals).",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "Identificador composto retornado pelo search (ex: deal:4756 ou org:1565)" },
      },
    },
  },
  {
    name: "get_database_schema",
    description:
      "Lista todas as 30 tabelas disponíveis no banco PostgreSQL (CRM, Radar DOU, Blog GEO, SDR, Ads, KPIs), com todas as colunas, tipos de dados e contagem aproximada de linhas.",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_workspace_overview",
    description:
      "Retorna painel executivo completo e em tempo real: totais de negócios, Radar DOU, organizações, contatos, notas, propostas, placar SDR, progresso de 30 dias, 9 KPIs e scores Yoast SEO do blog.",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "query_table",
    description:
      "Consulta paginada e segura em qualquer uma das 30 tabelas públicas (ex: deals, organizations, persons, notes, activities, blog_posts, sdr_daily_logs, ads_campaigns, kpi_snapshots).",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: "object",
      required: ["table"],
      properties: {
        table: { type: "string", description: "Nome exato da tabela pública (obtenha com get_database_schema)" },
        columns: {
          type: "array",
          items: { type: "string" },
          description: "Colunas específicas a retornar (opcional; padrão todas)",
        },
        ilike_column: { type: "string", description: "Coluna de texto para filtro ILIKE opcional" },
        ilike_value: { type: "string", description: "Trecho de texto para buscar em ilike_column" },
        order_by: { type: "string", description: "Coluna para ordenação (ex: id, updated_at, seo_score)" },
        order_dir: { type: "string", enum: ["asc", "desc"], description: "Direção da ordenação (padrão desc)" },
        limit: { type: "number", description: "Máximo de linhas (1 a 100, padrão 25)" },
        offset: { type: "number", description: "Deslocamento para paginação (padrão 0)" },
      },
    },
  },
  {
    name: "run_readonly_sql",
    description:
      "Executa consultas SQL PostgreSQL estritamente SOMENTE LEITURA (SELECT ou WITH CTEs, JOINs, GROUP BY, agregações) sobre todas as tabelas de negócio. Qualquer mutação ou leitura de credenciais é bloqueada pelo Postgres.",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: "object",
      required: ["sql"],
      properties: {
        sql: { type: "string", description: "Consulta SQL iniciando com SELECT ou WITH" },
        limit: { type: "number", description: "Limite máximo de linhas retornadas (1 a 200, padrão 100)" },
      },
    },
  },
  {
    name: "get_deal_dossier",
    description:
      "Retorna o Dossiê 360° completo de um negócio pelo deal_id: dados do negócio, empresa (CNPJ/CNAE), contato, notas, atividades, movimentações de funil e arquivos.",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: "object",
      required: ["deal_id"],
      properties: {
        deal_id: { type: "number", description: "ID numérico do negócio no CRM" },
      },
    },
  },
  {
    name: "search_dou_radar",
    description:
      "Busca oportunidades no Radar DOU (Diário Oficial da União + Receita Federal + Score) por nome, CNPJ, processo DOU, país ou score mínimo.",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: "object",
      properties: {
        search: { type: "string", description: "Filtro de texto livre (empresa, CNPJ, processo ou expatriado)" },
        min_score: { type: "number", description: "Score mínimo de qualificação (0 a 100)" },
        stage: { type: "string", description: "Trecho do nome da etapa no funil Outbound" },
        limit: { type: "number", description: "Quantidade máxima (1 a 100, padrão 20)" },
      },
    },
  },
  {
    name: "get_blog_and_seo_summary",
    description:
      "Retorna resumo completo dos 195 artigos do Blog Target Relocation, distribuição do semáforo Yoast SEO (Bom/Regular/Melhorar), médias e artigos filtrados.",
    annotations: READONLY_ANNOTATIONS,
    inputSchema: {
      type: "object",
      properties: {
        seo_grade: { type: "string", enum: ["all", "good", "ok", "needs_improvement"], description: "Filtro de semáforo Yoast" },
        category: { type: "string", description: "Filtro parcial por categoria" },
        limit: { type: "number", description: "Máximo de artigos listados (padrão 20)" },
      },
    },
  },
] as const;

function sanitizeSqlInput(rawSql: string): { ok: true; sql: string } | { ok: false; error: string } {
  const clean = rawSql.trim().replace(/;\s*$/, "");
  if (!clean) return { ok: false, error: "SQL query cannot be empty." };
  if (clean.includes(";")) return { ok: false, error: "Multiple SQL statements are not allowed." };
  if (!/^\s*(select|with)\b/i.test(clean)) {
    return { ok: false, error: "Only read-only SELECT or WITH queries are permitted." };
  }
  if (/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|call|vacuum|execute|prepare)\b/i.test(clean)) {
    return { ok: false, error: "Write or DDL SQL keywords are strictly forbidden in read-only mode." };
  }
  if (/(workspace_settings|mcp_oauth_|(^|[^a-z0-9_])(auth|storage|private|vault)\s*\.|pg_shadow|pg_authid|pg_roles|pg_user)/i.test(clean)) {
    return { ok: false, error: "Access to internal credential or auth tables is restricted." };
  }
  return { ok: true, sql: clean };
}

function escapeSqlLiteral(val: string): string {
  return val.replace(/'/g, "''");
}

function isSafeIdent(ident: string): boolean {
  return /^[a-z_][a-z0-9_]{0,62}$/i.test(ident);
}

export async function execReadonlySql(caller: McpCallerContext, sql: string, limit = 100) {
  const checked = sanitizeSqlInput(sql);
  if (!checked.ok) {
    throw new Error(checked.error);
  }
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit || 100)));
  const { data, error } = await caller.supabase.rpc("mcp_readonly_sql", {
    p_access_hash: caller.accessHash,
    p_sql: checked.sql,
    p_limit: safeLimit,
  });

  if (error) {
    throw new Error(error.message);
  }
  const res = data as Record<string, unknown> | null;
  if (!res?.ok) {
    throw new Error(String(res?.error || "Erro ao executar SQL somente leitura."));
  }
  return {
    row_count: Number(res.row_count || 0),
    limit_applied: Number(res.limit_applied || safeLimit),
    rows: (Array.isArray(res.rows) ? res.rows : []) as Array<Record<string, unknown>>,
  };
}

export async function getDatabaseSchema(caller: McpCallerContext) {
  const { data, error } = await caller.supabase.rpc("mcp_get_database_schema", {
    p_access_hash: caller.accessHash,
  });
  if (error) throw new Error(error.message);
  const res = data as Record<string, unknown> | null;
  if (!res?.ok) throw new Error(String(res?.error || "Failed to load database schema"));
  return res.tables;
}

export async function getWorkspaceOverviewData(caller: McpCallerContext) {
  const summaryRes = await execReadonlySql(
    caller,
    `SELECT
      (SELECT count(*) FROM deals) AS total_deals,
      (SELECT count(*) FROM deals WHERE status = 'open') AS open_deals,
      (SELECT count(*) FROM deals WHERE status = 'won') AS won_deals,
      (SELECT count(*) FROM deals WHERE status = 'lost') AS lost_deals,
      (SELECT coalesce(sum(value), 0) FROM deals WHERE value > 0) AS total_pipeline_value_brl,
      (SELECT count(*) FROM deals WHERE is_dou = 1) AS dou_total_deals,
      (SELECT count(*) FROM deals WHERE is_dou = 1 AND score >= 40) AS dou_qualified_deals,
      (SELECT count(*) FROM organizations) AS total_organizations,
      (SELECT count(*) FROM persons) AS total_persons,
      (SELECT count(*) FROM notes) AS total_notes,
      (SELECT count(*) FROM activities) AS total_activities,
      (SELECT count(*) FROM activities WHERE done = 0) AS pending_activities,
      (SELECT count(*) FROM proposals) AS total_proposals,
      (SELECT count(*) FROM blog_posts) AS total_blog_posts,
      (SELECT count(*) FROM blog_posts WHERE status = 'published') AS published_blog_posts,
      (SELECT coalesce(round(avg(seo_score)), 0) FROM blog_posts) AS avg_yoast_seo_score,
      (SELECT count(*) FROM action_plan_milestones WHERE status = 'completed') AS milestones_done,
      (SELECT count(*) FROM action_plan_milestones) AS milestones_total`,
    1
  );

  const [sdrRes, kpiRes] = await Promise.all([
    execReadonlySql(caller, `SELECT log_date, sdr_name, calls_made, conversations, meetings_booked, linkedin_invites, emails_sent FROM sdr_daily_logs ORDER BY log_date DESC, sdr_name ASC`, 10),
    execReadonlySql(caller, `SELECT kpi_key, name, source, frequency, owner, current_value, target_value FROM kpi_snapshots ORDER BY id ASC`, 20),
  ]);

  return {
    metrics: summaryRes.rows[0] || {},
    sdr_daily_logs: sdrRes.rows,
    kpis: kpiRes.rows,
  };
}

export async function executeMcpTool(
  caller: McpCallerContext,
  name: string,
  args: Record<string, unknown>
): Promise<{ text: string; isError?: boolean }> {
  try {
    if (name === "get_database_schema") {
      const tables = await getDatabaseSchema(caller);
      return { text: JSON.stringify({ table_count: Array.isArray(tables) ? tables.length : 0, tables }, null, 2) };
    }

    if (name === "get_workspace_overview") {
      const data = await getWorkspaceOverviewData(caller);
      return { text: JSON.stringify(data, null, 2) };
    }

    if (name === "run_readonly_sql") {
      const sql = String(args.sql || "");
      const limit = Number(args.limit || 100);
      const data = await execReadonlySql(caller, sql, limit);
      return { text: JSON.stringify(data, null, 2) };
    }

    if (name === "query_table") {
      const table = String(args.table || "").trim();
      if (!ALLOWED_MCP_TABLES.has(table)) {
        return {
          isError: true,
          text: `Tabela '${table}' não permitida. Use get_database_schema para listar as 30 tabelas disponíveis.`,
        };
      }
      const cols = Array.isArray(args.columns)
        ? args.columns.map(String).filter(isSafeIdent)
        : [];
      const colList = cols.length > 0 ? cols.join(", ") : "*";

      let whereClause = "";
      const ilikeCol = args.ilike_column ? String(args.ilike_column).trim() : "";
      const ilikeVal = args.ilike_value !== undefined ? String(args.ilike_value).trim() : "";
      if (ilikeCol && isSafeIdent(ilikeCol) && ilikeVal) {
        whereClause = ` WHERE ${ilikeCol}::text ILIKE '%${escapeSqlLiteral(ilikeVal)}%'`;
      }

      const orderBy = args.order_by && isSafeIdent(String(args.order_by)) ? String(args.order_by) : "";
      const orderDir = String(args.order_dir || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
      const orderClause = orderBy ? ` ORDER BY ${orderBy} ${orderDir} NULLS LAST` : "";

      const offset = Math.max(0, Math.floor(Number(args.offset || 0)));
      const limit = Math.max(1, Math.min(100, Math.floor(Number(args.limit || 25))));
      const sql = `SELECT ${colList} FROM public.${table}${whereClause}${orderClause} OFFSET ${offset}`;

      const data = await execReadonlySql(caller, sql, limit);
      return { text: JSON.stringify({ table, offset, ...data }, null, 2) };
    }

    if (name === "get_deal_dossier") {
      const dealId = Number(args.deal_id);
      if (!Number.isFinite(dealId) || dealId <= 0) {
        return { isError: true, text: "deal_id numérico válido obrigatório." };
      }
      const [dealRes, notesRes, actRes, flowRes, filesRes] = await Promise.all([
        execReadonlySql(caller, `SELECT * FROM deals WHERE id = ${Math.floor(dealId)}`, 1),
        execReadonlySql(caller, `SELECT id, user_name, note_category, content, add_time FROM notes WHERE deal_id = ${Math.floor(dealId)} ORDER BY id DESC`, 30),
        execReadonlySql(caller, `SELECT id, subject, type, due_date, done, owner_name, note FROM activities WHERE deal_id = ${Math.floor(dealId)} ORDER BY id DESC`, 30),
        execReadonlySql(caller, `SELECT id, object_type, timestamp, field_key, field_name, old_label, new_label, change_source FROM deal_flow_events WHERE deal_id = ${Math.floor(dealId)} ORDER BY timestamp DESC`, 30),
        execReadonlySql(caller, `SELECT id, file_name, file_type, file_size FROM files WHERE deal_id = ${Math.floor(dealId)}`, 20),
      ]);

      const deal = dealRes.rows[0] || null;
      if (!deal) {
        return { isError: true, text: `Negócio #${dealId} não encontrado.` };
      }

      const [orgRes, personRes] = await Promise.all([
        deal.org_id ? execReadonlySql(caller, `SELECT * FROM organizations WHERE id = ${Number(deal.org_id)}`, 1) : Promise.resolve({ rows: [] }),
        deal.person_id ? execReadonlySql(caller, `SELECT * FROM persons WHERE id = ${Number(deal.person_id)}`, 1) : Promise.resolve({ rows: [] }),
      ]);

      return {
        text: JSON.stringify(
          {
            deal,
            organization: orgRes.rows[0] || null,
            person: personRes.rows[0] || null,
            notes: notesRes.rows,
            activities: actRes.rows,
            flow_events: flowRes.rows,
            files: filesRes.rows,
          },
          null,
          2
        ),
      };
    }

    if (name === "search_dou_radar") {
      const q = escapeSqlLiteral(String(args.search || "").trim());
      const minScore = Number.isFinite(Number(args.min_score)) ? Number(args.min_score) : 0;
      const stage = escapeSqlLiteral(String(args.stage || "").trim());
      const limit = Math.max(1, Math.min(100, Math.floor(Number(args.limit || 20))));

      const conds = ["is_dou = 1"];
      if (minScore > 0) conds.push(`score >= ${Math.floor(minScore)}`);
      if (stage) conds.push(`stage_name ILIKE '%${stage}%'`);
      if (q) {
        conds.push(
          `(title ILIKE '%${q}%' OR org_name ILIKE '%${q}%' OR cnpj ILIKE '%${q}%' OR dou_process ILIKE '%${q}%' OR origin_country ILIKE '%${q}%')`
        );
      }

      const sql = `SELECT id, title, org_name, person_name, cnpj, dou_process, dou_act_type, dou_link, score, stage_name, owner_name, status, origin_country, expat_count, update_time
        FROM deals
        WHERE ${conds.join(" AND ")}
        ORDER BY score DESC NULLS LAST, id DESC`;

      const data = await execReadonlySql(caller, sql, limit);
      return { text: JSON.stringify(data, null, 2) };
    }

    if (name === "get_blog_and_seo_summary") {
      const grade = String(args.seo_grade || "all");
      const cat = escapeSqlLiteral(String(args.category || "").trim());
      const limit = Math.max(1, Math.min(100, Math.floor(Number(args.limit || 20))));

      const conds = ["1=1"];
      if (grade !== "all" && ["good", "ok", "needs_improvement"].includes(grade)) {
        conds.push(`seo_grade = '${grade}'`);
      }
      if (cat) conds.push(`category ILIKE '%${cat}%'`);

      const [statsRes, postsRes] = await Promise.all([
        execReadonlySql(
          caller,
          `SELECT count(*) AS total_posts,
            count(*) FILTER (WHERE status = 'published') AS published,
            count(*) FILTER (WHERE seo_grade = 'good') AS seo_good,
            count(*) FILTER (WHERE seo_grade = 'ok') AS seo_ok,
            count(*) FILTER (WHERE seo_grade = 'needs_improvement') AS seo_needs_improvement,
            round(avg(seo_score)) AS avg_seo_score,
            round(avg(readability_score)) AS avg_readability_score
          FROM blog_posts`,
          1
        ),
        execReadonlySql(
          caller,
          `SELECT id, slug, canonical_path, title, category, focus_keyword, seo_title, seo_score, readability_score, seo_grade, word_count, status, published_at
           FROM blog_posts
           WHERE ${conds.join(" AND ")}
           ORDER BY seo_score ASC, published_at DESC`,
          limit
        ),
      ]);

      return {
        text: JSON.stringify({ summary: statsRes.rows[0] || {}, posts: postsRes.rows }, null, 2),
      };
    }

    if (name === "search") {
      const q = escapeSqlLiteral(String(args.query || "").trim());
      if (!q) {
        return { text: JSON.stringify({ results: [] }) };
      }

      const [dealsRes, orgsRes, personsRes, blogRes] = await Promise.all([
        execReadonlySql(
          caller,
          `SELECT id, title, org_name, person_name, stage_name, owner_name, score, status, value FROM deals
           WHERE title ILIKE '%${q}%' OR org_name ILIKE '%${q}%' OR person_name ILIKE '%${q}%' OR cnpj ILIKE '%${q}%' OR dou_process ILIKE '%${q}%'
           ORDER BY is_dou DESC, score DESC NULLS LAST, id DESC`,
          6
        ),
        execReadonlySql(
          caller,
          `SELECT id, name, address, owner_name, open_deals_count FROM organizations
           WHERE name ILIKE '%${q}%' OR address ILIKE '%${q}%'
           ORDER BY open_deals_count DESC NULLS LAST, id DESC`,
          4
        ),
        execReadonlySql(
          caller,
          `SELECT id, name, org_name, primary_email, primary_phone, owner_name FROM persons
           WHERE name ILIKE '%${q}%' OR org_name ILIKE '%${q}%' OR emails_json::text ILIKE '%${q}%'
           ORDER BY id DESC`,
          4
        ),
        execReadonlySql(
          caller,
          `SELECT slug, canonical_path, title, category, direct_answer, seo_score FROM blog_posts
           WHERE title ILIKE '%${q}%' OR direct_answer ILIKE '%${q}%' OR slug ILIKE '%${q}%'
           ORDER BY seo_score DESC, id DESC`,
          4
        ),
      ]);

      const baseSite = "https://target-relocation-crm-production.up.railway.app";
      const results: Array<{ id: string; title: string; url: string; text: string }> = [];

      for (const d of dealsRes.rows) {
        results.push({
          id: `deal:${d.id}`,
          title: `Negócio #${d.id}: ${d.title}`,
          url: `${baseSite}/crm?deal=${d.id}`,
          text: `Empresa: ${d.org_name || "—"} | Contato: ${d.person_name || "—"} | Etapa: ${d.stage_name || "—"} | Status: ${d.status} | Dono: ${d.owner_name || "—"} | Score: ${d.score ?? "—"} | Valor: R$ ${d.value ?? 0}`,
        });
      }
      for (const o of orgsRes.rows) {
        results.push({
          id: `org:${o.id}`,
          title: `Empresa #${o.id}: ${o.name}`,
          url: `${baseSite}/crm?tab=organizations`,
          text: `Endereço: ${o.address || "—"} | Dono: ${o.owner_name || "—"} | Negócios abertos: ${o.open_deals_count ?? 0}`,
        });
      }
      for (const p of personsRes.rows) {
        results.push({
          id: `person:${p.id}`,
          title: `Pessoa #${p.id}: ${p.name}`,
          url: `${baseSite}/crm?tab=people`,
          text: `Empresa: ${p.org_name || "—"} | E-mail: ${p.primary_email || "—"} | Tel: ${p.primary_phone || "—"} | Dono: ${p.owner_name || "—"}`,
        });
      }
      for (const b of blogRes.rows) {
        const path = String(b.canonical_path || `/${b.slug}`);
        results.push({
          id: `blog:${b.slug}`,
          title: `Artigo Blog: ${b.title}`,
          url: `${baseSite}${path}`,
          text: `[${b.category || "Blog"} • Yoast SEO ${b.seo_score}/100] ${b.direct_answer || ""}`,
        });
      }

      return { text: JSON.stringify({ results }) };
    }

    if (name === "fetch") {
      const rawId = String(args.id || "").trim();
      const baseSite = "https://target-relocation-crm-production.up.railway.app";
      const [prefix, rest] = rawId.includes(":") ? [rawId.split(":")[0], rawId.slice(rawId.indexOf(":") + 1)] : ["", rawId];

      if (prefix === "deal") {
        const idNum = Number(rest);
        const res = await executeMcpTool(caller, "get_deal_dossier", { deal_id: idNum });
        return {
          text: JSON.stringify({
            id: rawId,
            title: `Dossiê Negócio #${idNum}`,
            url: `${baseSite}/crm?deal=${idNum}`,
            text: res.text,
          }),
        };
      }

      if (prefix === "org") {
        const idNum = Math.floor(Number(rest));
        const [orgRes, dealsRes, peopleRes] = await Promise.all([
          execReadonlySql(caller, `SELECT * FROM organizations WHERE id = ${idNum}`, 1),
          execReadonlySql(caller, `SELECT id, title, stage_name, status, value, owner_name FROM deals WHERE org_id = ${idNum} ORDER BY id DESC`, 20),
          execReadonlySql(caller, `SELECT id, name, primary_email, primary_phone, emails_json, phones_json FROM persons WHERE org_id = ${idNum}`, 20),
        ]);
        return {
          text: JSON.stringify({
            id: rawId,
            title: `Empresa #${idNum}: ${orgRes.rows[0]?.name || ""}`,
            url: `${baseSite}/crm?tab=organizations`,
            text: JSON.stringify({ organization: orgRes.rows[0] || null, deals: dealsRes.rows, persons: peopleRes.rows }, null, 2),
          }),
        };
      }

      if (prefix === "person") {
        const idNum = Math.floor(Number(rest));
        const [pRes, dealsRes] = await Promise.all([
          execReadonlySql(caller, `SELECT * FROM persons WHERE id = ${idNum}`, 1),
          execReadonlySql(caller, `SELECT id, title, stage_name, status, value FROM deals WHERE person_id = ${idNum} ORDER BY id DESC`, 20),
        ]);
        return {
          text: JSON.stringify({
            id: rawId,
            title: `Contato #${idNum}: ${pRes.rows[0]?.name || ""}`,
            url: `${baseSite}/crm?tab=people`,
            text: JSON.stringify({ person: pRes.rows[0] || null, deals: dealsRes.rows }, null, 2),
          }),
        };
      }

      if (prefix === "blog") {
        const safeSlug = escapeSqlLiteral(rest);
        const bRes = await execReadonlySql(
          caller,
          `SELECT id, slug, canonical_path, en_slug, es_slug, title, category, focus_keyword, seo_title, seo_description, seo_score, readability_score, direct_answer, content_markdown, faq_schema_json, author_name, published_at, updated_at FROM blog_posts WHERE slug = '${safeSlug}'`,
          1
        );
        const row = bRes.rows[0] || null;
        return {
          text: JSON.stringify({
            id: rawId,
            title: String(row?.title || safeSlug),
            url: `${baseSite}${row?.canonical_path || `/${safeSlug}`}`,
            text: JSON.stringify(row, null, 2),
          }),
        };
      }

      if (prefix === "table" && ALLOWED_MCP_TABLES.has(rest)) {
        const rowsRes = await execReadonlySql(caller, `SELECT * FROM public.${rest} ORDER BY 1 DESC`, 25);
        return {
          text: JSON.stringify({
            id: rawId,
            title: `Tabela ${rest}`,
            url: `${baseSite}/crm`,
            text: JSON.stringify(rowsRes, null, 2),
          }),
        };
      }

      return { isError: true, text: `ID '${rawId}' não reconhecido para fetch.` };
    }

    return { isError: true, text: `Ferramenta MCP desconhecida: ${name}` };
  } catch (err) {
    return { isError: true, text: err instanceof Error ? err.message : String(err) };
  }
}

export const MCP_RESOURCES_LIST = [
  {
    uri: "target://schema",
    name: "Database Schema (30 Tables)",
    description: "Estrutura completa do banco Postgres Supabase da Target Relocation (CRM, Radar DOU, Blog & Plano 30d).",
    mimeType: "application/json",
  },
  {
    uri: "target://overview",
    name: "Workspace Live Overview",
    description: "Resumo executivo em tempo real com KPIs do CRM, Placar SDR, Meta 30d e Yoast SEO.",
    mimeType: "application/json",
  },
];

export async function readMcpResource(caller: McpCallerContext, uri: string) {
  if (uri === "target://schema") {
    const tables = await getDatabaseSchema(caller);
    return [{ uri, mimeType: "application/json", text: JSON.stringify({ tables }, null, 2) }];
  }
  if (uri === "target://overview") {
    const data = await getWorkspaceOverviewData(caller);
    return [{ uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) }];
  }
  throw new Error(`Resource não encontrado: ${uri}`);
}
