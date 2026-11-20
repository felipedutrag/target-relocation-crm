"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Laptop,
  Link2,
  MapPin,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SummaryData {
  unique_visitors: number;
  total_sessions: number;
  total_pageviews: number;
  blog_reads: number;
  total_events: number;
  total_clicks: number;
  form_submits: number;
  whatsapp_clicks: number;
  avg_duration_sec: number;
  avg_scroll_pct: number;
  bounce_rate_pct: number;
  live_active_5m: number;
}

interface DailyRow {
  day: string;
  visitors: number;
  sessions: number;
  pageviews: number;
  blog_reads: number;
  clicks: number;
}

interface HourlyRow {
  hour: number;
  events: number;
  pageviews: number;
  visitors: number;
}

interface WeekdayHourRow {
  dow: number;
  hour: number;
  hits: number;
}

interface PageRow {
  path: string;
  page_title: string | null;
  is_blog_article: boolean;
  pageviews: number;
  visitors: number;
  sessions: number;
  clicks: number;
  avg_scroll_pct: number;
  avg_time_sec: number;
}

interface BlogRow {
  blog_slug: string;
  title: string;
  category: string;
  locale: string;
  canonical_path: string;
  views: number;
  unique_readers: number;
  avg_scroll_pct: number;
  avg_read_sec: number;
  cta_interactions: number;
}

interface DeviceRow {
  name: string;
  sessions: number;
  visitors?: number;
}

interface RegionRow {
  country: string;
  country_code: string;
  region: string;
  city: string;
  sessions: number;
  visitors: number;
  pageviews: number;
}

interface TrackingRow {
  source: string;
  medium: string;
  campaign: string;
  sample_tracking_url: string | null;
  sessions: number;
  visitors: number;
  pageviews: number;
  gclid_clicks: number;
}

interface ClickElementRow {
  path: string;
  event_type: string;
  element_tag: string;
  element_label: string;
  element_href: string | null;
  clicks: number;
}

interface RecentEventRow {
  id: number;
  occurred_at: string;
  event_type: string;
  event_name: string;
  path: string;
  page_title: string | null;
  blog_slug: string | null;
  device_type: string;
  browser_name: string | null;
  os_name: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  referrer_domain: string | null;
  element_text: string | null;
  scroll_depth_pct: number | null;
  time_on_page_sec: number | null;
}

interface HeatmapPoint {
  x_pct: number;
  y_pct: number;
  y_px?: number;
  doc_height?: number;
  element_text?: string | null;
  element_tag?: string | null;
}

