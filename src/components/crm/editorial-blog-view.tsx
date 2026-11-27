"use client";

import { useCrmFetch, useCrmRead } from "@/lib/crm-cache";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Briefcase,
  Calendar,
  Camera,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Film,
  Loader2,
  PhoneCall,
  PlayCircle,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlogYoastSeoTab, type BlogPostYoastItem } from "@/components/crm/blog-yoast-seo-tab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface EditorialItem {
  id: number;
  scheduled_date: string;
  day_label: string;
  weekday: string;
  format: string;
  topic: string;
  video_plan: string;
  approval_status: string;
  technical_reviewed: boolean;
  blog_post_id: number | null;
  linkedin_klaus_post: string | null;
  linkedin_first_comment: string | null;
  linkedin_target_repost: string | null;
  carousel_slides_json: Array<{ slide: number; headline: string; body: string }>;
  instagram_caption: string | null;
  instagram_stories_json: string[];
  heygen_script: string | null;
  reels_shorts_cuts_json: Array<{ title: string; hook: string; script: string }>;
  youtube_metadata_json: { title?: string; description?: string; chapters?: string[] };
  sdr_call_angle: string | null;
  utm_campaign: string | null;
  approved_by: string | null;
  notes: string | null;
}

type BlogPostItem = BlogPostYoastItem;

const WEEKLY_MATRIX = [
  { day: "Segunda", blog: "News regulatória / DOU", linkedin: "Post do Klaus", target: "Repost", insta: "Stories", yt: "Short da notícia" },
  { day: "Terça", blog: "—", linkedin: "—", target: "Repost sexta", insta: "Carrossel notícia", yt: "—" },
  { day: "Quarta", blog: "Serviço em FAQ (GEO)", linkedin: "Post do FAQ", target: "Repost", insta: "—", yt: "Vídeo avatar (3-5 min)" },
  { day: "Quinta", blog: "—", linkedin: "—", target: "Vídeo do avatar", insta: "Reels do vídeo", yt: "Shorts do FAQ" },
  { day: "Sexta", blog: "Institucional / Case prova", linkedin: "Bastidor / opinião", target: "Repost", insta: "Carrossel do tema", yt: "Short do tema" },
];

