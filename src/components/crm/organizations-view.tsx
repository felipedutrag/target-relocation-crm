"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  MapPin,
  Plus,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate, formatMoney, getLabelColorClass } from "./utils";

interface OrgRow {
  id: number;
  name: string;
  owner_name: string | null;
  label_name: string | null;
  label_color: string | null;
  address: string | null;
  website: string | null;
  linkedin: string | null;
  people_count: number;
  open_deals_count: number;
  won_deals_count: number;
  lost_deals_count: number;
  notes_count: number;
  update_time: string;
}

interface OrganizationsViewProps {
  onOpenDeal: (dealId: number) => void;
  initialSelectedId?: number | null;
}

export function OrganizationsView({ onOpenDeal, initialSelectedId = null }: OrganizationsViewProps) {
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("all");
  const [page, setPage] = useState(1);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(initialSelectedId);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
    }
  }, [initialSelectedId]);
  const [detail, setDetail] = useState<{
    organization: OrgRow;
    deals: Array<{ id: number; title: string; stage_name: string; status: string; value: number; currency: string }>;
    persons: Array<{ id: number; name: string; primary_email: string; primary_phone: string }>;
    notes: Array<{ id: number; content: string; add_time: string }>;
  } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newWebsite, setNewWebsite] = useState("");

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "30", label });
      if (search.trim()) qs.set("search", search.trim());
      const res = await fetch(`/api/organizations?${qs.toString()}`);
      const json = await res.json();
      setOrgs(json.organizations || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [search, label, page]);

  useEffect(() => {
    const t = setTimeout(loadOrgs, 160);
    return () => clearTimeout(t);
  }, [loadOrgs]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetch(`/api/organizations/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d));
  }, [selectedId]);

  async function handleCreate() {
    if (!newName.trim()) return;
    await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, address: newAddress, website: newWebsite }),
    });
    setCreateOpen(false);
    setNewName("");
    setNewAddress("");
    setNewWebsite("");
    loadOrgs();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Organizações ({total.toLocaleString("pt-BR")})
          </h1>
          <p className="text-sm text-muted-foreground">
            Empresas importadas de organizations.json & organizations-24624701-15.csv
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova Organização
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar razão social, endereço, cidade ou website..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Select
            value={label}
            onValueChange={(v) => {
              setLabel(v ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue>{label === "all" ? "Todas Etiquetas" : label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Etiquetas</SelectItem>
              <SelectItem value="DOU">DOU</SelectItem>
              <SelectItem value="Snove">Snove</SelectItem>
              <SelectItem value="Customer">Customer</SelectItem>
              <SelectItem value="Hot lead">Hot lead</SelectItem>
              <SelectItem value="Warm lead">Warm lead</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">ID</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-center">Pessoas</TableHead>
                <TableHead className="text-center">Abertos</TableHead>
                <TableHead className="text-center">Ganhos / Perd.</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead className="text-right">Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                    Carregando organizações...
                  </TableCell>
                </TableRow>
              ) : (
                orgs.map((o) => (
                  <TableRow
                    key={o.id}
                    onClick={() => setSelectedId(o.id)}
                    className="cursor-pointer hover:bg-accent/40"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">#{o.id}</TableCell>
                    <TableCell>
                      <div className="font-medium text-xs">{o.name}</div>
                      {o.website && <div className="text-[11px] text-sky-700 dark:text-sky-400 truncate max-w-[260px]">{o.website}</div>}
                    </TableCell>
                    <TableCell>
                      {o.label_name ? (
                        <Badge variant="outline" className={`text-[10px] ${getLabelColorClass(o.label_color)}`}>
                          {o.label_name}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {o.address || "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">{o.people_count}</TableCell>
                    <TableCell className="text-center font-mono text-xs text-sky-700 dark:text-sky-400">{o.open_deals_count}</TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      <span className="text-emerald-700 dark:text-emerald-400">{o.won_deals_count}</span> /{" "}
                      <span className="text-rose-700 dark:text-rose-400">{o.lost_deals_count}</span>
                    </TableCell>
                    <TableCell className="text-xs">{o.owner_name || "Klaus"}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{formatDate(o.update_time)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Total: {total.toLocaleString("pt-BR")} • Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Organization Dossier Sheet */}
      <Sheet open={selectedId !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col overflow-hidden">
          {detail?.organization && (
            <>
              <SheetHeader className="p-5 border-b border-border pr-12">
                <SheetTitle className="text-lg">{detail.organization.name}</SheetTitle>
                <SheetDescription className="flex flex-wrap gap-3 text-xs">
                  {detail.organization.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {detail.organization.address}
                    </span>
                  )}
                  {detail.organization.website && (
                    <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400">
                      <Globe className="h-3.5 w-3.5" />
                      {detail.organization.website}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-5 space-y-5">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Negócios Vinculados ({detail.deals.length})
                  </h3>
                  {detail.deals.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        setSelectedId(null);
                        onOpenDeal(d.id);
                      }}
                      className="p-2.5 rounded-md border border-border hover:bg-accent/50 cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium">{d.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {d.stage_name} • {d.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        {d.value > 0 ? formatMoney(d.value, d.currency) : ""}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pessoas na Organização ({detail.persons.length})
                  </h3>
                  {detail.persons.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma pessoa vinculada.</p>
                  ) : (
                    detail.persons.map((p) => (
                      <div key={p.id} className="p-2.5 rounded-md border border-border text-xs">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.primary_email || "Sem e-mail"} • {p.primary_phone || "Sem telefone"}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {detail.notes.length > 0 && (
                  <div className="space-y-2 pt-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Notas ({detail.notes.length})
                    </h3>
                    {detail.notes.slice(0, 6).map((n) => (
                      <div
                        key={n.id}
                        className="p-3 rounded-md border border-border text-xs bg-muted/20"
                        dangerouslySetInnerHTML={{ __html: n.content }}
                      />
                    ))}
                  </div>
                )}
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Organização</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nome / Razão Social *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Endereço</Label>
              <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Website</Label>
              <Input value={newWebsite} onChange={(e) => setNewWebsite(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Salvar Organização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
