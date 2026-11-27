"use client";

import { useState, type FormEvent } from "react";
import { Check, KeyRound, Mail, Monitor, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import type { AuthenticatedUser } from "@/components/auth/login-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { ACCOUNT_ACCENTS, START_TABS, accountInitials, readAccountPreferences, type AccountAccent, type AccountStartTab } from "@/lib/account-profile";
import { cn } from "@/lib/utils";

const themes = [
  { id: "system", label: "Sistema", icon: Monitor },
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
] as const;

const roleLabels: Record<string, string> = {
  admin: "Administrador", ops: "Operações", sdr_outbound: "SDR Outbound", sdr_inbound: "SDR Inbound",
};

type Section = "profile" | "email" | "password";

export function AccountView({ user, onChange, emailConfirmationFailed = false }: {
  user: AuthenticatedUser;
  onChange: (user: AuthenticatedUser) => void;
  emailConfirmationFailed?: boolean;
}) {
  const [profile, setProfile] = useState(() => readAccountPreferences(user.preferences));
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [nonce, setNonce] = useState("");
  const [needsNonce, setNeedsNonce] = useState(false);
  const [busy, setBusy] = useState<Section | null>(null);
  const [feedback, setFeedback] = useState<Partial<Record<Section, { error?: boolean; message: string }>>>(
    emailConfirmationFailed ? { email: { error: true, message: "Não foi possível confirmar o link. Confira o e-mail da conta ou solicite outro link." } } : {},
  );
  const accent = ACCOUNT_ACCENTS[profile.accent];
  const displayName = profile.displayName.trim() || user.name;

  function notify(section: Section, message: string, error = false) {
    setFeedback(previous => ({ ...previous, [section]: { message, error } }));
  }

  async function save(section: Section, action: () => Promise<void>) {
    setBusy(section);
    setFeedback(previous => ({ ...previous, [section]: undefined }));
    try {
      await action();
    } catch (error) {
      notify(section, error instanceof Error ? error.message : "Não foi possível concluir a alteração.", true);
    } finally {
      setBusy(null);
    }
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save("profile", async () => {
      const preferences = readAccountPreferences({ ...profile, theme: profile.theme ?? "system" });
      const { error } = await createClient().auth.updateUser({ data: { target_profile: preferences } });
      if (error) throw error;
      setProfile(preferences);
      onChange({ ...user, preferences });
      notify("profile", "Perfil e preferências salvos.");
    });
  }

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save("email", async () => {
      const normalized = email.trim().toLowerCase();
      const { data, error } = await createClient().auth.updateUser({ email: normalized }, {
        emailRedirectTo: new URL("/auth/confirm", window.location.origin).href,
      });
      if (error) throw error;
      const updated = data.user?.email?.toLowerCase() === normalized;
      onChange({ ...user, email: updated ? normalized : user.email, pendingEmail: updated ? null : normalized });
      setEmail("");
      notify("email", updated ? "E-mail da conta atualizado." : "Solicitação enviada. Confirme pelos links recebidos para concluir a troca.");
    });
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== repeatPassword) {
      notify("password", "A confirmação precisa ser igual à nova senha.", true);
      return;
    }
    void save("password", async () => {
      const auth = createClient().auth;
      if (!needsNonce) {
        const confirmed = await auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (confirmed.error || confirmed.data.user?.id !== user.id) {
          throw new Error("Não foi possível validar sua senha atual.");
        }
      }
      const { error } = await auth.updateUser({ password, ...(needsNonce ? { nonce: nonce.trim() } : {}) });
      if (error?.code === "reauthentication_needed") {
        const verification = await auth.reauthenticate();
        if (verification.error) throw verification.error;
        setNeedsNonce(true);
        notify("password", "O Supabase enviou um código de verificação. Digite-o para concluir.");
        return;
      }
      if (error) throw error;
      setCurrentPassword("");
      setPassword("");
      setRepeatPassword("");
      setNonce("");
      setNeedsNonce(false);
      notify("password", "Senha alterada com sucesso.");
    });
  }

  function sectionFeedback(section: Section) {
    const item = feedback[section];
    return item && <p className={cn("text-sm", item.error ? "text-destructive" : "text-muted-foreground")}
      role={item.error ? "alert" : "status"}>{item.message}</p>;
  }

  return (
    <section className="mx-auto max-w-6xl space-y-5 pb-8">
      <header className="relative isolate overflow-hidden rounded-2xl border bg-card px-6 py-7 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 opacity-20"
          style={{ background: `radial-gradient(ellipse at top right, ${accent.color}, transparent 68%)` }} />
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl text-xl font-semibold shadow-sm"
            style={{ backgroundColor: accent.color, color: accent.darkText ? "#171717" : "#fff" }}>
            {accountInitials(displayName)}
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight">{displayName}</h1>
            <p className="break-all text-sm text-muted-foreground">{user.email}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium sm:ml-auto">
            <ShieldCheck className="size-3.5 text-muted-foreground" /> {roleLabels[user.role] || user.role}
          </span>
        </div>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <form onSubmit={submitProfile} className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold"><UserRound className="size-4 text-muted-foreground" /> Perfil e aparência</h2>
          <div className="space-y-2">
            <Label htmlFor="account-display-name">Nome de exibição</Label>
            <Input id="account-display-name" autoComplete="nickname" maxLength={80} value={profile.displayName}
              placeholder={user.name} onChange={event => setProfile({ ...profile, displayName: event.target.value })} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tema</legend>
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" aria-pressed={(profile.theme ?? "system") === id}
                  onClick={() => setProfile({ ...profile, theme: id })}
                  className={cn("flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 text-xs transition-colors hover:bg-muted",
                    (profile.theme ?? "system") === id && "border-foreground/40 bg-muted font-medium")}>
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Cor do avatar</legend>
            <div className="flex flex-wrap gap-2.5">
              {(Object.keys(ACCOUNT_ACCENTS) as AccountAccent[]).map(key => (
                <button key={key} type="button" title={ACCOUNT_ACCENTS[key].label} aria-label={ACCOUNT_ACCENTS[key].label}
                  aria-pressed={profile.accent === key} onClick={() => setProfile({ ...profile, accent: key })}
                  className="grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-background aria-pressed:ring-2"
                  style={{ backgroundColor: ACCOUNT_ACCENTS[key].color, color: ACCOUNT_ACCENTS[key].darkText ? "#171717" : "#fff" }}>
                  {profile.accent === key && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="account-start">Tela ao entrar</Label>
            <select id="account-start" className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={profile.startTab} onChange={event => setProfile({ ...profile, startTab: event.target.value as AccountStartTab })}>
              {Object.entries(START_TABS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          {sectionFeedback("profile")}
          <Button type="submit" disabled={!!busy}>{busy === "profile" ? "Salvando…" : "Salvar preferências"}</Button>
        </form>

        <div className="space-y-5">
          <form onSubmit={submitEmail} className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Mail className="size-4 text-muted-foreground" /> E-mail de acesso</h2>
            {user.pendingEmail && <p role="status" className="break-all rounded-md bg-muted p-2.5 text-xs">Aguardando confirmação de {user.pendingEmail}.</p>}
            <div className="space-y-2">
              <Label htmlFor="account-email">Novo e-mail</Label>
              <Input id="account-email" type="email" autoComplete="email" required placeholder={user.email}
                value={email} onChange={event => setEmail(event.target.value)} />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Continue usando o e-mail atual até concluir a confirmação.</p>
            {sectionFeedback("email")}
            <Button type="submit" variant="outline" disabled={!!busy || !email.trim() || email.trim().toLowerCase() === user.email.toLowerCase()}>
              {busy === "email" ? "Solicitando…" : "Solicitar troca de e-mail"}
            </Button>
          </form>

          <form onSubmit={submitPassword} className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold"><KeyRound className="size-4 text-muted-foreground" /> Senha</h2>
            <div className="space-y-2">
              <Label htmlFor="account-password-current">Senha atual</Label>
              <Input id="account-password-current" type="password" autoComplete="current-password" required disabled={needsNonce}
                value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-password-new">Nova senha</Label>
                <Input id="account-password-new" type="password" autoComplete="new-password" required
                  value={password} onChange={event => setPassword(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-password-repeat">Confirmar nova senha</Label>
                <Input id="account-password-repeat" type="password" autoComplete="new-password" required
                  value={repeatPassword} onChange={event => setRepeatPassword(event.target.value)} />
              </div>
            </div>
            {needsNonce && (
              <div className="space-y-2">
                <Label htmlFor="account-password-code">Código recebido por e-mail</Label>
                <Input id="account-password-code" inputMode="numeric" autoComplete="one-time-code" required
                  value={nonce} onChange={event => setNonce(event.target.value)} />
              </div>
            )}
            {sectionFeedback("password")}
            <Button type="submit" variant="outline" disabled={!!busy}>{busy === "password" ? "Alterando…" : "Alterar senha"}</Button>
          </form>
        </div>
      </div>
    </section>
  );
}
