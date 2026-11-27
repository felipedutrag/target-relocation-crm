"use client";

import { CheckCircle2, Loader2, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Status = "open" | "connecting" | "close";
type Connection = { state: Status; qr?: string | null; error?: string };

async function readConnection(signal: AbortSignal, pair = false): Promise<Connection> {
  const response = await fetch("/api/whatsapp/connection", {
    method: pair ? "POST" : "GET",
    headers: pair ? { "X-Target-Action": "pair-whatsapp" } : {},
    cache: "no-store",
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Não foi possível consultar a conexão.");
  return result;
}

export function WhatsAppConnectionDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Status | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canPair, setCanPair] = useState(false);
  const pairing = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const connection = await readConnection(abort.signal);
        if (abort.signal.aborted) return;
        setState(connection.state);
        setCanPair(true);
        if (connection.state === "open") {
          pairing.current?.abort();
          setQr(null);
          setError("");
        }
        timer = setTimeout(() => void poll(), 3000);
      } catch (cause) {
        if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha ao consultar a conexão.");
      }
    }
    void poll();
    return () => { abort.abort(); clearTimeout(timer); pairing.current?.abort(); };
  }, [open]);

  function changeOpen(next: boolean) {
    if (!next) {
      setQr(null);
      setState(null);
      setCanPair(false);
      setError("");
      setBusy(false);
    }
    setOpen(next);
  }

  async function generateQr() {
    const abort = new AbortController();
    pairing.current = abort;
    setBusy(true);
    setError("");
    setQr(null);
    try {
      const connection = await readConnection(abort.signal, true);
      if (abort.signal.aborted) return;
      setState(connection.state);
      setQr(connection.qr ?? null);
      if (!connection.qr && connection.state !== "open") {
        setError("O código ainda não ficou disponível. Aguarde alguns segundos e tente novamente.");
      }
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha ao gerar o código.");
    } finally {
      if (pairing.current === abort) {
        pairing.current = null;
        if (!abort.signal.aborted) setBusy(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="w-full justify-start gap-2" />}>
        <QrCode className="size-4" /> Conectar WhatsApp
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>WhatsApp do Anderley</DialogTitle>
          <DialogDescription>
            Abra o WhatsApp no celular e acesse Aparelhos conectados → Conectar um aparelho.
          </DialogDescription>
        </DialogHeader>
        {state === "open" ? (
          <p role="status" className="flex items-center gap-2 rounded-lg border p-4 text-sm font-medium">
            <CheckCircle2 className="size-5 text-emerald-600" /> WhatsApp conectado
          </p>
        ) : (
          <>
            {qr && (
              <div className="mx-auto w-full max-w-[250px] rounded-xl bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- a Evolution fornece um PNG temporário como data URL. */}
                <img src={qr} width={226} height={226} className="block h-auto w-full" alt="Código QR para conectar o WhatsApp do Anderley" />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {canPair && (
              <Button onClick={() => void generateQr()} disabled={busy} className="w-full">
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                {busy ? "Gerando código…" : qr ? "Gerar outro código" : "Gerar código QR"}
              </Button>
            )}
            {!canPair && !error && <p role="status" className="text-sm text-muted-foreground">Consultando conexão…</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
