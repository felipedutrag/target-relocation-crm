"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { analyzeArticleSeo, type SeoCheckStatus, type SeoGrade } from "@/lib/seo-analyzer";

export interface BlogPostYoastItem {
  id: number;
  slug: string;
  en_slug: string | null;
  es_slug: string | null;
  canonical_path: string | null;
  title: string;
  question_headline: string;
  direct_answer: string;
  pillar: string;
  category: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  focus_keyword: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_score: number;
  readability_score: number;
  seo_grade: string;
  word_count: number;
  reading_time_min: number;
  status: string;
  technical_reviewed: boolean;
  youtube_embed_url: string | null;
  author_name: string;
  published_at: string | null;
  updated_at: string;
  source_url: string | null;
}

interface FullBlogPost extends BlogPostYoastItem {
  content_html: string | null;
  content_markdown: string;
  faq_schema_json: Array<{ question: string; answer: string }>;
}

const PAGE_SIZE = 24;

function getGradeDotClass(status: SeoCheckStatus | SeoGrade): string {
  if (status === "good") return "bg-emerald-500";
  if (status === "ok") return "bg-amber-500";
  return "bg-rose-500";
}

function getGradeBadgeClass(grade: string): string {
  if (grade === "good") return "border-emerald-500/30 bg-emerald-500/15 text-emerald-500";
  if (grade === "ok") return "border-amber-500/30 bg-amber-500/15 text-amber-500";
  return "border-rose-500/30 bg-rose-500/15 text-rose-500";
}

function getGradeLabel(grade: string): string {
  if (grade === "good") return "SEO Bom";
  if (grade === "ok") return "Regular";
  return "Melhorar";
}

