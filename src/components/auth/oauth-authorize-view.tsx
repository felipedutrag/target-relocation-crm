"use client";

import { useState } from "react";
import { CheckCircle2, Database, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface OAuthAuthorizeParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
}

export function OAuthAuthorizeView({ params }: { params: OAuthAuthorizeParams }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingRedirect = !params.redirectUri;

  async function handleAuthorize(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e senha do Target CRM.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          client_id: params.clientId || "openai-mcp",
          redirect_uri: params.redirectUri,
          state: params.state,
          code_challenge: params.codeChallenge,
          code_challenge_method: params.codeChallengeMethod || "S256",
          scope: params.scope || "mcp:read",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.redirectTo) {
        setError(json.error || "Não foi possível autorizar a conexão MCP.");
        return;
      }
      window.location.href = json.redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na autenticação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-zinc-900 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <img src="/target-logo.png" alt="Target Relocation" className="h-8 w-auto object-contain" />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="size-3" />
            MCP Read-Only
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950">
            Autorizar Conector MCP OpenAI Cloud
          </h1>
          <p className="text-xs leading-relaxed text-zinc-600">
            Entre com seu e-mail e senha do Target Relocation CRM para conceder acesso{" "}
            <strong>100% somente leitura</strong> aos dados do banco Postgres no conector da OpenAI / ChatGPT.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 space-y-2 text-xs text-zinc-700">
          <div className="flex items-center gap-2 font-medium text-zinc-900">
            <Database className="size-3.5 text-amber-600 shrink-0" />
            <span>Escopo concedido (escopo: mcp:read)</span>
          </div>
          <ul className="space-y-1 text-[11px] text-zinc-600 pl-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
              Leitura de todas as 30 tabelas de CRM, Radar DOU, Blog & Plano 90d
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
              Execução de consultas SQL SELECT bloqueadas em modo somente leitura
            </li>
            <li className="flex items-center gap-1.5">
              <Lock className="size-3 text-zinc-500 shrink-0" />
              Chaves de API, credenciais e qualquer operação de escrita ficam bloqueadas
            </li>
          </ul>
        </div>

        {missingRedirect ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            Parâmetro <code className="font-mono">redirect_uri</code> ausente. Inicie esta conexão diretamente pela tela
            de Conectores / MCP do ChatGPT ou OpenAI Cloud usando a URL <code className="font-mono">/api/mcp</code>.
          </div>
        ) : (
          <form onSubmit={handleAuthorize} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="oauth-email" className="text-xs font-medium text-zinc-700">
                E-mail do Usuário CRM
              </Label>
              <Input
                id="oauth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="klaus@targetrelocation.com.br"
                className="h-9 text-xs bg-white border-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="oauth-pass" className="text-xs font-medium text-zinc-700">
                Senha do Usuário
              </Label>
              <Input
                id="oauth-pass"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="h-9 text-xs bg-white border-zinc-200"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-9 rounded-lg bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-medium cursor-pointer"
            >
              <KeyRound className="mr-1.5 size-3.5" />
              {submitting ? "Autenticando e autorizando..." : "Entrar e Autorizar Acesso Somente Leitura"}
            </Button>
          </form>
        )}

        <div className="border-t border-zinc-100 pt-3 flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span>Cliente: {params.clientId || "openai-mcp"}</span>
          <span>OAuth 2.1 • PKCE {params.codeChallengeMethod || "S256"}</span>
        </div>
      </div>
    </div>
  );
}
