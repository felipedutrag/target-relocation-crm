"use client";

import { useCrmFetch } from "@/lib/crm-cache";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CalendarClock,
  FileSpreadsheet,
  FolderUp,
  Globe,
  Kanban,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Menu,
  Moon,
  PhoneCall,
  Radio,
  Search,
  Sparkles,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { AuthenticatedUser } from "@/components/auth/login-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { CrmTab, DealRecord } from "./types";
import { formatMoney } from "./utils";
import { OverviewView } from "./overview-view";
import { PipelinesView } from "./pipelines-view";
import { DouRadarView } from "./dou-radar-view";
import { OrganizationsView } from "./organizations-view";
import { PeopleView } from "./people-view";
import { ActivitiesView } from "./activities-view";
import { ProposalsView } from "./proposals-view";
import { ImportCenterView } from "./import-center-view";
import { DealDossierSheet } from "./deal-dossier-sheet";
import { AiChatView } from "./ai-chat-view";
import { EditorialBlogView } from "./editorial-blog-view";
import { SdrOperationsView } from "./sdr-operations-view";
import { EmailMarketingView } from "./email-marketing-view";
import { AnalyticsView } from "./analytics-view";
import { AiSettingsDialog } from "./ai-settings-dialog";
import { PromptStudioView } from "./prompt-studio-view";
import { AccountView } from "./account-view";
import { WhatsAppInboxView } from "./whatsapp-inbox-view";
import { ACCOUNT_ACCENTS, accountInitials } from "@/lib/account-profile";

interface SearchOrg {
  id: number;
  name: string;
  address: string | null;
  open_deals_count: number;
}

interface SearchPerson {
  id: number;
  name: string;
  primary_email: string | null;
  primary_phone: string | null;
  org_name: string | null;
}

