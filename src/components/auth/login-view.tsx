"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildCrmUser, type AccountPreferences } from "@/lib/account-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AuthenticatedUser {
  id?: string;
  name: string;
  email: string;
  role: string;
  crmOwnerName?: string | null;
  pendingEmail?: string | null;
  preferences?: AccountPreferences;
}

interface LoginViewProps {
  onSuccess: (user: AuthenticatedUser) => void;
  onBackToLanding: () => void;
}

export function LoginView({ onSuccess, onBackToLanding }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = username.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError("Informe seu e-mail corporativo e sua senha do Supabase Auth.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError || !data.user) {
        setError(
          authError?.message === "Invalid login credentials"
            ? "E-mail ou senha inválidos. Verifique suas credenciais."
            : authError?.message || "Falha ao autenticar no Supabase Auth."
        );
        return;
      }

      const { data: member } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!member) {
        await supabase.auth.signOut();
        setError("Conta autenticada sem permissão ativa neste workspace.");
        return;
      }

      onSuccess(buildCrmUser(data.user, member));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao conectar ao Supabase Auth.");
    } finally {
      setLoading(false);
    }
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
            TARGET3 · SUPABASE CLOUD
          </Badge>
        </div>

        <div className="relative z-10 my-auto max-w-lg space-y-8 py-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs font-medium text-zinc-300">
              <Sparkles className="size-3.5 text-amber-400" />
              <span>Supabase Postgres 17 + Plano de Ação IA</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-semibold tracking-[-0.03em] text-white leading-[1.15]">
              Controle absoluto de vistos, DOU, SDRs e GEO em um único workspace.
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400">
              Pipelines CRM-SDR & Outbound no PostgreSQL, publicações do Diário Oficial com
              Receita Federal, fábrica editorial GEO/SEO 1→4 canais e Copilot IA.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-2xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-2 font-medium text-zinc-200">
                <Radio className="size-3.5 text-emerald-400" />
                Supabase Postgres · Ativo com RLS
              </span>
              <span className="font-mono text-[11px] text-zinc-500">us-west-2 • pg17</span>
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
                { label: "Calendário Editorial — Nov/26 a Fev/27", status: "24 pautas", dot: "bg-sky-400" },
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

        <div className="relative z-10 flex items-center justify-between border-t border-zinc-800/80 pt-5 text-xs text-zinc-400">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-zinc-300" />
            <span>ABEMMI • ITALCAM • Câmara Árabe-Brasileira • EuRA</span>
          </span>
          <span className="font-mono text-[11px] text-zinc-500">São Paulo, BR</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Pure White Header + Supabase Auth Form */}
      <div className="flex flex-col justify-between bg-white px-6 py-6 sm:px-12 lg:px-16">
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

        <div className="mx-auto w-full max-w-[400px] py-10 space-y-6">
          <div className="space-y-2">
            <Badge
              variant="secondary"
              className="bg-zinc-100 text-zinc-700 font-medium text-[11px] px-2.5 py-0.5"
            >
              Portal Corporativo • Supabase Auth
            </Badge>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-950">
              Entrar no workspace
            </h2>
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Autenticação real via Supabase JWT para operar CRM, Blog GEO, SDRs e Assistente IA.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-user" className="text-xs font-medium text-zinc-700">
                E-mail Corporativo
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="login-user"
                  type="email"
                  autoComplete="email"
                  placeholder="seu.email@targetrelocation.com.br"
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
                <span className="text-[11px] text-zinc-400">JWT + Cookies SSR</span>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Digite sua senha de acesso"
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
              <span className="font-mono text-[11px] text-emerald-600">Supabase Auth</span>
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
                "Autenticando via Supabase..."
              ) : (
                <span className="inline-flex items-center gap-2">
                  Entrar no CRM
                  <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </form>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4 text-[11px] text-zinc-400">
          <span>Target Relocation • Alto da Boa Vista, São Paulo</span>
          <span>(11) 2594-6276</span>
        </footer>
      </div>
    </div>
  );
}