export function BlogYoastSeoTab({
  posts,
  aiConfigured,
  onOpenAiSettings,
  onReload,
}: {
  posts: BlogPostYoastItem[];
  aiConfigured: boolean;
  onOpenAiSettings: () => void;
  onReload: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);

  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [optimizingAi, setOptimizingAi] = useState(false);
  const [serpDevice, setSerpDevice] = useState<"desktop" | "mobile">("desktop");
  const [modalNotice, setModalNotice] = useState<string | null>(null);

  const [editingPost, setEditingPost] = useState<FullBlogPost | null>(null);
  const [focusKeyword, setFocusKeyword] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [featuredAlt, setFeaturedAlt] = useState("");
  const [directAnswer, setDirectAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [enSlug, setEnSlug] = useState("");
  const [esSlug, setEsSlug] = useState("");
  const [postStatus, setPostStatus] = useState("published");
  const [techReviewed, setTechReviewed] = useState(true);
  const [faqSchema, setFaqSchema] = useState<Array<{ question: string; answer: string }>>([]);

  const stats = useMemo(() => {
    const total = posts.length;
    const good = posts.filter((p) => p.seo_grade === "good").length;
    const ok = posts.filter((p) => p.seo_grade === "ok").length;
    const bad = posts.filter((p) => p.seo_grade === "needs_improvement").length;
    const avgSeo = total > 0 ? Math.round(posts.reduce((acc, p) => acc + (p.seo_score || 0), 0) / total) : 0;
    const avgRead =
      total > 0 ? Math.round(posts.reduce((acc, p) => acc + (p.readability_score || 0), 0) / total) : 0;
    return { total, good, ok, bad, avgSeo, avgRead };
  }, [posts]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) {
      const cat = p.category || "Sem categoria";
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const filtered = useMemo(() => {
    const list = posts.filter((p) => {
      if (gradeFilter !== "all" && p.seo_grade !== gradeFilter) return false;
      if (categoryFilter !== "all" && (p.category || "Sem categoria") !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.focus_keyword || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
        );
      }
      return true;
    });

    if (sortBy === "seo_asc") {
      return [...list].sort((a, b) => (a.seo_score || 0) - (b.seo_score || 0));
    }
    if (sortBy === "seo_desc") {
      return [...list].sort((a, b) => (b.seo_score || 0) - (a.seo_score || 0));
    }
    if (sortBy === "read_asc") {
      return [...list].sort((a, b) => (a.readability_score || 0) - (b.readability_score || 0));
    }
    return list;
  }, [posts, gradeFilter, categoryFilter, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePosts = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function openYoastInspector(post: BlogPostYoastItem) {
    setInspectorOpen(true);
    setModalNotice(null);
    setLoadingDetail(true);
    setEditingPost({
      ...post,
      content_html: null,
      content_markdown: post.direct_answer,
      faq_schema_json: [],
    });
    setFocusKeyword(post.focus_keyword || "");
    setSeoTitle(post.seo_title || post.title);
    setSeoDescription(post.seo_description || post.direct_answer.slice(0, 155));
    setFeaturedAlt(post.featured_image_alt || "");
    setDirectAnswer(post.direct_answer || "");
    setCategory(post.category || "Imigração Corporativa");
    setEnSlug(post.en_slug || "");
    setEsSlug(post.es_slug || "");
    setPostStatus(post.status || "published");
    setTechReviewed(Boolean(post.technical_reviewed));
    setFaqSchema([]);

    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(post.slug)}?scope=all`);
      const json = await res.json();
      if (res.ok && json.post) {
        const full = json.post as FullBlogPost;
        setEditingPost(full);
        setFocusKeyword(full.focus_keyword || "");
        setSeoTitle(full.seo_title || full.title);
        setSeoDescription(full.seo_description || full.direct_answer.slice(0, 155));
        setFeaturedAlt(full.featured_image_alt || "");
        setDirectAnswer(full.direct_answer || "");
        setCategory(full.category || "Imigração Corporativa");
        setEnSlug(full.en_slug || "");
        setEsSlug(full.es_slug || "");
        setPostStatus(full.status || "published");
        setTechReviewed(Boolean(full.technical_reviewed));
        setFaqSchema(Array.isArray(full.faq_schema_json) ? full.faq_schema_json : []);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  const liveAnalysis = useMemo(() => {
    if (!editingPost) return null;
    return analyzeArticleSeo({
      slug: editingPost.slug,
      title: editingPost.title,
      question_headline: editingPost.question_headline,
      seo_title: seoTitle,
      seo_description: seoDescription,
      focus_keyword: focusKeyword,
      direct_answer: directAnswer,
      content_html: editingPost.content_html,
      content_markdown: editingPost.content_markdown,
      featured_image_url: editingPost.featured_image_url,
      featured_image_alt: featuredAlt,
      faq_schema_json: faqSchema,
      author_name: editingPost.author_name,
    });
  }, [editingPost, focusKeyword, seoTitle, seoDescription, directAnswer, featuredAlt, faqSchema]);

  async function optimizeWithAi() {
    if (!editingPost) return;
    if (!aiConfigured) {
      onOpenAiSettings();
      return;
    }
    setOptimizingAi(true);
    setModalNotice(null);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(editingPost.slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "optimize_seo" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setModalNotice(json.error || "Erro ao otimizar com OpenAI.");
        return;
      }
      const s = json.suggested || {};
      if (s.focus_keyword) setFocusKeyword(String(s.focus_keyword));
      if (s.seo_title) setSeoTitle(String(s.seo_title));
      if (s.seo_description) setSeoDescription(String(s.seo_description));
      if (s.featured_image_alt) setFeaturedAlt(String(s.featured_image_alt));
      if (s.direct_answer) setDirectAnswer(String(s.direct_answer));
      if (Array.isArray(s.faq_schema_json)) setFaqSchema(s.faq_schema_json);
      setModalNotice("Sugestões Yoast & GEO geradas pela OpenAI! Revise no snippet e clique em 'Salvar SEO'.");
    } finally {
      setOptimizingAi(false);
    }
  }

  async function saveSeoChanges() {
    if (!editingPost) return;
    setSaving(true);
    setModalNotice(null);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(editingPost.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          focus_keyword: focusKeyword,
          seo_title: seoTitle,
          seo_description: seoDescription,
          featured_image_alt: featuredAlt,
          direct_answer: directAnswer,
          category,
          en_slug: enSlug || null,
          es_slug: esSlug || null,
          status: postStatus,
          technical_reviewed: techReviewed,
          faq_schema_json: faqSchema,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setModalNotice(json.error || "Erro ao salvar alterações.");
        return;
      }
      await onReload();
      setModalNotice("Alterações Yoast SEO salvas e pontuadas no Supabase!");
    } finally {
      setSaving(false);
    }
  }

  const titleLen = seoTitle.length;
  const descLen = seoDescription.length;

  return (
    <div className="space-y-4">
      {/* Yoast Summary KPI Bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card
          className={`cursor-pointer transition-colors ${gradeFilter === "all" ? "border-primary/40" : ""}`}
          onClick={() => {
            setGradeFilter("all");
            setPage(1);
          }}
        >
          <CardContent className="p-3.5">
            <div className="text-[11px] text-muted-foreground">Total de Artigos</div>
            <div className="mt-1 text-2xl font-bold font-mono">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Slugs & imagens preservados</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5">
            <div className="text-[11px] text-muted-foreground">Média Yoast SEO / Legib.</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono">{stats.avgSeo}/100</span>
              <span className="text-xs font-mono text-muted-foreground">• {stats.avgRead}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Score ponderado em 14 regras</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${gradeFilter === "good" ? "border-emerald-500/60 bg-emerald-500/5" : ""}`}
          onClick={() => {
            setGradeFilter("good");
            setPage(1);
          }}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              Semáforo Bom (≥ 75)
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-500">{stats.good}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Prontos para tráfego orgânico</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${gradeFilter === "ok" ? "border-amber-500/60 bg-amber-500/5" : ""}`}
          onClick={() => {
            setGradeFilter("ok");
            setPage(1);
          }}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-medium">
              <span className="size-2.5 rounded-full bg-amber-500" />
              Semáforo Regular (50–74)
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-500">{stats.ok}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Falta ALT, FAQ ou meta adjust</div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${gradeFilter === "needs_improvement" ? "border-rose-500/60 bg-rose-500/5" : ""}`}
          onClick={() => {
            setGradeFilter("needs_improvement");
            setPage(1);
          }}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-rose-500 font-medium">
              <span className="size-2.5 rounded-full bg-rose-500" />
              Precisa Melhorar (&lt; 50)
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-rose-500">{stats.bad}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Prioridade alta de otimização</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar artigo, slug, palavra-chave foco..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        <Select
          value={gradeFilter}
          onValueChange={(v) => {
            setGradeFilter(v || "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[170px] text-xs">
            <SelectValue>
              {gradeFilter === "all"
                ? "Todos Semáforos"
                : gradeFilter === "good"
                  ? "🟢 SEO Bom"
                  : gradeFilter === "ok"
                    ? "🟠 Regular"
                    : "🔴 Melhorar"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Semáforos</SelectItem>
            <SelectItem value="good">🟢 SEO Bom (≥ 75)</SelectItem>
            <SelectItem value="ok">🟠 Regular (50–74)</SelectItem>
            <SelectItem value="needs_improvement">🔴 Precisa Melhorar (&lt; 50)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v || "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[200px] text-xs">
            <SelectValue>{categoryFilter === "all" ? "Todas Categorias" : categoryFilter}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {categories.map(([cat, cnt]) => (
              <SelectItem key={cat} value={cat}>
                {cat} ({cnt})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v || "recent")}>
          <SelectTrigger className="h-8 w-[190px] text-xs">
            <SelectValue>
              {sortBy === "recent"
                ? "Mais recentes"
                : sortBy === "seo_asc"
                  ? "Menor SEO Score 1º"
                  : sortBy === "seo_desc"
                    ? "Maior SEO Score 1º"
                    : "Menor Legibilidade 1º"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="seo_asc">Menor SEO Score 1º (auditoria)</SelectItem>
            <SelectItem value="seo_desc">Maior SEO Score 1º</SelectItem>
            <SelectItem value="read_asc">Menor Legibilidade 1º</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Articles Yoast Cards Grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pagePosts.map((p) => {
          const publicUrl = p.canonical_path || `/${p.slug}`;
          return (
            <Card key={p.id} className="flex flex-col justify-between overflow-hidden hover:border-foreground/25 transition-colors">
              <div>
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted border-b border-border/60">
                  {p.featured_image_url ? (
                    <img
                      src={p.featured_image_url}
                      alt={p.featured_image_alt || p.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="size-7 opacity-40" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md bg-background/85 ${getGradeBadgeClass(p.seo_grade)}`}
                    >
                      <span className={`size-2 rounded-full ${getGradeDotClass(p.seo_grade as SeoGrade)}`} />
                      SEO {p.seo_score}/100
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono bg-background/85 backdrop-blur-md">
                      Legib. {p.readability_score}/100
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    <Badge variant="outline" className="truncate max-w-[165px]">
                      {p.category || p.pillar}
                    </Badge>
                    <span className="font-mono text-muted-foreground shrink-0">
                      {p.word_count || 0} palavras • {p.reading_time_min || 3}m
                    </span>
                  </div>
                  <CardTitle className="text-sm leading-snug line-clamp-2 pt-1">{p.title}</CardTitle>
                  <div className="font-mono text-[10px] text-muted-foreground truncate">
                    Foco: <span className="text-foreground">{p.focus_keyword || "—"}</span>
                  </div>
                </CardHeader>

                <CardContent className="pb-3 text-xs space-y-2">
                  <p className="text-muted-foreground line-clamp-2">{p.direct_answer}</p>
                </CardContent>
              </div>

              <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2 text-xs">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] gap-1.5 cursor-pointer"
                  onClick={() => openYoastInspector(p)}
                >
                  <SlidersHorizontal className="size-3 text-amber-500" />
                  Yoast SEO & Editar
                </Button>

                {p.status === "published" ? (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-500 hover:underline inline-flex items-center gap-1 text-[11px] font-medium truncate max-w-[165px]"
                    title={publicUrl}
                  >
                    <span className="truncate">{publicUrl}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-xs">
          <span className="font-mono text-muted-foreground">
            Exibindo {pagePosts.length} de {filtered.length} artigos • Página {safePage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Yoast SEO Live Inspector Dialog */}
      <Dialog open={inspectorOpen} onOpenChange={(o) => !o && setInspectorOpen(false)}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          {editingPost && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                  <div>
                    <DialogTitle className="text-base leading-snug">{editingPost.title}</DialogTitle>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Slug canônico: {editingPost.canonical_path || `/${editingPost.slug}`}
                      {editingPost.en_slug ? ` • EN: /en/${editingPost.en_slug}` : ""}
                    </div>
                  </div>
                  {liveAnalysis && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${getGradeBadgeClass(liveAnalysis.seoGrade)}`}
                      >
                        <span className={`size-2.5 rounded-full ${getGradeDotClass(liveAnalysis.seoGrade)}`} />
                        {getGradeLabel(liveAnalysis.seoGrade)}: {liveAnalysis.seoScore}/100
                      </span>
                      <Badge variant="outline" className="text-xs font-mono py-1">
                        Legibilidade: {liveAnalysis.readabilityScore}/100
                      </Badge>
                    </div>
                  )}
                </div>
              </DialogHeader>

              {loadingDetail && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Carregando HTML completo e FAQ Schema...</span>
                </div>
              )}

              {modalNotice && (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs">
                  {modalNotice}
                </div>
              )}

              <div className="space-y-5 text-xs">
                {/* Google SERP Preview */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                      Pré-visualização no Google (SERP Snippet)
                    </span>
                    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                      <button
                        type="button"
                        onClick={() => setSerpDevice("desktop")}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] cursor-pointer ${
                          serpDevice === "desktop" ? "bg-accent font-medium" : "text-muted-foreground"
                        }`}
                      >
                        <Monitor className="size-3" /> Desktop
                      </button>
                      <button
                        type="button"
                        onClick={() => setSerpDevice("mobile")}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] cursor-pointer ${
                          serpDevice === "mobile" ? "bg-accent font-medium" : "text-muted-foreground"
                        }`}
                      >
                        <Smartphone className="size-3" /> Mobile
                      </button>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg border border-border bg-background p-4 space-y-1 ${
                      serpDevice === "mobile" ? "max-w-[360px]" : "max-w-[640px]"
                    }`}
                  >
                    <div className="text-[11px] text-muted-foreground truncate">
                      targetrelocation.com.br › {editingPost.slug}
                    </div>
                    <div className="text-base font-medium text-sky-600 dark:text-sky-400 leading-snug line-clamp-1">
                      {seoTitle || editingPost.title}
                    </div>
                    <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {seoDescription || directAnswer}
                    </div>
                  </div>
                </div>

                {/* Editable Yoast Fields */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Palavra-chave foco (Focus Keyphrase)</Label>
                    <Input
                      value={focusKeyword}
                      onChange={(e) => setFocusKeyword(e.target.value)}
                      placeholder="Ex: visto chines para brasileiro"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Categoria</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Título SEO (ideal: 35–60 chars)</Label>
                    <span
                      className={`font-mono text-[10px] ${
                        titleLen >= 35 && titleLen <= 60
                          ? "text-emerald-500"
                          : titleLen >= 25 && titleLen <= 68
                            ? "text-amber-500"
                            : "text-rose-500"
                      }`}
                    >
                      {titleLen}/60 chars
                    </span>
                  </div>
                  <Input
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        titleLen >= 35 && titleLen <= 60
                          ? "bg-emerald-500"
                          : titleLen >= 25 && titleLen <= 68
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((titleLen / 65) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Meta Description (ideal: 115–160 chars)</Label>
                    <span
                      className={`font-mono text-[10px] ${
                        descLen >= 115 && descLen <= 160
                          ? "text-emerald-500"
                          : descLen >= 80 && descLen <= 175
                            ? "text-amber-500"
                            : "text-rose-500"
                      }`}
                    >
                      {descLen}/160 chars
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="text-xs"
                  />
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        descLen >= 115 && descLen <= 160
                          ? "bg-emerald-500"
                          : descLen >= 80 && descLen <= 175
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.round((descLen / 165) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Texto ALT da Imagem Destacada</Label>
                    <Input
                      value={featuredAlt}
                      onChange={(e) => setFeaturedAlt(e.target.value)}
                      placeholder="Descreva a imagem incluindo a palavra-chave foco..."
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Slug EN (/en/...)</Label>
                      <Input
                        value={enSlug}
                        onChange={(e) => setEnSlug(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Slug ES (/es/...)</Label>
                      <Input
                        value={esSlug}
                        onChange={(e) => setEsSlug(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Resposta Direta GEO (1º Parágrafo & Citações IA)</Label>
                  <Textarea
                    rows={3}
                    value={directAnswer}
                    onChange={(e) => setDirectAnswer(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 bg-muted/20">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={techReviewed} onCheckedChange={(v) => setTechReviewed(Boolean(v))} />
                    <span className="font-medium">Revisão Técnica Concluída (MTE / Compliance)</span>
                  </label>
                  <Select value={postStatus} onValueChange={(v) => setPostStatus(v || "published")}>
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue>{postStatus}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">published (Publicado)</SelectItem>
                      <SelectItem value="ready_for_approval">ready_for_approval</SelectItem>
                      <SelectItem value="draft">draft (Rascunho)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Full Yoast Checklist Breakdown */}
                {liveAnalysis && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border p-3.5 space-y-2.5">
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span>Análise SEO (10 critérios Yoast)</span>
                        <span className="font-mono text-muted-foreground">{liveAnalysis.seoScore}/100</span>
                      </div>
                      <div className="space-y-2">
                        {liveAnalysis.checks
                          .filter((c) => c.group === "seo")
                          .map((c) => (
                            <div key={c.id} className="flex items-start gap-2 text-[11px]">
                              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${getGradeDotClass(c.status)}`} />
                              <div>
                                <div className="font-medium text-foreground">
                                  {c.label} <span className="font-mono opacity-60">({c.score}/{c.maxScore})</span>
                                </div>
                                <div className="text-muted-foreground">{c.detail}</div>
                                {c.status !== "good" && (
                                  <div className="text-amber-500 mt-0.5">Sugestão: {c.hint}</div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-3.5 space-y-2.5">
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span>Análise de Legibilidade (4 critérios)</span>
                        <span className="font-mono text-muted-foreground">{liveAnalysis.readabilityScore}/100</span>
                      </div>
                      <div className="space-y-2">
                        {liveAnalysis.checks
                          .filter((c) => c.group === "readability")
                          .map((c) => (
                            <div key={c.id} className="flex items-start gap-2 text-[11px]">
                              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${getGradeDotClass(c.status)}`} />
                              <div>
                                <div className="font-medium text-foreground">
                                  {c.label} <span className="font-mono opacity-60">({c.score}/{c.maxScore})</span>
                                </div>
                                <div className="text-muted-foreground">{c.detail}</div>
                                {c.status !== "good" && (
                                  <div className="text-amber-500 mt-0.5">Sugestão: {c.hint}</div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>

                      <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>
                          FAQ Schema ativo: <strong>{faqSchema.length}</strong> pergunta(s) estruturada(s).
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={optimizingAi || loadingDetail}
                  onClick={optimizeWithAi}
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  {optimizingAi ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-amber-500" />}
                  {optimizingAi ? "Otimizando com GPT..." : "Otimizar SEO com OpenAI"}
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setInspectorOpen(false)}>
                    Fechar
                  </Button>
                  <Button type="button" size="sm" disabled={saving} onClick={saveSeoChanges} className="cursor-pointer">
                    {saving ? "Salvando..." : "Salvar Alterações SEO"}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