interface HeatmapResponse {
  path: string;
  device: string;
  interaction: string;
  total_points: number;
  points: HeatmapPoint[];
  available_paths: Array<{ path: string; points_count: number }>;
  scroll_funnel: Array<{ threshold: number; sessions_reached: number }>;
  top_hotspots: Array<{
    element_tag: string;
    label: string;
    avg_x_pct: number;
    avg_y_pct: number;
    hits: number;
  }>;
}

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatSec(secs: number): string {
  if (!secs || secs <= 0) return "0s";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getEventBadgeStyle(eventType: string): { label: string; className: string } {
  switch (eventType) {
    case "blog_read":
      return {
        label: "Artigo Blog",
        className:
          "border-purple-300 bg-purple-100 text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-200",
      };
    case "whatsapp_click":
      return {
        label: "WhatsApp Click",
        className:
          "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300",
      };
    case "form_submit":
      return {
        label: "Formulário",
        className:
          "border-emerald-400 bg-emerald-200/80 text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-500/30 dark:text-emerald-200",
      };
    case "cta_click":
    case "click":
      return {
        label: eventType === "cta_click" ? "CTA" : "Clique",
        className:
          "border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300",
      };
    case "rage_click":
      return {
        label: "Rage Click",
        className:
          "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/20 dark:text-rose-300",
      };
    case "scroll":
      return {
        label: "Scroll",
        className:
          "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-300",
      };
    default:
      return {
        label: eventType === "pageview" ? "Pageview" : eventType,
        className:
          "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
      };
  }
}

/** Paints a true thermal false-color heatmap canvas from normalized x_pct / y_pct coordinates. */
function ThermalHeatmapCanvas({
  points,
  interaction,
  scrollFunnel,
  width,
  height,
  opacity,
}: {
  points: HeatmapPoint[];
  interaction: "click" | "move" | "scroll";
  scrollFunnel: Array<{ threshold: number; sessions_reached: number }>;
  width: number;
  height: number;
  opacity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (interaction === "scroll") {
      const topSessions = Math.max(1, scrollFunnel[0]?.sessions_reached || 1);
      const bands = [
        { from: 0, to: 10, sessions: scrollFunnel.find((s) => s.threshold === 10)?.sessions_reached || topSessions },
        { from: 10, to: 25, sessions: scrollFunnel.find((s) => s.threshold === 25)?.sessions_reached || 0 },
        { from: 25, to: 50, sessions: scrollFunnel.find((s) => s.threshold === 50)?.sessions_reached || 0 },
        { from: 50, to: 75, sessions: scrollFunnel.find((s) => s.threshold === 75)?.sessions_reached || 0 },
        { from: 75, to: 90, sessions: scrollFunnel.find((s) => s.threshold === 90)?.sessions_reached || 0 },
        { from: 90, to: 100, sessions: scrollFunnel.find((s) => s.threshold === 100)?.sessions_reached || 0 },
      ];
      for (const band of bands) {
        const ratio = Math.min(1, band.sessions / topSessions);
        const y0 = (band.from / 100) * height;
        const h = ((band.to - band.from) / 100) * height;
        const r = Math.round(255 * Math.min(1, ratio * 1.4));
        const g = Math.round(180 * (1 - Math.abs(ratio - 0.5)));
        const b = Math.round(255 * (1 - ratio));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.45)`;
        ctx.fillRect(0, y0, width, h);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`${band.to}% profundidade • ${Math.round(ratio * 100)}% das sessões`, 14, y0 + 20);
      }
      return;
    }

    if (!points || points.length === 0) return;

    const alphaCanvas = document.createElement("canvas");
    alphaCanvas.width = width;
    alphaCanvas.height = height;
    const actx = alphaCanvas.getContext("2d");
    if (!actx) return;

    const radius = interaction === "move" ? 24 : 34;
    const intensity = interaction === "move" ? 0.16 : 0.34;

    for (const pt of points) {
      const x = (Math.max(0, Math.min(100, pt.x_pct)) / 100) * width;
      const y = (Math.max(0, Math.min(100, pt.y_pct)) / 100) * height;
      const grad = actx.createRadialGradient(x, y, 2, x, y, radius);
      grad.addColorStop(0, `rgba(0,0,0,${intensity})`);
      grad.addColorStop(0.5, `rgba(0,0,0,${intensity * 0.45})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      actx.fillStyle = grad;
      actx.beginPath();
      actx.arc(x, y, radius, 0, Math.PI * 2);
      actx.fill();
    }

    const img = actx.getImageData(0, 0, width, height);
    const data = img.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;
      const t = a / 255;
      let r = 0;
      let g = 0;
      let b = 0;
      if (t < 0.25) {
        r = 0;
        g = Math.round((t / 0.25) * 200);
        b = 255;
      } else if (t < 0.5) {
        const k = (t - 0.25) / 0.25;
        r = 0;
        g = 220;
        b = Math.round(255 * (1 - k));
      } else if (t < 0.75) {
        const k = (t - 0.5) / 0.25;
        r = Math.round(255 * k);
        g = 235;
        b = 0;
      } else {
        const k = (t - 0.75) / 0.25;
        r = 255;
        g = Math.round(210 * (1 - k));
        b = 0;
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.min(230, Math.round(a * 0.92));
    }
    ctx.putImageData(img, 0, 0);
  }, [points, interaction, scrollFunnel, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ opacity }}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

export function AnalyticsView() {
  const [days, setDays] = useState("30");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [pathFilter, setPathFilter] = useState("all");
  const [heatmapPath, setHeatmapPath] = useState("/");
  const [heatmapInteraction, setHeatmapInteraction] = useState<"click" | "move" | "scroll">("click");
  const [heatmapViewport, setHeatmapViewport] = useState<"desktop" | "mobile">("desktop");
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.85);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<SummaryData>({
    unique_visitors: 0,
    total_sessions: 0,
    total_pageviews: 0,
    blog_reads: 0,
    total_events: 0,
    total_clicks: 0,
    form_submits: 0,
    whatsapp_clicks: 0,
    avg_duration_sec: 0,
    avg_scroll_pct: 0,
    bounce_rate_pct: 0,
    live_active_5m: 0,
  });
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [hourly, setHourly] = useState<HourlyRow[]>([]);
  const [weekdayHour, setWeekdayHour] = useState<WeekdayHourRow[]>([]);
  const [topPages, setTopPages] = useState<PageRow[]>([]);
  const [topBlogs, setTopBlogs] = useState<BlogRow[]>([]);
  const [byDevice, setByDevice] = useState<DeviceRow[]>([]);
  const [byBrowser, setByBrowser] = useState<DeviceRow[]>([]);
  const [byOs, setByOs] = useState<DeviceRow[]>([]);
  const [byRegion, setByRegion] = useState<RegionRow[]>([]);
  const [byTracking, setByTracking] = useState<TrackingRow[]>([]);
  const [topClicks, setTopClicks] = useState<ClickElementRow[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEventRow[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapResponse>({
    path: "/",
    device: "all",
    interaction: "click",
    total_points: 0,
    points: [],
    available_paths: [],
    scroll_funnel: [],
    top_hotspots: [],
  });
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        days,
        device: deviceFilter,
        heatmap_path: heatmapPath,
        interaction: heatmapInteraction,
      });
      if (pathFilter !== "all") qs.set("path", pathFilter);

      const res = await fetch(`/api/analytics?${qs.toString()}`);
      const json = await res.json();
      const d = json.dashboard || {};
      if (d.summary) setSummary(d.summary);
      setDaily(d.timeseries_daily || []);
      setHourly(d.by_hour || []);
      setWeekdayHour(d.by_weekday_hour || []);
      setTopPages(d.top_pages || []);
      setTopBlogs(d.top_blog_articles || []);
      setByDevice(d.by_device || []);
      setByBrowser(d.by_browser || []);
      setByOs(d.by_os || []);
      setByRegion(d.by_region || []);
      setByTracking(d.by_tracking || []);
      setTopClicks(d.top_clicked_elements || []);
      setRecentEvents(d.recent_events || []);
      if (json.heatmap) setHeatmap(json.heatmap);
    } finally {
      setLoading(false);
    }
  }, [days, deviceFilter, pathFilter, heatmapPath, heatmapInteraction]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const maxHourlyHits = useMemo(
    () => Math.max(1, ...hourly.map((h) => h.events || 0)),
    [hourly]
  );

  const maxDailyPv = useMemo(
    () => Math.max(1, ...daily.map((d) => d.pageviews || 0)),
    [daily]
  );

  const maxWeekdayHit = useMemo(
    () => Math.max(1, ...weekdayHour.map((w) => w.hits || 0)),
    [weekdayHour]
  );

  const pathOptions = useMemo(() => {
    const set = new Set<string>(["/", "/blog", "/visto-chines-brasileiro"]);
    for (const p of topPages) if (p.path) set.add(p.path);
    for (const a of heatmap.available_paths || []) if (a.path) set.add(a.path);
    return [...set];
  }, [topPages, heatmap.available_paths]);

  const filteredRecent = useMemo(
    () =>
      recentEvents.filter(
        (ev) => eventTypeFilter === "all" || ev.event_type === eventTypeFilter
      ),
    [recentEvents, eventTypeFilter]
  );

  const totalSessionsDevice = useMemo(
    () => Math.max(1, byDevice.reduce((a, b) => a + (b.sessions || 0), 0)),
    [byDevice]
  );

  return (
    <div className="space-y-5">
      {/* Header + Global Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-6 text-foreground" />
            Analytics, Blog Tracking &amp; Mapa de Calor
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Telemetria proprietária no Postgres: visitantes, sessões, artigos do blog, cliques, rolagem, horários, regiões, dispositivos e UTMs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-emerald-300 bg-emerald-100 text-emerald-900 font-mono text-xs dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-300"
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {summary.live_active_5m} online agora (5m)
          </Badge>

          <Select value={days} onValueChange={(v) => setDays(v || "30")}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje (24h)</SelectItem>
              <SelectItem value="7">Últimos 7d</SelectItem>
              <SelectItem value="30">Últimos 30d</SelectItem>
              <SelectItem value="90">Últimos 90d</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deviceFilter} onValueChange={(v) => setDeviceFilter(v || "all")}>
            <SelectTrigger className="h-8 w-[135px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Dispositivos</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs cursor-pointer" onClick={loadAnalytics}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 6 Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Users className="size-3.5" />
              Visitantes Únicos
            </div>
            <div className="mt-1 text-2xl font-bold font-mono">{summary.unique_visitors.toLocaleString("pt-BR")}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{summary.total_sessions} sessões totais</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-800 dark:text-sky-400">
              <Activity className="size-3.5" />
              Pageviews Totais
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-sky-800 dark:text-sky-400">
              {summary.total_pageviews.toLocaleString("pt-BR")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{summary.total_events} eventos capturados</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-purple-800 dark:text-purple-400">
              <BookOpen className="size-3.5" />
              Leituras de Artigos
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-purple-800 dark:text-purple-400">
              {summary.blog_reads.toLocaleString("pt-BR")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{topBlogs.length} artigos acessados</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-400">
              <MousePointerClick className="size-3.5" />
              Cliques &amp; CTAs
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-amber-800 dark:text-amber-400">
              {summary.total_clicks.toLocaleString("pt-BR")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {summary.whatsapp_clicks} WhatsApp • {summary.form_submits} forms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-400">
              <Clock className="size-3.5" />
              Tempo / Scroll Médio
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-400">
              {formatSec(summary.avg_duration_sec)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Scroll médio {summary.avg_scroll_pct}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3.5">
            <div className="text-[11px] font-medium text-muted-foreground">Taxa de Rejeição</div>
            <div className="mt-1 text-2xl font-bold font-mono">{summary.bounce_rate_pct}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Sessões com 1 pageview</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão Geral &amp; Horários</TabsTrigger>
          <TabsTrigger value="blog">Artigos do Blog ({topBlogs.length})</TabsTrigger>
          <TabsTrigger value="heatmap" className="gap-1.5">
            <Flame className="size-3.5" />
            Mapa de Calor ({heatmap.total_points})
          </TabsTrigger>
          <TabsTrigger value="audience">Dispositivos, Regiões &amp; UTMs</TabsTrigger>
          <TabsTrigger value="events">Eventos Ao Vivo ({recentEvents.length})</TabsTrigger>
        </TabsList>

        {/* TAB 1: VISÃO GERAL & HORÁRIOS */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Daily Pageviews Trend */}
            <Card className="lg:col-span-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Evolução Diária (Pageviews &amp; Visitantes)</CardTitle>
              </CardHeader>
              <CardContent>
                {daily.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Navegue pelo site público ou blog para iniciar a série diária.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-end gap-1.5 h-36 pt-4">
                      {daily.map((d) => {
                        const hPct = Math.max(8, Math.round((d.pageviews / maxDailyPv) * 100));
                        return (
                          <div key={d.day} className="flex-1 h-full flex flex-col items-center justify-end gap-1 group min-w-0">
                            <span className="text-[10px] font-mono text-muted-foreground opacity-80">
                              {d.pageviews}
                            </span>
                            <div
                              title={`${d.day}: ${d.pageviews} views • ${d.visitors} visitantes • ${d.blog_reads} blog`}
                              style={{ height: `${hPct}%` }}
                              className="w-full max-w-[28px] rounded-t-md bg-zinc-900 dark:bg-zinc-200 transition-all group-hover:bg-amber-600 dark:group-hover:bg-amber-400"
                            />
                            <span className="text-[9px] font-mono text-muted-foreground truncate w-full text-center">
                              {d.day.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 24h Distribution BRT */}
            <Card className="lg:col-span-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribuição por Horário (00h–23h Horário de Brasília)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-36 pt-4">
                  {hourly.map((h) => {
                    const barPct = Math.max(h.events > 0 ? 12 : 4, Math.round((h.events / maxHourlyHits) * 100));
                    return (
                      <div key={h.hour} className="flex-1 h-full flex flex-col items-center justify-end gap-1 min-w-0">
                        <div
                          title={`${String(h.hour).padStart(2, "0")}h: ${h.events} eventos (${h.pageviews} views)`}
                          style={{ height: `${barPct}%` }}
                          className={`w-full rounded-t-sm transition-all ${
                            h.events > 0 ? "bg-sky-600 dark:bg-sky-400" : "bg-muted"
                          }`}
                        />
                        {h.hour % 3 === 0 ? (
                          <span className="text-[9px] font-mono text-muted-foreground">
                            {String(h.hour).padStart(2, "0")}
                          </span>
                        ) : (
                          <span className="text-[9px] text-transparent">.</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 7x24 Weekday x Hour Activity Heatmap Matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Mapa de Horários de Pico (Dia da Semana × Hora BRT)</CardTitle>
              <CardDescription className="text-xs">
                Identifica exatamente em quais dias e horários os visitantes de RH acessam o site e artigos
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[680px] space-y-1">
                {WEEKDAYS_PT.map((label, dow) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-8 font-mono text-[10px] text-muted-foreground">{label}</span>
                    <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1 flex-1">
                      {Array.from({ length: 24 }, (_, hour) => {
                        const cell = weekdayHour.find((w) => w.dow === dow && w.hour === hour);
                        const hits = cell?.hits || 0;
                        const intensity = hits / maxWeekdayHit;
                        const cls =
                          hits === 0
                            ? "bg-muted/40"
                            : intensity > 0.7
                              ? "bg-amber-600 dark:bg-amber-400"
                              : intensity > 0.4
                                ? "bg-amber-500/80 dark:bg-amber-500/70"
                                : intensity > 0.15
                                  ? "bg-emerald-500/70"
                                  : "bg-emerald-500/35";
                        return (
                          <div
                            key={hour}
                            title={`${label} ${String(hour).padStart(2, "0")}h: ${hits} eventos`}
                            className={`h-4 rounded-[3px] ${cls}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Páginas Mais Acessadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {topPages.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">Sem acessos registrados ainda.</div>
                ) : (
                  topPages.map((p) => (
                    <div key={p.path} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 p-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[11px] font-semibold truncate">{p.path}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {p.page_title || "Página pública"} • Scroll {p.avg_scroll_pct}% • {formatSec(p.avg_time_sec)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.is_blog_article && (
                          <Badge variant="outline" className="text-[10px] border-purple-300 bg-purple-100 text-purple-900 dark:border-purple-500/40 dark:bg-purple-500/20 dark:text-purple-200">
                            Blog
                          </Badge>
                        )}
                        <span className="font-mono font-bold text-xs">{p.pageviews}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Elementos Mais Clicados (Botões, WhatsApp, Links)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {topClicks.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">Sem cliques registrados ainda.</div>
                ) : (
                  topClicks.map((c, idx) => (
                    <div key={`${c.path}-${c.element_label}-${idx}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 p-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{c.element_label}</div>
                        <div className="font-mono text-[10px] text-muted-foreground truncate">
                          {c.path} • &lt;{c.element_tag}&gt; • {c.event_type}
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[11px] shrink-0">
                        {c.clicks} cliques
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: ARTIGOS DO BLOG */}
        <TabsContent value="blog" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance por Artigo do Blog</CardTitle>
              <CardDescription className="text-xs">
                Rastreamento automático de leitura em URLs raiz PT (`/[slug]`), `/en/[slug]`, `/es/[slug]` e `/blog/[slug]`
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              {topBlogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Ainda não há leituras registradas em artigos do blog neste período.
                </div>
              ) : (
                topBlogs.map((b) => (
                  <div key={`${b.blog_slug}-${b.locale}`} className="rounded-xl border border-border p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {b.category}
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                          {b.locale}
                        </Badge>
                        <a
                          href={b.canonical_path}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-sm hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate">{b.title}</span>
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground">{b.canonical_path}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 shrink-0 font-mono text-xs">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Views</div>
                        <div className="font-bold">{b.views}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Leitores</div>
                        <div className="font-bold">{b.unique_readers}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Scroll Médio</div>
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">{b.avg_scroll_pct}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Tempo</div>
                        <div className="font-bold">{formatSec(b.avg_read_sec)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">Cliques CTA</div>
                        <div className="font-bold text-amber-700 dark:text-amber-400">{b.cta_interactions}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MAPA DE CALOR TÉRMICO SOBRE PREVIEW AO VIVO */}
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={heatmapPath} onValueChange={(v) => setHeatmapPath(v || "/")}>
                  <SelectTrigger className="h-8 w-[260px] text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pathOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
                  {(
                    [
                      { id: "click", label: "Cliques" },
                      { id: "move", label: "Movimento" },
                      { id: "scroll", label: "Scroll Depth" },
                    ] as const
                  ).map((m) => (
                    <Button
                      key={m.id}
                      size="sm"
                      variant={heatmapInteraction === m.id ? "default" : "ghost"}
                      className="h-7 text-xs cursor-pointer"
                      onClick={() => setHeatmapInteraction(m.id)}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
                  <Button
                    size="sm"
                    variant={heatmapViewport === "desktop" ? "default" : "ghost"}
                    className="h-7 text-xs gap-1 cursor-pointer"
                    onClick={() => setHeatmapViewport("desktop")}
                  >
                    <Laptop className="size-3" /> Desktop
                  </Button>
                  <Button
                    size="sm"
                    variant={heatmapViewport === "mobile" ? "default" : "ghost"}
                    className="h-7 text-xs gap-1 cursor-pointer"
                    onClick={() => setHeatmapViewport("mobile")}
                  >
                    <Smartphone className="size-3" /> Mobile
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  Intensidade
                  <input
                    type="range"
                    min={0.3}
                    max={1}
                    step={0.05}
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                    className="w-24"
                  />
                </label>
                <Badge variant="outline" className="font-mono text-[11px]">
                  {heatmap.total_points} pontos
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-12">
            {/* Live Page + Thermal Canvas Overlay */}
            <Card className="xl:col-span-8">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Flame className="size-4 text-amber-600 dark:text-amber-400" />
                    Sobreposição Térmica: <code className="font-mono">{heatmap.path}</code>
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Frio (Azul) → Médio (Verde/Amarelo) → Quente (Vermelho)
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div
                  className={`relative overflow-hidden rounded-xl border border-border bg-white shadow-sm ${
                    heatmapViewport === "mobile" ? "w-[390px] h-[680px]" : "w-full h-[680px]"
                  }`}
                >
                  <iframe
                    title="Preview Heatmap"
                    src={`${heatmapPath}${heatmapPath.includes("?") ? "&" : "?"}_hm_preview=1`}
                    className="pointer-events-none h-full w-full border-0"
                  />
                  <ThermalHeatmapCanvas
                    points={heatmap.points || []}
                    interaction={heatmapInteraction}
                    scrollFunnel={heatmap.scroll_funnel || []}
                    width={heatmapViewport === "mobile" ? 390 : 1020}
                    height={680}
                    opacity={heatmapOpacity}
                  />
                  {heatmapInteraction !== "scroll" && heatmap.points.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white font-medium px-6 text-center">
                      Nenhum ponto de {heatmapInteraction === "click" ? "clique" : "movimento"} registrado ainda em {heatmapPath}. Interaja na página pública para gerar o mapa térmico.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Panel: Scroll Funnel & Top Hotspots */}
            <div className="xl:col-span-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Funil de Rolagem (Scroll Depth)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  {(heatmap.scroll_funnel || []).map((sf) => {
                    const maxSess = Math.max(1, heatmap.scroll_funnel[0]?.sessions_reached || 1);
                    const pct = Math.min(100, Math.round((sf.sessions_reached / maxSess) * 100));
                    return (
                      <div key={sf.threshold} className="space-y-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span>{sf.threshold}% da página</span>
                          <span>
                            {sf.sessions_reached} sessões ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top Hotspots Clicados na Página</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {(heatmap.top_hotspots || []).length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground">Sem hotspots registrados nesta rota.</div>
                  ) : (
                    heatmap.top_hotspots.map((hs, i) => (
                      <div key={i} className="rounded-lg border border-border/70 p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{hs.label}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            &lt;{hs.element_tag}&gt; • X: {hs.avg_x_pct}% • Y: {hs.avg_y_pct}%
                          </div>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                          {hs.hits}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: DISPOSITIVOS, REGIÕES & UTMs */}
        <TabsContent value="audience" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Dispositivos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Dispositivos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {byDevice.map((d) => {
                  const pct = Math.round(((d.sessions || 0) / totalSessionsDevice) * 100);
                  const Icon = d.name === "mobile" ? Smartphone : d.name === "tablet" ? Tablet : Laptop;
                  return (
                    <div key={d.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-medium capitalize">
                          <Icon className="size-3.5" /> {d.name}
                        </span>
                        <span className="font-mono">
                          {d.sessions} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-sky-600 dark:bg-sky-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Navegadores */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Navegadores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {byBrowser.map((b) => (
                  <div key={b.name} className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0">
                    <span className="font-medium">{b.name}</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {b.sessions} sessões
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Sistema Operacional */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sistema Operacional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {byOs.map((o) => (
                  <div key={o.name} className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0">
                    <span className="font-medium">{o.name}</span>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {o.sessions} sessões
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Regiões */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="size-4" />
                  Por Região / Cidade &amp; País
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {byRegion.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">Sem sessões registradas.</div>
                ) : (
                  byRegion.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-border/70 p-2.5">
                      <div>
                        <div className="font-medium">
                          {r.city}, {r.region}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Globe className="size-3" /> {r.country} ({r.country_code})
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <div className="font-bold">{r.sessions} sessões</div>
                        <div className="text-muted-foreground">{r.pageviews} views</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* URLs de Rastreamento & UTMs */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="size-4" />
                  URLs de Rastreamento, UTMs, GCLID &amp; Origens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {byTracking.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">Sem campanhas rastreadas ainda.</div>
                ) : (
                  byTracking.map((t, i) => (
                    <div key={i} className="rounded-lg border border-border/70 p-2.5 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-mono text-[11px] font-semibold">
                          {t.source} / {t.medium} {t.campaign !== "—" ? `• ${t.campaign}` : ""}
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {t.sessions} sessões • {t.pageviews} views
                        </Badge>
                      </div>
                      {t.sample_tracking_url && (
                        <div className="font-mono text-[10px] text-muted-foreground truncate">
                          URL: {t.sample_tracking_url}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: STREAM DE EVENTOS AO VIVO */}
        <TabsContent value="events" className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {["all", "pageview", "blog_read", "click", "cta_click", "whatsapp_click", "form_submit", "scroll", "page_exit"].map(
              (ev) => (
                <Button
                  key={ev}
                  size="sm"
                  variant={eventTypeFilter === ev ? "default" : "outline"}
                  className="h-7 text-xs cursor-pointer"
                  onClick={() => setEventTypeFilter(ev)}
                >
                  {ev === "all" ? "Todos Eventos" : ev}
                </Button>
              )
            )}
          </div>

          <Card>
            <CardContent className="p-0 divide-y divide-border text-xs">
              {filteredRecent.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Nenhum evento capturado neste filtro.</div>
              ) : (
                filteredRecent.map((e) => {
                  const st = getEventBadgeStyle(e.event_type);
                  return (
                    <div key={e.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${st.className}`}>
                          {st.label}
                        </Badge>
                        <span className="font-mono text-[11px] font-semibold truncate">{e.path}</span>
                        {e.element_text && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                            • &ldquo;{e.element_text}&rdquo;
                          </span>
                        )}
                        {e.scroll_depth_pct !== null && (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {e.scroll_depth_pct}% scroll
                          </Badge>
                        )}
                        {e.utm_source && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            utm:{e.utm_source}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground shrink-0">
                        <span>{e.device_type}</span>
                        <span>•</span>
                        <span>{e.city || e.country || "—"}</span>
                        <span>•</span>
                        <span>{new Date(e.occurred_at).toLocaleTimeString("pt-BR")}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
