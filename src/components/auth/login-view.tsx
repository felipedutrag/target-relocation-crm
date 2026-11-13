"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Radio,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export interface AuthenticatedUser {
  name: string;
  email: string;
  role: string;
}

interface LoginViewProps {
  onSuccess: (user: AuthenticatedUser) => void;
  onBackToLanding: () => void;
}

const CRM_PROFILES: AuthenticatedUser[] = [
  {
    name: "Klaus Müller",
    email: "klaus@targetrelocation.com.br",
    role: "Admin • Diretoria",
  },
  {
    name: "Anderley Nino",
    email: "anderleynino007@gmail.com",
    role: "SDR • Outbound DOU",
  },
  {
    name: "Aurea Azevedo",
    email: "aureaazevedo@icloud.com",
    role: "Consultora • Relocation",
  },
];

export function LoginView({ onSuccess, onBackToLanding }: LoginViewProps) {
  const [username, setUsername] = useState("klaus@targetrelocation.com.br");
  const [password, setPassword] = useState("target@2026");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("Informe seu usuário/e-mail e sua senha para acessar o workspace.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const matched =
        CRM_PROFILES.find(
          (p) =>
            p.email.toLowerCase() === username.trim().toLowerCase() ||
            p.name.toLowerCase() === username.trim().toLowerCase()
        ) ?? {
          name: username.includes("@") ? username.split("@")[0] : username.trim(),
          email: username.includes("@") ? username.trim() : `${username.trim()}@targetrelocation.com.br`,
          role: "Membro do Workspace",
        };
      setLoading(false);
      onSuccess(matched);
    }, 320);
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-white text-zinc-950">
      {/* LEFT COLUMN: Linear Architectural Dark Showcase */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-100 border-r border-zinc-800">
        <div className="bg-linear-grid-dark pointer-events-none absolute inset-0" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 15% 10%, rgba(242, 154, 73, 0.14), transparent 70%), radial-gradient(50% 45% at 85% 90%, rgba(56, 189, 248, 0.12), transparent 70%)",
          }}
        />

        {/* Transparent Target Logo rendered directly on dark showcase surface */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center">
            <img
              src="/target-logo.png"
              alt="Target Relocation"
              className="h-8 w-auto object-contain brightness-175 contrast-125"
            />
          </div>
          <Badge
            variant="outline"
            className="border-zinc-700/80 bg-zinc-900/80 text-zinc-300 font-mono text-[11px]"
          >
            TARGET3 · v2.6
          </Badge>
        </div>

        {/* Center Linear Workspace Telemetry Preview */}
        <div className="relative z-10 my-auto max-w-lg space-y-8 py-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs font-medium text-zinc-300">
              <Sparkles className="size-3.5 text-amber-400" />
              <span>Workspace Operacional de Mobilidade Global</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-semibold tracking-[-0.03em] text-white leading-[1.15]">
              Controle absoluto de vistos, DOU e realocações em um único fluxo.
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Acesse pipelines CRM-SDR e Outbound, publicações do Diário Oficial enriquecidas com
              Receita Federal, dossiês 360° e gerador de propostas multi-país.
            </p>
          </div>

          {/* Mini Linear UI Mockup Card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-2xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-2 font-medium text-zinc-200">
                <Radio className="size-3.5 text-emerald-400" />
                Telemetria SQLite · Sincronizado
              </span>
              <span className="font-mono text-[11px] text-zinc-500">target3.pipedrive</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="font-mono text-lg font-semibold text-white tabular-nums">4.344</div>
                <div className="text-[11px] text-zinc-400">Negócios</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="font-mono text-lg font-semibold text-white tabular-nums">2.973</div>
                <div className="text-[11px] text-zinc-400">Empresas</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="font-mono text-lg font-semibold text-amber-400 tabular-nums">
                  10.966
                </div>
                <div className="text-[11px] text-zinc-400">Notas & Scripts</div>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {[
                { label: "PneuStore (#3432) — Proposta PDF", status: "R$ 62.315", dot: "bg-emerald-400" },
                { label: "JSL S.A (#3361) — Radar DOU RN 02", status: "Score 100", dot: "bg-amber-400" },
                { label: "Colégio Magister — Orçamento EUA/MX", status: "Anexo XLSX", dot: "bg-sky-400" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-zinc-300 truncate">
                    <span className={`size-1.5 rounded-full ${row.dot}`} />
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400 shrink-0">{row.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10 flex items-center justify-between border-t border-zinc-800/80 pt-5 text-xs text-zinc-400">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-zinc-300" />
            <span>ABEMMI • ITALCAM • Câmara Árabe-Brasileira</span>
          </span>
          <span className="font-mono text-[11px] text-zinc-500">São Paulo, BR</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Pure White Header + Crisp Linear Auth Form */}
      <div className="flex flex-col justify-between bg-white px-6 py-6 sm:px-12 lg:px-16">
        {/* Top White Header with seamless White-bg Logo */}
        <header className="flex items-center justify-between bg-white py-2 border-b border-zinc-100">
          <img
            src="/target-logo.png"
            alt="Target Relocation"
            className="h-9 w-auto object-contain"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBackToLanding}
            className="h-8 text-xs text-zinc-600 hover:text-zinc-950 cursor-pointer"
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar ao site
          </Button>
        </header>

        {/* Centered Auth Form */}
        <div className="mx-auto w-full max-w-[390px] py-10 space-y-7">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="bg-zinc-100 text-zinc-700 font-medium text-[11px] px-2.5 py-0.5"
            >
              Acesso ao Portal CRM
            </Badge>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
              Entrar no workspace
            </h2>
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Digite seu usuário ou e-mail corporativo e senha para gerenciar pipelines, propostas e
              o Radar DOU.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-user" className="text-xs font-medium text-zinc-700">
                Usuário ou E-mail
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="login-user"
                  type="text"
                  autoComplete="username"
                  placeholder="klaus@targetrelocation.com.br"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-10 pl-9 bg-white border-zinc-200 text-sm focus-visible:ring-zinc-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-xs font-medium text-zinc-700">
                  Senha
                </Label>
                <span className="text-[11px] text-zinc-400">SSO / Credencial local</span>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pl-9 pr-10 bg-white border-zinc-200 text-sm focus-visible:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer select-none">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(Boolean(v))}
                />
                <span>Manter sessão conectada</span>
              </label>
              <span className="font-mono text-[11px] text-zinc-400">SQLite Auth</span>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 text-sm font-medium cursor-pointer transition-all"
            >
              {loading ? (
                "Autenticando workspace..."
              ) : (
                <span className="inline-flex items-center gap-2">
                  Entrar no CRM
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="relative flex items-center justify-center">
              <Separator className="bg-zinc-200" />
              <span className="absolute bg-white px-2.5 text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Acesso Rápido (Equipe Pipedrive)
              </span>
            </div>

            <div className="grid gap-2">
              {CRM_PROFILES.map((profile) => {
                const selected = username.toLowerCase() === profile.email.toLowerCase();
                return (
                  <button
                    key={profile.email}
                    type="button"
                    onClick={() => {
                      setUsername(profile.email);
                      setPassword("target@2026");
                    }}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                      selected
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                        <UserCheck className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-zinc-900">
                          {profile.name}
                        </div>
                        <div className="truncate font-mono text-[11px] text-zinc-500">
                          {profile.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-zinc-500 hidden sm:inline">
                        {profile.role}
                      </span>
                      {selected && <CheckCircle2 className="size-3.5 text-zinc-900" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4 text-[11px] text-zinc-400">
          <span>Target Relocation • Alto da Boa Vista, São Paulo</span>
          <span>(11) 2594-6276</span>
        </footer>
      </div>
    </div>
  );
}