interface NavItem {
  id: CrmTab;
  label: string;
  subtitle: string;
  keywords: string;
  badge?: string;
  section?: "crm" | "growth";
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Visão Geral",
    subtitle: "KPIs, funil & automações",
    keywords: "overview dashboard resumo metricas kpi painel",
    section: "crm",
    icon: LayoutDashboard,
  },
  {
    id: "pipelines",
    label: "Pipelines & Negócios",
    subtitle: "CRM - SDR & Outbound",
    keywords: "deals funil kanban sdr outbound negocios vendas",
    badge: "4.344",
    section: "crm",
    icon: Kanban,
  },
  {
    id: "dou",
    label: "Radar DOU",
    subtitle: "Expatriados, Diário Oficial & Score",
    keywords: "dou diario oficial receita federal score cnpj rn",
    badge: "DOU",
    section: "crm",
    icon: Radio,
  },
  {
    id: "organizations",
    label: "Organizações",
    subtitle: "Empresas, CNPJs & sócios",
    keywords: "empresas cnpj clientes multinacionais organizacoes icp 109",
    badge: "2.973",
    section: "crm",
    icon: Building2,
  },
  {
    id: "people",
    label: "Pessoas & Decisores",
    subtitle: "Contatos, cargos & RH",
    keywords: "contatos pessoas rh decisores email whatsapp telefone",
    badge: "3.369",
    section: "crm",
    icon: Users,
  },
  {
    id: "activities",
    label: "Atividades & Cadência",
    subtitle: "Follow-ups, e-mails & calls",
    keywords: "tarefas follow up calls ligacoes emails agenda",
    badge: "2.542",
    section: "crm",
    icon: CalendarClock,
  },
  {
    id: "proposals",
    label: "Propostas & Catálogo",
    subtitle: "55+ serviços & orçamentos",
    keywords: "propostas orcamentos servicos vistos precos brl usd",
    badge: "55+",
    section: "crm",
    icon: FileSpreadsheet,
  },
  {
    id: "import",
    label: "Arquivos & Import",
    subtitle: "Backup Pipedrive & uploads",
    keywords: "arquivos importador csv backup pipedrive pdf anexos",
    badge: "102 arqs",
    section: "crm",
    icon: FolderUp,
  },
  {
    id: "ai_chat",
    label: "Assistente IA",
    subtitle: "Copilot OpenAI conectado ao CRM",
    keywords: "chat ia openai copilot assistente ai gpt prompt dou sdr",
    badge: "GPT",
    section: "growth",
    icon: Bot,
  },
  {
    id: "ai_prompts",
    label: "Central de prompts",
    subtitle: "Instruções, testes e versões das IAs",
    keywords: "central prompt sistema editar versões agentes sara otavio anderley ia",
    section: "growth",
    icon: Sparkles,
  },
  {
    id: "account",
    label: "Minha conta",
    subtitle: "Perfil, acesso e preferências",
    keywords: "minha conta perfil email senha tema avatar preferencias configuração segurança",
    icon: UserRound,
  },
  {
    id: "whatsapp_inbox",
    label: "WhatsApp",
    subtitle: "Conversas por número",
    keywords: "whatsapp anderley aurea sara atendimento historico chat",
    section: "growth",
    icon: MessageCircle,
  },
  {
    id: "editorial",
    label: "Blog & Editorial",
    subtitle: "GEO/SEO + 24 pautas + 1→4 canais",
    keywords: "blog geo seo editorial linkedin instagram heygen youtube aprovacao klaus",
    badge: "24",
    section: "growth",
    icon: BookOpen,
  },
  {
    id: "email_marketing",
    label: "E-mail Marketing",
    subtitle: "Resend, Broadcasts, Audiências & Templates",
    keywords: "email marketing resend newsletter templates broadcasts audiencias smtp dkmin",
    badge: "Resend",
    section: "growth",
    icon: Mail,
  },
  {
    id: "analytics",
    label: "Analytics & Heatmap",
    subtitle: "Visitantes, Artigos, Regiões & Mapa de Calor",
    keywords: "analytics heatmap mapa calor visitantes sessoes blog utm tracking regioes",
    badge: "Live",
    section: "growth",
    icon: BarChart3,
  },
  {
    id: "sdr_ops",
    label: "Placar SDR",
    subtitle: "Meta 40/8 • Perfil Klaus • Auditor IA",
    keywords: "sdr placar aurea anderley ligacoes auditor perfil klaus reuniao semanal",
    badge: "40/8",
    section: "growth",
    icon: PhoneCall,
  },
];

const BACKUP_SHORTCUTS = [
  {
    dealId: 3432,
    title: "PneuStore (#3432)",
    subtitle: "Proposta PDF · R$ 62.315",
    keywords: "pneustore cantustore 3432 proposta pdf",
    tone: "emerald" as const,
  },
  {
    dealId: 3361,
    title: "JSL S.A (#3361)",
    subtitle: "DOU · Score 100",
    subtitleHighlight: true,
    keywords: "jsl dou score 100 3361",
    tone: "amber" as const,
  },
];

type GlobalSearchScope = "all" | "workspace" | "deals" | "orgs" | "people";

const GLOBAL_SCOPES: { id: GlobalSearchScope; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "workspace", label: "Workspace" },
  { id: "deals", label: "Negócios & DOU" },
  { id: "orgs", label: "Organizações" },
  { id: "people", label: "Pessoas" },
];

export interface CrmShellProps {
  initialDealId?: number | null;
  initialTab?: CrmTab;
  emailConfirmationFailed?: boolean;
  currentUser?: AuthenticatedUser | null;
  onAccountChange?: (user: AuthenticatedUser) => void;
  onOpenLanding?: () => void;
  onLogout?: () => void;
}

