"use client";

import { useCrmFetch, useCrmRead } from "@/lib/crm-cache";

import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderSync,
  Image as ImageIcon,
  RefreshCw,
  UploadCloud,
  Webhook,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import type { FileRecord } from "./types";
import { formatBytes, formatDate } from "./utils";

interface ImportPayload {
  lastSyncAt: string | null;
  auditedFiles: Array<{
    id: number;
    filename: string;
    relative_path: string;
    file_format: string;
    file_size: number;
    records_count: number;
    entity_target: string;
    sha256: string | null;
    status: string;
    imported_at: string;
  }>;
  webhooks: Array<{
    id: number;
    name: string;
    event_action: string;
    event_object: string;
    subscription_url: string;
    is_active: number;
    last_http_status: string | null;
    last_delivery_time: string | null;
  }>;
  savedFilters: Array<{
    id: number;
    name: string;
    type: string;
    last_used_time: string | null;
  }>;
  backupLog: string;
}

interface ImportCenterViewProps {
  onOpenDeal: (dealId: number) => void;
}

export function ImportCenterView({ onOpenDeal }: ImportCenterViewProps) {
  const crmFetch = useCrmFetch();
  const readImport = useCrmRead();
  const readFiles = useCrmRead();
  const [data, setData] = useState<ImportPayload | null>(null);
  const [localFiles, setLocalFiles] = useState<FileRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadAll() {
    await Promise.all([
      readImport("/api/import", setData),
      readFiles("/api/files?only_local=true&limit=100", data => setLocalFiles(data.files || [])),
    ]);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleResync() {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await crmFetch("/api/import", { method: "POST" });
      const json = await res.json();
      if (json.success && json.summary) {
        const c = json.summary.counts;
        setBanner(
          `Sincronização concluída em ${(json.summary.durationMs / 1000).toFixed(2)}s: ${c.deals} negócios, ${c.organizations} organizações, ${c.persons} pessoas, ${c.notes} notas, ${c.activities} atividades, ${c.auditedFiles} arquivos auditados.`
        );
      }
      await loadAll();
    } finally {
      setSyncing(false);
    }
  }

  async function handleUpload(filesList: FileList | null) {
    if (!filesList || filesList.length === 0) return;
    setUploading(true);
    setBanner(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(filesList)) {
        fd.append("files", f);
      }
      const res = await crmFetch("/api/import", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success && Array.isArray(json.results)) {
        setBanner(json.results.map((r: { details: string }) => r.details).join(" | "));
      }
      await loadAll();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const filteredAudit = (data?.auditedFiles || []).filter((f) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      f.filename.toLowerCase().includes(q) ||
      f.relative_path.toLowerCase().includes(q) ||
      f.entity_target.toLowerCase().includes(q) ||
      f.file_format.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderSync className="h-6 w-6 text-primary" />
            Central de Importação, Documentos & Automação
          </h1>
          <p className="text-sm text-muted-foreground">
            Todos os arquivos da pasta `backup_pipedrive/` + upload direto de CSV, JSON, XLSX, PDF, PNG ou ZIP
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.json,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.zip"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {uploading ? "Importando..." : "Importar Novos Arquivos"}
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" disabled={syncing} onClick={handleResync}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Re-sincronizar Pasta"}
          </Button>
        </div>
      </div>

      {banner && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Importação Concluída</AlertTitle>
          <AlertDescription className="text-xs">{banner}</AlertDescription>
        </Alert>
      )}

      {/* Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-card/30"
      >
        <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <div className="text-sm font-medium">
          Arraste arquivos CSV, JSON, XLSX, PDF, PNG ou ZIP aqui para importar no CRM
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Última sincronização da pasta local: {formatDate(data?.lastSyncAt)}
        </div>
      </div>

      <Tabs defaultValue="gallery" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="gallery">Anexos Físicos ({localFiles.length})</TabsTrigger>
          <TabsTrigger value="audit">Auditoria da Pasta ({data?.auditedFiles.length || 0} arquivos)</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks n8n ({data?.webhooks.length || 0})</TabsTrigger>
          <TabsTrigger value="filters">Filtros Pipedrive ({data?.savedFilters.length || 0})</TabsTrigger>
          <TabsTrigger value="log">backup-log.txt</TabsTrigger>
        </TabsList>

        {/* GALERIA DE ANEXOS FÍSICOS */}
        <TabsContent value="gallery" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {localFiles.map((f) => {
              const name = f.name || f.local_filename || `Arquivo #${f.id}`;
              const isImg = /\.(png|jpg|jpeg|webp)$/i.test(f.local_filename || name);
              const isPdf = /\.pdf$/i.test(f.local_filename || name);
              return (
                <Card key={f.id} className="overflow-hidden flex flex-col justify-between">
                  <div>
                    {isImg && (
                      <div className="h-44 bg-black/30 border-b border-border overflow-hidden flex items-center justify-center">
                        <img
                          src={`/api/files/${f.id}`}
                          alt={name}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isPdf ? (
                            <FileText className="h-4 w-4 text-rose-400 shrink-0" />
                          ) : isImg ? (
                            <ImageIcon className="h-4 w-4 text-sky-400 shrink-0" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                          )}
                          <CardTitle className="text-xs truncate">{name}</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          #{f.id}
                        </Badge>
                      </div>
                      <CardDescription className="text-[11px] truncate">
                        {f.deal_name || f.org_name || f.person_name || "Sem vínculo direto"}
                      </CardDescription>
                    </CardHeader>
                  </div>
                  <CardContent className="pt-0 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-muted-foreground">{formatBytes(f.file_size)}</span>
                    <div className="flex items-center gap-1.5">
                      {f.deal_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] px-2"
                          onClick={() => onOpenDeal(f.deal_id!)}
                        >
                          Deal #{f.deal_id}
                        </Button>
                      )}
                      <a
                        href={`/api/files/${f.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonVariants({ size: "sm", variant: "outline", className: "h-7 text-[11px]" })}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Abrir
                      </a>
                      <a
                        href={`/api/files/${f.id}?download=1`}
                        className={buttonVariants({ size: "sm", variant: "secondary", className: "h-7 text-[11px]" })}
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* AUDITORIA DE TODOS OS ARQUIVOS */}
        <TabsContent value="audit" className="space-y-3">
          <Input
            placeholder="Filtrar arquivos por nome, formato (CSV, JSON, XLSX, PDF, PNG) ou tabela..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            className="h-8 max-w-md text-xs"
          />
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Destino no CRM</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudit.map((af) => (
                    <TableRow key={af.id}>
                      <TableCell className="max-w-[260px]">
                        <div className="font-medium text-xs truncate">{af.filename}</div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{af.relative_path}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {af.file_format}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono whitespace-nowrap">{formatBytes(af.file_size)}</TableCell>
                      <TableCell className="text-xs max-w-[180px]">
                        <span className="inline-flex items-center gap-1 max-w-full truncate">
                          <Database className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{af.entity_target}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {af.records_count.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                          {af.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* WEBHOOKS */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-4 w-4 text-primary" />
                Automações & Webhooks Conectados (n8n / Integry)
              </CardTitle>
              <CardDescription>
                Integrações responsáveis por enriquecimento CNPJ, geração de scripts de ligação, e-mails IA e entrada de cadência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {(data?.webhooks || []).map((wh) => (
                <div key={wh.id} className="p-3 rounded-lg border border-border bg-card/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{wh.name}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {wh.event_object}.{wh.event_action}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          wh.last_http_status === "200"
                            ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300"
                        }`}
                      >
                        HTTP {wh.last_http_status || "—"}
                      </Badge>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground break-all">{wh.subscription_url}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Último disparo: {formatDate(wh.last_delivery_time)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAVED FILTERS */}
        <TabsContent value="filters">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Filtros Operacionais Salvos no Pipedrive ({data?.savedFilters.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              {(data?.savedFilters || []).map((fl) => (
                <div key={fl.id} className="p-2.5 rounded-md border border-border flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{fl.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {fl.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BACKUP LOG */}
        <TabsContent value="log">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">backup-log.txt (Log Original de Extração)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono whitespace-pre-wrap p-4 rounded-lg bg-black/40 border border-border overflow-x-auto">
                {data?.backupLog || "Log não encontrado."}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
