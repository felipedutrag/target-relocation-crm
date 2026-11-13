"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Globe2,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProposalItem, ProposalRecord, ServiceCatalogItem } from "./types";
import { formatDate, formatMoney } from "./utils";

interface ProposalsViewProps {
  onOpenDeal: (dealId: number) => void;
}

export function ProposalsView({ onOpenDeal }: ProposalsViewProps) {
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [countryFilter, setCountryFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [previewProposal, setPreviewProposal] = useState<ProposalRecord | null>(null);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [propTitle, setPropTitle] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [countryRoute, setCountryRoute] = useState("Brasil (Relocation & Imigração)");
  const [currency, setCurrency] = useState<"BRL" | "USD">("BRL");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState(
    "Pagamento: 50% na contratação e 50% na conclusão. Validade da proposta: 30 dias. Taxas governamentais/consulares cobradas à parte via Nota de Débito."
  );
  const [selectedItems, setSelectedItems] = useState<ProposalItem[]>([]);

  async function loadData() {
    const res = await fetch("/api/proposals");
    const json = await res.json();
    setServices(json.services || []);
    setProposals(json.proposals || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredServices = services.filter((s) => {
    if (countryFilter !== "all" && s.country !== countryFilter) return false;
    if (catFilter !== "all" && s.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function addCatalogServiceToBuilder(svc: ServiceCatalogItem) {
    setCurrency(svc.currency);
    setSelectedItems((prev) => [
      ...prev,
      {
        name: svc.name,
        beneficiaries: svc.unit || "1 Pessoa",
        description: svc.description,
        quantity: 1,
        unit_price: svc.price || 0,
        subtotal: svc.price || 0,
      },
    ]);
    setBuilderOpen(true);
  }

  const builderSubtotal = selectedItems.reduce((a, b) => a + b.subtotal, 0);
  const builderTotal = Math.max(0, builderSubtotal - Number(discount || 0));

  async function saveProposal() {
    if (!propTitle.trim() || selectedItems.length === 0) return;
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: propTitle,
        client_company: clientCompany,
        client_contact: clientContact,
        client_email: clientEmail,
        client_phone: clientPhone,
        country_route: countryRoute,
        currency,
        discount_amount: Number(discount || 0),
        items: selectedItems,
        notes,
        status: "Enviada",
      }),
    });
    if (res.ok) {
      setBuilderOpen(false);
      setPropTitle("");
      setClientCompany("");
      setClientContact("");
      setSelectedItems([]);
      await loadData();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
            Propostas Comerciais & Catálogo de Serviços
          </h1>
          <p className="text-sm text-muted-foreground">
            Extraído diretamente dos documentos comerciais reais (PneuStore PDF, Colégio Magister XLSX e Orçamento AF XLSX)
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setBuilderOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova Proposta Comercial
        </Button>
      </div>

      <Tabs defaultValue="proposals" className="space-y-4">
        <TabsList className="h-auto flex-wrap gap-1 p-1">
          <TabsTrigger value="proposals">Propostas Emitidas ({proposals.length})</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo Oficial ({services.length} serviços)</TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {proposals.map((p) => (
              <Card key={p.id} className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {p.country_route}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {p.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base leading-snug">{p.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {p.client_company} • {p.client_contact} {p.client_phone ? `• ${p.client_phone}` : ""}
                      </CardDescription>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold text-emerald-400">
                        {formatMoney(p.total_value, p.currency)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{formatDate(p.created_at)}</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs">
                  <div className="rounded-md border border-border divide-y divide-border">
                    {p.items.map((it, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{it.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {it.beneficiaries} • Qtd {it.quantity}
                          </div>
                        </div>
                        <div className="font-mono font-semibold shrink-0">
                          {formatMoney(it.subtotal, p.currency)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {p.notes && <p className="text-[11px] text-muted-foreground">{p.notes}</p>}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      {p.deal_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => onOpenDeal(p.deal_id!)}
                        >
                          Negócio #{p.deal_id}
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                      {p.attachment_file_id && (
                        <a
                          href={`/api/files/${p.attachment_file_id}?download=1`}
                          className={buttonVariants({ size: "sm", variant: "secondary", className: "h-7 text-xs gap-1" })}
                        >
                          <Download className="h-3 w-3" />
                          Arquivo Original
                        </a>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => setPreviewProposal(p)}
                    >
                      <FileText className="h-3 w-3" />
                      Visualizar / Imprimir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-4">
          <Card>
            <CardContent className="p-3 flex flex-wrap items-center gap-2.5">
              <Input
                placeholder="Buscar serviço (ex: House Hunting, RN02, Mercosul, Pet, DNI, CNH)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 flex-1 min-w-[220px] text-xs"
              />
              <Select value={countryFilter} onValueChange={(v) => setCountryFilter(v ?? "all")}>
                <SelectTrigger className="h-8 w-[175px] text-xs">
                  <SelectValue>{countryFilter === "all" ? "Todos Países" : countryFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Países</SelectItem>
                  <SelectItem value="Brasil">Brasil (BRL)</SelectItem>
                  <SelectItem value="México / EUA">México / EUA (BRL)</SelectItem>
                  <SelectItem value="Argentina">Argentina (USD)</SelectItem>
                  <SelectItem value="Chile">Chile (USD)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={catFilter} onValueChange={(v) => setCatFilter(v ?? "all")}>
                <SelectTrigger className="h-8 w-[195px] text-xs">
                  <SelectValue>{catFilter === "all" ? "Todas Categorias" : catFilter}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  <SelectItem value="Relocation">Relocation</SelectItem>
                  <SelectItem value="Imigração & Vistos">Imigração & Vistos</SelectItem>
                  <SelectItem value="Transporte de Pets">Transporte de Pets</SelectItem>
                  <SelectItem value="Pacote / Bundle">Pacote / Bundle</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredServices.map((svc) => (
              <Card key={svc.id} className="flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Globe2 className="h-3 w-3" />
                      {svc.country}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {svc.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm pt-1">{svc.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <p className="text-muted-foreground">{svc.description}</p>
                    {svc.scope && (
                      <pre className="whitespace-pre-wrap font-sans text-[11px] p-2 rounded bg-muted/30 text-foreground/80">
                        {svc.scope}
                      </pre>
                    )}
                    {svc.notes && <div className="text-[10px] text-amber-400/90">{svc.notes}</div>}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div>
                      <div className="font-bold text-sm text-emerald-400">
                        {svc.price !== null ? formatMoney(svc.price, svc.currency) : "Sob consulta"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{svc.unit}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => addCatalogServiceToBuilder(svc)}
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Printable Proposal Preview Modal */}
      <Dialog open={previewProposal !== null} onOpenChange={(o) => !o && setPreviewProposal(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {previewProposal && (
            <div className="space-y-4 text-xs">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <div className="text-lg font-bold">Target Relocation Assessoria & Gestão em Expatriação</div>
                  <div className="text-muted-foreground">
                    CNPJ: 14.765.917/0001-91 • Av. Adolfo Pinheiro, 2054 sala 402/404 • São Paulo/SP
                  </div>
                  <div className="text-muted-foreground">
                    klaus@targetrelocation.com.br | (11) 2594-6281 / (11) 98765-2516
                  </div>
                </div>
                <Badge>{previewProposal.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase">Cliente / Empresa</div>
                  <div className="font-semibold text-sm">{previewProposal.client_company || "—"}</div>
                  <div>Contato: {previewProposal.client_contact || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase">Rota / Validade</div>
                  <div className="font-semibold">{previewProposal.country_route}</div>
                  <div>Validade: {previewProposal.valid_days} dias</div>
                </div>
              </div>

              <div className="border border-border rounded-md divide-y divide-border">
                {previewProposal.items.map((it, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{it.name}</div>
                      <div className="text-muted-foreground">{it.description}</div>
                      <div className="text-[11px] text-muted-foreground">Beneficiários: {it.beneficiaries}</div>
                    </div>
                    <div className="text-right font-mono shrink-0">
                      <div>
                        {it.quantity} × {formatMoney(it.unit_price, previewProposal.currency)}
                      </div>
                      <div className="font-bold text-emerald-400">
                        {formatMoney(it.subtotal, previewProposal.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="font-semibold text-sm">TOTAL CONSOLIDADO DA PROPOSTA</span>
                <span className="text-xl font-bold text-emerald-400">
                  {formatMoney(previewProposal.total_value, previewProposal.currency)}
                </span>
              </div>

              <div className="text-[11px] text-muted-foreground">{previewProposal.notes}</div>

              <DialogFooter>
                <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir / Salvar PDF
                </Button>
                <Button onClick={() => setPreviewProposal(null)}>Fechar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Builder Modal */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Proposta Comercial</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Título da Proposta *</Label>
              <Input
                value={propTitle}
                onChange={(e) => setPropTitle(e.target.value)}
                placeholder="Ex: Proposta Relocation + Visto RN02 — Empresa X"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Empresa Cliente</Label>
                <Input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Contato / Responsável</Label>
                <Input value={clientContact} onChange={(e) => setClientContact(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Telefone / WhatsApp</Label>
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Rota</Label>
                <Input value={countryRoute} onChange={(e) => setCountryRoute(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Moeda</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as "BRL" | "USD")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue>{currency === "BRL" ? "BRL (R$)" : "USD ($)"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Desconto ({currency})</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Itens da Proposta ({selectedItems.length})</Label>
                <Select
                  onValueChange={(code) => {
                    const svc = services.find((s) => s.code === code);
                    if (svc) addCatalogServiceToBuilder(svc);
                  }}
                >
                  <SelectTrigger className="h-7 w-[240px] text-xs">
                    <SelectValue>+ Adicionar serviço do catálogo</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        [{s.country}] {s.name} ({s.price ? formatMoney(s.price, s.currency) : "Sob consulta"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItems.length === 0 ? (
                <div className="p-4 text-center rounded border border-dashed border-border text-muted-foreground">
                  Selecione serviços do catálogo acima para compor a proposta.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((it, idx) => (
                    <div key={idx} className="p-2 rounded border border-border flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{it.name}</div>
                        <Input
                          value={it.beneficiaries}
                          onChange={(e) => {
                            const copy = [...selectedItems];
                            copy[idx].beneficiaries = e.target.value;
                            setSelectedItems(copy);
                          }}
                          className="h-6 text-[11px] mt-1"
                        />
                      </div>
                      <Input
                        type="number"
                        value={it.quantity}
                        min={1}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value || 1));
                          const copy = [...selectedItems];
                          copy[idx].quantity = qty;
                          copy[idx].subtotal = qty * copy[idx].unit_price;
                          setSelectedItems(copy);
                        }}
                        className="w-16 h-7 text-xs"
                      />
                      <Input
                        type="number"
                        value={it.unit_price}
                        onChange={(e) => {
                          const price = Number(e.target.value || 0);
                          const copy = [...selectedItems];
                          copy[idx].unit_price = price;
                          copy[idx].subtotal = copy[idx].quantity * price;
                          setSelectedItems(copy);
                        }}
                        className="w-24 h-7 text-xs"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-400"
                        onClick={() => setSelectedItems((p) => p.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Observações & Condições Comerciais</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 text-xs" />
            </div>

            <div className="p-3 rounded-md bg-muted/40 flex items-center justify-between font-bold text-sm">
              <span>Total da Proposta</span>
              <span className="text-emerald-400">{formatMoney(builderTotal, currency)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuilderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveProposal} disabled={!propTitle.trim() || selectedItems.length === 0}>
              Salvar Proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