export function EditorialBlogView({ onOpenAiSettings }: { onOpenAiSettings: () => void }) {
  const crmFetch = useCrmFetch();
  const readCrm = useCrmRead();
  const [items, setItems] = useState<EditorialItem[]>([]);
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<EditorialItem | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [banner, setBanner] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newDate, setNewDate] = useState("2026-11-23");
  const [newFormat, setNewFormat] = useState("News");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await readCrm("/api/editorial", json => {
        setItems(json.items || []);
        setPosts(json.posts || []);
        setAiConfigured(Boolean(json.aiConfigured));
      });
    } finally {
      setLoading(false);
    }
  }, [readCrm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function generateAiPack(item: EditorialItem) {
    setGeneratingId(item.id);
    setBanner(null);
    try {
      const res = await crmFetch("/api/editorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_ai", id: item.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.aiRequired) onOpenAiSettings();
        setBanner(json.error || "Erro ao gerar conteúdo IA");
        return;
      }
      setBanner(`Pacote 1→4 gerado via OpenAI para "${item.topic}"! Enviado para Fila de Aprovação.`);
      await loadData();
      if (json.item) setSelectedItem(json.item);
    } finally {
      setGeneratingId(null);
    }
  }

  async function approveItem(id: number) {
    const res = await crmFetch("/api/editorial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id }),
    });
    if (res.ok) {
      setBanner("Pauta e artigo aprovados pelo Klaus!");
      await loadData();
    }
  }

  async function approveBatch() {
    const res = await crmFetch("/api/editorial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve_batch" }),
    });
    const json = await res.json();
    setBanner(`${json.approvedCount || 0} item(ns) aprovados em lote!`);
    await loadData();
  }

  async function publishItem(id: number) {
    const res = await crmFetch("/api/editorial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBanner(json.error || "Erro ao publicar");
      return;
    }
    setBanner("Artigo publicado ao vivo em /blog com FAQ Schema (JSON-LD)!");
    await loadData();
  }

  async function createPauta() {
    if (!newTopic.trim()) return;
    await crmFetch("/api/editorial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        topic: newTopic.trim(),
        scheduled_date: newDate,
        format: newFormat,
        video_plan: newFormat === "Serviço em FAQ" ? "YouTube + Shorts" : "Short",
      }),
    });
    setNewOpen(false);
    setNewTopic("");
    await loadData();
  }

  async function saveSelectedDetails() {
    if (!selectedItem) return;
    await crmFetch("/api/editorial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: selectedItem.id,
        linkedin_klaus_post: selectedItem.linkedin_klaus_post,
        linkedin_first_comment: selectedItem.linkedin_first_comment,
        heygen_script: selectedItem.heygen_script,
        instagram_caption: selectedItem.instagram_caption,
        sdr_call_angle: selectedItem.sdr_call_angle,
        technical_reviewed: selectedItem.technical_reviewed,
        youtube_embed_url: youtubeUrl || undefined,
      }),
    });
    setBanner("Alterações salvas no Supabase!");
    await loadData();
  }

  const filteredItems = items.filter((i) => statusFilter === "all" || i.approval_status === statusFilter);
  const pendingApprovalCount = items.filter((i) => i.approval_status === "Para Aprovar").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="size-6 text-primary" />
            Blog GEO/SEO & Calendário Editorial (1 → 4 Canais)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Cronograma Seg/Qua/Sex (Nov/2026–Fev/2027) • Automação OpenAI com aprovação humana obrigatória pelo Klaus
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/blog"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium hover:bg-accent"
          >
            <ExternalLink className="size-3.5" />
            Abrir Blog Público
          </a>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={approveBatch}>
            <CheckCheck className="size-3.5 text-emerald-500" />
            Aprovar Lote Sexta ({pendingApprovalCount})
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setNewOpen(true)}>
            <Plus className="size-3.5" />
            Nova Pauta (News)
          </Button>
        </div>
      </div>

      {banner && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs flex items-center justify-between">
          <span>{banner}</span>
          {!aiConfigured && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onOpenAiSettings}>
              Configurar OpenAI
            </Button>
          )}
        </div>
      )}

      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calendar">24 Pautas & Produção ({items.length})</TabsTrigger>
          <TabsTrigger value="weekly">Grade Semanal Fixa (Seg–Sex)</TabsTrigger>
          <TabsTrigger value="blog">Artigos Blog & Yoast SEO ({posts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue>{statusFilter === "all" ? "Todos Status" : statusFilter}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="Ideia">Ideia</SelectItem>
                <SelectItem value="Em Revisão Técnica">Em Revisão Técnica</SelectItem>
                <SelectItem value="Para Aprovar">Para Aprovar (Klaus)</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Publicado">Publicado</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              Regra de conteúdo: nunca fazer parecer simples, rápido ou garantido; citar Ministério do Trabalho (MTE).
            </div>
          </div>

          <div className="grid gap-3">
            {loading ? (
              <Card><CardContent className="p-6 text-xs text-muted-foreground">Carregando pautas do Supabase...</CardContent></Card>
            ) : (
              filteredItems.map((item) => (
                <Card key={item.id} className="hover:border-foreground/20 transition-colors">
                  <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          <Calendar className="size-3 mr-1" />
                          {item.day_label} ({item.weekday})
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{item.format}</Badge>
                        <Badge variant="outline" className="text-[10px]">{item.video_plan}</Badge>
                        <Badge
                          variant={item.approval_status === "Publicado" ? "default" : "outline"}
                          className={`text-[10px] ${
                            item.approval_status === "Publicado"
                              ? "bg-emerald-600 text-white"
                              : item.approval_status === "Aprovado"
                                ? "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300"
                                : item.approval_status === "Para Aprovar"
                                  ? "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300"
                                  : ""
                          }`}
                        >
                          {item.approval_status}
                        </Badge>
                        {item.technical_reviewed && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
                          >
                            Rev. Técnica OK
                          </Badge>
                        )}
                      </div>
                      <div className="font-semibold text-sm">{item.topic}</div>
                      {item.notes && <div className="text-[11px] text-muted-foreground">{item.notes}</div>}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5"
                        disabled={generatingId === item.id}
                        onClick={() => generateAiPack(item)}
                      >
                        {generatingId === item.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5 text-amber-500" />
                        )}
                        {generatingId === item.id ? "Gerando..." : "Gerar IA 1→4"}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => {
                          setSelectedItem(item);
                          const linkedPost = posts.find((p) => p.id === item.blog_post_id);
                          setYoutubeUrl(linkedPost?.youtube_embed_url || "");
                        }}
                      >
                        Inspecionar Saídas
                      </Button>

                      {(item.approval_status === "Para Aprovar" || item.approval_status === "Ideia" || item.approval_status === "Em Revisão Técnica") && (
                        <Button size="sm" variant="secondary" className="h-8 text-xs gap-1" onClick={() => approveItem(item.id)}>
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                          Aprovar
                        </Button>
                      )}

                      {item.approval_status === "Aprovado" && (
                        <Button size="sm" className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => publishItem(item.id)}>
                          <Send className="size-3.5" />
                          Publicar Blog
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fluxo Semanal: 1 Artigo no Blog → Todos os Canais</CardTitle>
              <CardDescription className="text-xs">
                Quarta (Serviço em FAQ técnico revisado) e Sexta (Institucional como prova) + Segunda (News DOU/MTE).
                Aprovação humana em lote toda sexta-feira.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3">Dia</th>
                    <th className="py-2 pr-3">Blog (GEO/SEO)</th>
                    <th className="py-2 pr-3">LinkedIn do Klaus</th>
                    <th className="py-2 pr-3">Página Target</th>
                    <th className="py-2 pr-3">Instagram</th>
                    <th className="py-2">YouTube</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {WEEKLY_MATRIX.map((r) => (
                    <tr key={r.day}>
                      <td className="py-3 pr-3 font-semibold">{r.day}</td>
                      <td className="py-3 pr-3">{r.blog}</td>
                      <td className="py-3 pr-3">{r.linkedin}</td>
                      <td className="py-3 pr-3">{r.target}</td>
                      <td className="py-3 pr-3">{r.insta}</td>
                      <td className="py-3">{r.yt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blog">
          <BlogYoastSeoTab
            posts={posts}
            aiConfigured={aiConfigured}
            onOpenAiSettings={onOpenAiSettings}
            onReload={loadData}
          />
        </TabsContent>
      </Tabs>

      {/* Inspector Modal for 1->4 Channel Deliverables */}
      <Dialog open={selectedItem !== null} onOpenChange={(o) => !o && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{selectedItem.topic}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-xs py-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-muted/30">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedItem.technical_reviewed}
                      onCheckedChange={(v) =>
                        setSelectedItem({ ...selectedItem, technical_reviewed: Boolean(v) })
                      }
                    />
                    <span className="font-medium">Revisão Técnica Concluída (MTE / Compliance)</span>
                  </label>
                  <Badge variant="outline" className="font-mono">{selectedItem.utm_campaign || "utm"}</Badge>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Briefcase className="size-3.5 text-sky-500" /> Post Perfil Klaus (sem link no corpo)
                  </Label>
                  <Textarea
                    rows={4}
                    value={selectedItem.linkedin_klaus_post || ""}
                    onChange={(e) => setSelectedItem({ ...selectedItem, linkedin_klaus_post: e.target.value })}
                    placeholder="Clique em 'Gerar IA 1→4' ou escreva o post autoral do Klaus..."
                    className="text-xs"
                  />
                  <Label className="text-[11px] text-muted-foreground">1º Comentário do LinkedIn (Link UTM)</Label>
                  <Input
                    value={selectedItem.linkedin_first_comment || ""}
                    onChange={(e) => setSelectedItem({ ...selectedItem, linkedin_first_comment: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Camera className="size-3.5 text-pink-500" /> Instagram Legenda & Carrossel (6–8 telas)
                  </Label>
                  <Textarea
                    rows={3}
                    value={selectedItem.instagram_caption || ""}
                    onChange={(e) => setSelectedItem({ ...selectedItem, instagram_caption: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Film className="size-3.5 text-amber-500" /> Roteiro Avatar Klaus (HeyGen 3–5 min)
                  </Label>
                  <Textarea
                    rows={4}
                    value={selectedItem.heygen_script || ""}
                    onChange={(e) => setSelectedItem({ ...selectedItem, heygen_script: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <PlayCircle className="size-3.5 text-rose-500" /> Volta ao Blog: URL do Vídeo YouTube (embutido no artigo)
                  </Label>
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <PhoneCall className="size-3.5 text-emerald-500" /> Argumento de Ligação para SDRs (Áurea & Anderley)
                  </Label>
                  <Textarea
                    rows={2}
                    value={selectedItem.sdr_call_angle || ""}
                    onChange={(e) => setSelectedItem({ ...selectedItem, sdr_call_angle: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>Fechar</Button>
                <Button size="sm" onClick={saveSelectedDetails}>Salvar Edições</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Editorial Item Modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pauta Editorial (News / FAQ / Case)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Tema / Pergunta Principal *</Label>
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="Ex: Mudança de prazo do MTE para autorizações RN 02/2017"
                className="mt-1 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data Programada</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="mt-1 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Formato</Label>
                <Select value={newFormat} onValueChange={(v) => setNewFormat(v || "News")}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue>{newFormat}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="News">News (Segunda)</SelectItem>
                    <SelectItem value="Serviço em FAQ">Serviço em FAQ (Quarta)</SelectItem>
                    <SelectItem value="Institucional">Institucional (Sexta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={createPauta} disabled={!newTopic.trim()}>Adicionar Pauta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
