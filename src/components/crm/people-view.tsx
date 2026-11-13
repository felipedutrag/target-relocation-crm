"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  MessageSquarePlus,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buildWhatsappUrl, formatDate, formatMoney, getLabelColorClass } from "./utils";

interface PersonRow {
  id: number;
  name: string;
  primary_email: string | null;
  primary_phone: string | null;
  org_name: string | null;
  owner_name: string | null;
  label_name: string | null;
  label_color: string | null;
  open_deals_count: number;
  won_deals_count: number;
  lost_deals_count: number;
  notes_count: number;
  update_time: string;
}

interface PeopleViewProps {
  onOpenDeal: (dealId: number) => void;
  initialSelectedId?: number | null;
}

export function PeopleView({ onOpenDeal, initialSelectedId = null }: PeopleViewProps) {
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("all");
  const [page, setPage] = useState(1);
  const [people, setPeople] = useState<PersonRow[]>([]);
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
    person: PersonRow;
    deals: Array<{ id: number; title: string; stage_name: string; status: string; value: number; currency: string }>;
    notes: Array<{ id: number; content: string; add_time: string }>;
    mailThreads: Array<{ id: number; subject: string; snippet: string }>;
  } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newOrg, setNewOrg] = useState("");

  const loadPeople = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "30", label });
      if (search.trim()) qs.set("search", search.trim());
      const res = await fetch(`/api/people?${qs.toString()}`);
      const json = await res.json();
      setPeople(json.people || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [search, label, page]);

  useEffect(() => {
    const t = setTimeout(loadPeople, 160);
    return () => clearTimeout(t);
  }, [loadPeople]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    fetch(`/api/people/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setDetail(d));
  }, [selectedId]);

  async function handleCreate() {
    if (!newName.trim()) return;
    await fetch("/api/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail, phone: newPhone, org_name: newOrg }),
    });
    setCreateOpen(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewOrg("");
    loadPeople();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Pessoas & Contatos ({total.toLocaleString("pt-BR")})
          </h1>
          <p className="text-sm text-muted-foreground">
            Base de contatos B2B, PF | B2C e decisores importada de persons.json
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nova Pessoa
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, e-mail, telefone ou empresa..."
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
              <SelectItem value="PF | B2C">PF | B2C</SelectItem>
              <SelectItem value="B2B">B2B</SelectItem>
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
                <TableHead>Contato</TableHead>
                <TableHead>Organização</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone / WhatsApp</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead className="text-center">Negócios</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead className="text-right">Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    Carregando contatos...
                  </TableCell>
                </TableRow>
              ) : (
                people.map((p) => {
                  const wa = buildWhatsappUrl(p.primary_phone);
                  const initials = (p.name || "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <TableRow
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className="cursor-pointer hover:bg-accent/40"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 max-w-[170px]">
                            <div className="font-medium text-xs truncate">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">#{p.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{p.org_name || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[195px] truncate">{p.primary_email || "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {p.primary_phone ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-mono">{p.primary_phone}</span>
                            {wa && (
                              <a
                                href={wa}
                                target="_blank"
                                rel="noreferrer"
                                title="Abrir no WhatsApp"
                                className={buttonVariants({
                                  size: "icon",
                                  variant: "ghost",
                                  className: "h-6 w-6 text-emerald-400",
                                })}
                              >
                                <MessageSquarePlus className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.label_name ? (
                          <Badge variant="outline" className={`text-[10px] ${getLabelColorClass(p.label_color)}`}>
                            {p.label_name}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        <span className="text-sky-400">{p.open_deals_count}</span> /{" "}
                        <span className="text-emerald-400">{p.won_deals_count}</span>
                      </TableCell>
                      <TableCell className="text-xs">{p.owner_name || "Klaus"}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{formatDate(p.update_time)}</TableCell>
                    </TableRow>
                  );
                })
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

      {/* Person Drawer */}
      <Sheet open={selectedId !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl p-0 flex flex-col overflow-hidden">
          {detail?.person && (
            <>
              <SheetHeader className="p-5 border-b border-border pr-12">
                <SheetTitle className="text-lg">{detail.person.name}</SheetTitle>
                <SheetDescription className="flex flex-wrap gap-3 text-xs">
                  {detail.person.primary_email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {detail.person.primary_email}
                    </span>
                  )}
                  {detail.person.primary_phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {detail.person.primary_phone}
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
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        {d.value > 0 ? formatMoney(d.value, d.currency) : ""}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>

                {detail.mailThreads.length > 0 && (
                  <div className="space-y-2 pt-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Threads de E-mail ({detail.mailThreads.length})
                    </h3>
                    {detail.mailThreads.map((m) => (
                      <div key={m.id} className="p-3 rounded-md border border-border bg-muted/20 text-xs space-y-1">
                        <div className="font-semibold">{m.subject}</div>
                        <div className="text-muted-foreground whitespace-pre-wrap">{m.snippet}</div>
                      </div>
                    ))}
                  </div>
                )}

                {detail.notes.length > 0 && (
                  <div className="space-y-2 pt-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Notas ({detail.notes.length})
                    </h3>
                    {detail.notes.slice(0, 8).map((n) => (
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
            <DialogTitle>Nova Pessoa de Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nome Completo *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Telefone / WhatsApp</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Organização</Label>
              <Input value={newOrg} onChange={(e) => setNewOrg(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Salvar Pessoa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