export function CrmShell({
  initialDealId = null,
  initialTab,
  emailConfirmationFailed = false,
  currentUser = null,
  onAccountChange,
  onOpenLanding,
  onLogout,
}: CrmShellProps) {
  const crmFetch = useCrmFetch();
  const [activeTab, setActiveTab] = useState<CrmTab>(initialTab ?? currentUser?.preferences?.startTab ?? "overview");
  const accountTheme = currentUser?.preferences?.theme;
  const accountName = currentUser?.preferences?.displayName || currentUser?.name || "Minha conta";
  const accountAccent = ACCOUNT_ACCENTS[currentUser?.preferences?.accent ?? "amber"];
  const [selectedDealId, setSelectedDealId] = useState<number | null>(initialDealId);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Live sidebar workspace filter state
  const [workspaceQuery, setWorkspaceQuery] = useState("");
  const workspaceInputRef = useRef<HTMLInputElement | null>(null);

  // Global search modal state
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdScope, setCmdScope] = useState<GlobalSearchScope>("all");
  const [cmdLoading, setCmdLoading] = useState(false);
  const [cmdDeals, setCmdDeals] = useState<DealRecord[]>([]);
  const [cmdOrgs, setCmdOrgs] = useState<SearchOrg[]>([]);
  const [cmdPeople, setCmdPeople] = useState<SearchPerson[]>([]);

  useEffect(() => {
    if (initialDealId) {
      setSelectedDealId(initialDealId);
    }
  }, [initialDealId]);

  // Apply persisted theme synchronously without transition flash
  const applyTheme = useCallback((nextDark: boolean) => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.classList.toggle("dark", nextDark);
    root.style.colorScheme = nextDark ? "dark" : "light";
    // Force single-frame layout/paint flush so all components update simultaneously
    void root.offsetHeight;
    setIsDark(nextDark);
    try {
      localStorage.setItem("target_crm_theme", nextDark ? "dark" : "light");
    } catch {
      // ignore storage errors
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove("theme-switching");
      });
    });
  }, []);

  useEffect(() => {
    if (accountTheme === "system") {
      const system = window.matchMedia("(prefers-color-scheme: dark)");
      const update = () => applyTheme(system.matches);
      update();
      system.addEventListener("change", update);
      return () => system.removeEventListener("change", update);
    }
    if (accountTheme === "dark" || accountTheme === "light") {
      applyTheme(accountTheme === "dark");
      return;
    }
    try {
      const saved = localStorage.getItem("target_crm_theme");
      if (saved === "dark" || saved === "light") {
        applyTheme(saved === "dark");
        return;
      }
    } catch {
      // ignore
    }
    setIsDark(document.documentElement.classList.contains("dark"));
  }, [accountTheme, applyTheme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const runGlobalSearch = useCallback(async (q: string) => {
    setCmdLoading(true);
    try {
      const encoded = encodeURIComponent(q.trim());
      const [dealsRes, orgsRes, peopleRes] = await Promise.all([
        crmFetch(`/api/deals?search=${encoded}&limit=10`),
        crmFetch(`/api/organizations?search=${encoded}&limit=10`),
        crmFetch(`/api/people?search=${encoded}&limit=10`),
      ]);
      const [dealsJson, orgsJson, peopleJson] = await Promise.all([
        dealsRes.json(),
        orgsRes.json(),
        peopleRes.json(),
      ]);
      setCmdDeals((dealsJson.deals || []).slice(0, 8));
      setCmdOrgs((orgsJson.organizations || []).slice(0, 6));
      setCmdPeople((peopleJson.people || []).slice(0, 6));
    } catch (err) {
      console.error("Erro na busca global:", err);
    } finally {
      setCmdLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cmdOpen) return;
    const timer = setTimeout(() => {
      void runGlobalSearch(cmdQuery);
    }, 140);
    return () => clearTimeout(timer);
  }, [cmdOpen, cmdQuery, runGlobalSearch]);

  const toggleTheme = useCallback(() => {
    applyTheme(!isDark);
  }, [applyTheme, isDark]);

  const handleNavigate = (tab: CrmTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  const openGlobalWithQuery = (initialText = "") => {
    setCmdScope("all");
    if (initialText) {
      setCmdQuery(initialText);
    }
    setCmdOpen(true);
    setMobileNavOpen(false);
  };

  // Filtered workspace navigation & shortcuts for Sidebar "Buscar workspace..."
  const normalizedWorkspaceQuery = workspaceQuery.trim().toLowerCase();

  const filteredNavItems = useMemo(() => {
    if (!normalizedWorkspaceQuery) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) =>
      `${item.label} ${item.subtitle} ${item.keywords} ${item.badge ?? ""}`
        .toLowerCase()
        .includes(normalizedWorkspaceQuery)
    );
  }, [normalizedWorkspaceQuery]);

  const filteredShortcuts = useMemo(() => {
    if (!normalizedWorkspaceQuery) return BACKUP_SHORTCUTS;
    return BACKUP_SHORTCUTS.filter((s) =>
      `${s.title} ${s.subtitle} ${s.keywords}`.toLowerCase().includes(normalizedWorkspaceQuery)
    );
  }, [normalizedWorkspaceQuery]);

  const workspaceQuickActions = useMemo(() => {
    const actions = [
      {
        id: "toggle-theme",
        label: isDark ? "Ativar tema claro" : "Ativar tema escuro",
        keywords: "tema claro escuro dark light theme",
        run: () => toggleTheme(),
      },
      ...(onOpenLanding
        ? [
            {
              id: "landing",
              label: "Ir para Landing Page",
              keywords: "landing page site home institucional",
              run: () => onOpenLanding(),
            },
          ]
        : []),
    ];
    if (!normalizedWorkspaceQuery) return [];
    return actions.filter((a) =>
      `${a.label} ${a.keywords}`.toLowerCase().includes(normalizedWorkspaceQuery)
    );
  }, [isDark, normalizedWorkspaceQuery, onOpenLanding, toggleTheme]);

  // Filtered Workspace items inside Busca Global modal
  const normalizedCmdQuery = cmdQuery.trim().toLowerCase();
  const cmdNavMatches = useMemo(() => {
    if (!normalizedCmdQuery) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) =>
      `${item.label} ${item.subtitle} ${item.keywords} ${item.badge ?? ""}`
        .toLowerCase()
        .includes(normalizedCmdQuery)
    );
  }, [normalizedCmdQuery]);

  const showWorkspaceInCmd = cmdScope === "all" || cmdScope === "workspace";
  const showDealsInCmd = cmdScope === "all" || cmdScope === "deals";
  const showOrgsInCmd = cmdScope === "all" || cmdScope === "orgs";
  const showPeopleInCmd = cmdScope === "all" || cmdScope === "people";

  const hasAnyCmdResults =
    (showWorkspaceInCmd && cmdNavMatches.length > 0) ||
    (showDealsInCmd && cmdDeals.length > 0) ||
    (showOrgsInCmd && cmdOrgs.length > 0) ||
    (showPeopleInCmd && cmdPeople.length > 0);

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  const SidebarContent = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Theme-aware Sidebar Header with Transparent Logo */}
      <div className="flex h-14 items-center justify-between gap-2 px-4 bg-sidebar border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src="/target-logo.png"
            alt="Target Relocation"
            className="h-7 w-auto object-contain shrink-0 dark:brightness-175 dark:contrast-125"
          />
        </div>
        <Badge
          variant="outline"
          className="border-border bg-muted/60 text-muted-foreground font-mono h-5 px-1.5 text-[10px] font-medium shrink-0"
        >
          CRM
        </Badge>
      </div>

      {/* Live Workspace Search Input */}
      <div className="px-3 pt-3 pb-2.5">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
          <input
            ref={workspaceInputRef}
            type="text"
            value={workspaceQuery}
            onChange={(e) => setWorkspaceQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && workspaceQuery.trim()) {
                e.preventDefault();
                openGlobalWithQuery(workspaceQuery.trim());
              } else if (e.key === "Escape" && workspaceQuery) {
                setWorkspaceQuery("");
              }
            }}
            placeholder="Buscar workspace..."
            aria-label="Buscar workspace"
            className="h-8 w-full rounded-lg border border-border bg-muted/40 pl-8 pr-14 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:bg-background"
          />
          {workspaceQuery ? (
            <button
              type="button"
              onClick={() => setWorkspaceQuery("")}
              aria-label="Limpar busca do workspace"
              className="absolute right-2 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openGlobalWithQuery("")}
              title="Abrir Busca Global (Ctrl+K)"
              className="absolute right-1.5 rounded border border-border bg-background px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Ctrl K
            </button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2.5 py-1.5">
        <div className="space-y-0.5">
          {filteredNavItems.filter((i) => i.section !== "growth").map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium leading-tight">
                    {item.label}
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                      active
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {filteredNavItems.some((i) => i.section === "growth") && (
            <div className="pt-3 pb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Plano de Ação, Blog & IA
            </div>
          )}

          {filteredNavItems.filter((i) => i.section === "growth").map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 shrink-0",
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium leading-tight">
                    {item.label}
                  </div>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                      active
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {normalizedWorkspaceQuery && filteredNavItems.length === 0 && (
            <div className="px-2.5 py-2 text-[11px] text-muted-foreground">
              Nenhum módulo correspondente.
            </div>
          )}
        </div>

        {workspaceQuickActions.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-1 px-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
                Ações do Workspace
              </p>
              {workspaceQuickActions.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={act.run}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-accent cursor-pointer"
                >
                  <span>{act.label}</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        )}

        {filteredShortcuts.length > 0 && (
          <>
            <Separator className="my-3.5" />
            <div className="space-y-1.5 px-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
                Atalhos do Backup
              </p>
              {filteredShortcuts.map((s) => (
                <button
                  key={s.dealId}
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg border border-border/80 bg-muted/40 px-2.5 py-2 text-left hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedDealId(s.dealId)}
                >
                  {s.tone === "emerald" ? (
                    <Briefcase className="size-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <Sparkles className="size-3.5 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">{s.title}</div>
                    <div className="truncate font-mono text-[10px] text-muted-foreground">
                      {s.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {workspaceQuery.trim() && (
          <div className="mt-3 px-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between h-8 text-[11px] border-dashed cursor-pointer"
              onClick={() => openGlobalWithQuery(workspaceQuery.trim())}
            >
              <span className="truncate">
                Buscar “{workspaceQuery.trim()}” no Supabase
              </span>
              <ArrowRight className="size-3 shrink-0 ml-1" />
            </Button>
          </div>
        )}
      </ScrollArea>

      <Separator />

      <div className="flex items-center justify-between gap-2 p-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-muted"
          onClick={() => handleNavigate("account")} aria-label="Abrir Minha conta">
          <span className="grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-semibold"
            style={{ backgroundColor: accountAccent.color, color: accountAccent.darkText ? "#171717" : "#fff" }}>
            {accountInitials(accountName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium">{accountName}</span>
            <span className="block truncate text-[10px] text-muted-foreground">Minha conta</span>
          </span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {onLogout && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={onLogout}
              title="Trocar usuário / Tela de Login"
            >
              <LogOut className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={toggleTheme}
            title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
          >
            {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );

  const isFullHeightTab = activeTab === "ai_chat" || activeTab === "whatsapp_inbox";

  return (
    <div
      className={
        isFullHeightTab
          ? "flex h-dvh overflow-hidden bg-background text-foreground"
          : "flex min-h-screen bg-background text-foreground"
      }
    >
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:block lg:h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegação Target Relocation CRM</SheetTitle>
          </SheetHeader>
          {SidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col bg-background text-foreground">
        {/* Theme-aware Sticky Header Bar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur-md px-4 text-foreground lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="size-8 border-border bg-card text-foreground lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-4" />
            </Button>
            <img
              src="/target-logo.png"
              alt="Target Relocation"
              className="h-6 w-auto object-contain lg:hidden shrink-0 dark:brightness-175 dark:contrast-125"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold tracking-[-0.02em] text-foreground">
                  {currentNav.label}
                </h1>
                {currentNav.badge && (
                  <span className="hidden sm:inline-flex items-center rounded border border-border bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {currentNav.badge}
                  </span>
                )}
              </div>
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {currentNav.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-border bg-card text-xs text-foreground hover:bg-accent cursor-pointer gap-1.5"
              onClick={() => handleNavigate("ai_chat")}
              title="Abrir Chat Assistente IA"
            >
              <Bot className="size-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Chat IA</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-border bg-card text-xs text-foreground hover:bg-accent cursor-pointer gap-1.5"
              onClick={() => setAiSettingsOpen(true)}
              title="Configurar OpenAI API Key"
            >
              <KeyRound className="size-3.5 text-muted-foreground" />
              <span className="hidden xl:inline">Config IA</span>
            </Button>
            {onOpenLanding && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-border bg-card text-xs text-foreground hover:bg-accent cursor-pointer"
                onClick={onOpenLanding}
              >
                <Globe className="mr-1.5 size-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Landing Page</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="hidden h-8 gap-2 rounded-lg border-border bg-muted/50 text-xs text-muted-foreground hover:bg-accent hover:text-foreground md:inline-flex cursor-pointer"
              onClick={() => openGlobalWithQuery("")}
            >
              <Search className="size-3.5" />
              <span>Busca Global</span>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                Ctrl+K
              </kbd>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="size-8 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={toggleTheme}
              title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
            >
              {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-lg bg-primary text-xs text-primary-foreground hover:bg-primary/90 cursor-pointer"
              onClick={() => handleNavigate("import")}
            >
              <FolderUp className="mr-1.5 size-3.5" />
              Importar
            </Button>
            {onLogout && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground lg:hidden"
                onClick={onLogout}
                title="Tela de Login"
              >
                <LogOut className="size-4" />
              </Button>
            )}
          </div>
        </header>

        <main
          className={
            isFullHeightTab
              ? "flex flex-1 flex-col h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden p-0"
              : "flex-1 p-4 lg:p-6"
          }
        >
          <div
            className={
              isFullHeightTab
                ? "flex flex-1 flex-col min-h-0 h-full w-full overflow-hidden"
                : "mx-auto max-w-[1600px]"
            }
            key={refreshTick}
          >
            {activeTab === "overview" && (
              <OverviewView
                onOpenDeal={setSelectedDealId}
                onNavigate={handleNavigate}
              />
            )}
            {activeTab === "pipelines" && (
              <PipelinesView onOpenDeal={setSelectedDealId} />
            )}
            {activeTab === "dou" && (
              <DouRadarView onOpenDeal={setSelectedDealId} />
            )}
            {activeTab === "organizations" && (
              <OrganizationsView
                onOpenDeal={setSelectedDealId}
                initialSelectedId={selectedOrgId}
              />
            )}
            {activeTab === "people" && (
              <PeopleView
                onOpenDeal={setSelectedDealId}
                initialSelectedId={selectedPersonId}
              />
            )}
            {activeTab === "activities" && (
              <ActivitiesView onOpenDeal={setSelectedDealId} />
            )}
            {activeTab === "proposals" && (
              <ProposalsView onOpenDeal={setSelectedDealId} />
            )}
            {activeTab === "import" && (
              <ImportCenterView onOpenDeal={setSelectedDealId} />
            )}
            {activeTab === "ai_chat" && (
              <AiChatView onOpenAiSettings={() => setAiSettingsOpen(true)} />
            )}
            {activeTab === "ai_prompts" && <PromptStudioView />}
            {activeTab === "whatsapp_inbox" && <WhatsAppInboxView />}
            {activeTab === "account" && currentUser && onAccountChange && (
              <AccountView key={currentUser.id} user={currentUser} onChange={onAccountChange} emailConfirmationFailed={emailConfirmationFailed} />
            )}
            {activeTab === "editorial" && (
              <EditorialBlogView onOpenAiSettings={() => setAiSettingsOpen(true)} />
            )}
            {activeTab === "email_marketing" && (
              <EmailMarketingView onOpenAiSettings={() => setAiSettingsOpen(true)} />
            )}
            {activeTab === "analytics" && <AnalyticsView />}
            {activeTab === "sdr_ops" && (
              <SdrOperationsView
                onOpenDeal={setSelectedDealId}
                onOpenAiSettings={() => setAiSettingsOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      <AiSettingsDialog
        open={aiSettingsOpen}
        onOpenChange={setAiSettingsOpen}
        onSaved={() => setRefreshTick((v) => v + 1)}
      />

      {/* Deal Dossier 360 Drawer */}
      <DealDossierSheet
        dealId={selectedDealId}
        onClose={() => setSelectedDealId(null)}
        onUpdated={() => setRefreshTick((v) => v + 1)}
      />

      {/* Global Search CommandDialog (server-backed Supabase + workspace search) */}
      <CommandDialog
        open={cmdOpen}
        onOpenChange={setCmdOpen}
        shouldFilter={false}
        title="Busca Global Target CRM"
        description="Pesquise negócios, CNPJs, empresas DOU, contatos e módulos do workspace em tempo real."
      >
        <CommandInput
          placeholder="Buscar empresa, CNPJ, negócio #ID, pessoa, e-mail, DOU ou módulo..."
          value={cmdQuery}
          onValueChange={setCmdQuery}
        />

        {/* Scope filter bar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2.5 py-2 bg-muted/30">
          {GLOBAL_SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCmdScope(s.id)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium cursor-pointer",
                cmdScope === s.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
          {cmdLoading && (
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              Buscando no Supabase...
            </span>
          )}
        </div>

        <CommandList className="max-h-96">
          {!hasAnyCmdResults && (
            <CommandEmpty>
              {cmdLoading
                ? "Consultando Supabase Postgres (24.534+ registros)..."
                : "Nenhum registro ou módulo encontrado para essa busca."}
            </CommandEmpty>
          )}

          {showWorkspaceInCmd && cmdNavMatches.length > 0 && (
            <CommandGroup heading="Workspace & Módulos">
              {cmdNavMatches.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`nav-${item.id}`}
                    onSelect={() => {
                      handleNavigate(item.id);
                      setCmdOpen(false);
                    }}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {showDealsInCmd && cmdDeals.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={`Negócios & DOU (${cmdDeals.length})`}>
                {cmdDeals.map((d) => (
                  <CommandItem
                    key={`deal-${d.id}`}
                    value={`deal-${d.id}`}
                    onSelect={() => {
                      setSelectedDealId(d.id);
                      setCmdOpen(false);
                    }}
                  >
                    <Briefcase className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        #{d.id} · {d.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {d.pipeline_name} → {d.stage_name}
                        {d.org_name ? ` · ${d.org_name}` : ""}
                        {d.cnpj ? ` · CNPJ ${d.cnpj}` : ""}
                      </div>
                    </div>
                    {d.value > 0 && (
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {formatMoney(d.value, d.currency)}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {showOrgsInCmd && cmdOrgs.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={`Organizações (${cmdOrgs.length})`}>
                {cmdOrgs.map((org) => (
                  <CommandItem
                    key={`org-${org.id}`}
                    value={`org-${org.id}`}
                    onSelect={() => {
                      setSelectedOrgId(org.id);
                      handleNavigate("organizations");
                      setCmdOpen(false);
                    }}
                  >
                    <Building2 className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{org.name}</div>
                      {org.address && (
                        <div className="truncate text-xs text-muted-foreground">{org.address}</div>
                      )}
                    </div>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {org.open_deals_count} abertos
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {showPeopleInCmd && cmdPeople.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={`Pessoas & Decisores (${cmdPeople.length})`}>
                {cmdPeople.map((person) => (
                  <CommandItem
                    key={`person-${person.id}`}
                    value={`person-${person.id}`}
                    onSelect={() => {
                      setSelectedPersonId(person.id);
                      handleNavigate("people");
                      setCmdOpen(false);
                    }}
                  >
                    <Users className="size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{person.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {person.primary_email ||
                          person.primary_phone ||
                          person.org_name ||
                          "Sem contato"}
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
