import { useState, useMemo, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Loader2,
  LogOut,
  Phone,
  Mail,
  MapPin,
  Globe,
  Building2,
  CheckCircle2,
  TrendingUp,
  Users,
  Star,
  MessageSquare,
  ExternalLink,
  StickyNote,
  Search,
  Home,
  ChevronRight,
  Grip,
  BarChart3,
  XCircle,
  Clock,
  PhoneCall,
  HandshakeIcon,
  X,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

type LeadStatus = "pending" | "called" | "call_later" | "not_interested" | "sale_closed";

interface CrmLead {
  id: string;
  affiliateId: string;
  businessName: string;
  contactName: string | null;
  city: string | null;
  category: string | null;
  totalReviews: number | null;
  unansweredReviews: number | null;
  avgRating: string | null;
  reviewsPerDay: string | null;
  replyPct: string | null;
  website: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  googleMapsUrl: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  affiliateUsername: string | null;
}

interface CrmStats {
  total: number;
  closed: number;
  conversionRate: number;
  pipeline: Record<string, number>;
}

// ─── Column Definitions ─────────────────────────────────────────────────

const COLUMNS: { id: LeadStatus; label: string; color: string; bgColor: string; icon: typeof Clock }[] = [
  { id: "pending", label: "Nuevos", color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800", icon: Clock },
  { id: "called", label: "Contactados", color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800", icon: PhoneCall },
  { id: "call_later", label: "Llamar después", color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800", icon: Clock },
  { id: "not_interested", label: "No interesados", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800", icon: XCircle },
  { id: "sale_closed", label: "Venta cerrada ✅", color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800", icon: HandshakeIcon },
];

const STATUS_BADGE_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  called: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  call_later: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  not_interested: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  sale_closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
};

// ─── Lead Card (Kanban) ─────────────────────────────────────────────────

function LeadCard({ lead, onOpenDetail }: { lead: CrmLead; onOpenDetail: (lead: CrmLead) => void }) {
  const rating = parseFloat(lead.avgRating || "0");
  const reviews = lead.totalReviews || 0;
  const unanswered = lead.unansweredReviews || 0;

  return (
    <div
      className="group bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/40 active:scale-[0.98]"
      onClick={() => onOpenDetail(lead)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      data-testid={`crm-lead-${lead.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-tight truncate">{lead.businessName}</p>
          {lead.contactName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.contactName}</p>
          )}
        </div>
        <Grip className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        {lead.city && (
          <span className="flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {lead.city}
          </span>
        )}
        {rating > 0 && (
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {rating.toFixed(1)}
          </span>
        )}
        {reviews > 0 && (
          <span>{reviews} reseñas</span>
        )}
      </div>

      {/* Unanswered indicator */}
      {unanswered > 0 && (
        <div className="text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-md px-2 py-1 mb-2 font-medium">
          ⚠ {unanswered} sin responder
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Llamar"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-600" />
            </a>
          )}
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Email"
            >
              <Mail className="h-3.5 w-3.5 text-blue-600" />
            </a>
          )}
          {lead.googleMapsUrl && (
            <a
              href={lead.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded-md hover:bg-muted transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Ver en Maps"
            >
              <MapPin className="h-3.5 w-3.5 text-rose-500" />
            </a>
          )}
        </div>

        {lead.affiliateUsername && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {lead.affiliateUsername}
          </Badge>
        )}
      </div>

      {/* Notes preview */}
      {lead.notes && (
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground line-clamp-2 italic">
          <StickyNote className="h-3 w-3 inline mr-1" />
          {lead.notes}
        </div>
      )}
    </div>
  );
}

// ─── Lead Detail Sheet ──────────────────────────────────────────────────

function LeadDetailSheet({
  lead,
  onClose,
  onStatusChange,
  onNotesSave,
  isPending,
}: {
  lead: CrmLead;
  onClose: () => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onNotesSave: (id: string, notes: string) => void;
  isPending: boolean;
}) {
  const [notesText, setNotesText] = useState(lead.notes || "");
  const rating = parseFloat(lead.avgRating || "0");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {lead.businessName}
          </DialogTitle>
          <DialogDescription>
            {lead.contactName && <span>{lead.contactName} · </span>}
            {lead.category && <span>{lead.category} · </span>}
            {lead.city && <span>{lead.city}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status changer */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Estado</Label>
            <Select
              value={(lead.status as LeadStatus) || "pending"}
              onValueChange={(v) => onStatusChange(lead.id, v as LeadStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMNS.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    <span className="flex items-center gap-2">
                      <col.icon className={`h-3.5 w-3.5 ${col.color}`} />
                      {col.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{rating > 0 ? rating.toFixed(1) : "—"}</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{lead.totalReviews || 0}</p>
              <p className="text-xs text-muted-foreground">Reseñas</p>
            </div>
            <div className="border rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{lead.unansweredReviews || 0}</p>
              <p className="text-xs text-muted-foreground">Sin responder</p>
            </div>
          </div>

          {/* Contact details */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Contacto</Label>
            <div className="space-y-1.5 text-sm">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {lead.email}
                </a>
              )}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {lead.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {lead.googleMapsUrl && (
                <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary transition-colors">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Ver en Google Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {lead.address && (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  {lead.address}
                </p>
              )}
            </div>
          </div>

          {/* Extra Info */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {lead.reviewsPerDay && (
              <>
                <span className="text-muted-foreground">Reseñas/día:</span>
                <span className="font-medium">{parseFloat(lead.reviewsPerDay).toFixed(1)}</span>
              </>
            )}
            {lead.replyPct && (
              <>
                <span className="text-muted-foreground">% Respondidas:</span>
                <span className="font-medium">{parseFloat(lead.replyPct).toFixed(0)}%</span>
              </>
            )}
            {lead.affiliateUsername && (
              <>
                <span className="text-muted-foreground">Afiliado:</span>
                <span className="font-medium">{lead.affiliateUsername}</span>
              </>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notas</Label>
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Añade notas sobre la llamada, follow-up, etc."
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            onClick={() => onNotesSave(lead.id, notesText)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar notas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main CRM Page ──────────────────────────────────────────────────────

export default function AdminCRM() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAffiliate, setFilterAffiliate] = useState<string>("all");
  const [detailLead, setDetailLead] = useState<CrmLead | null>(null);

  // Auth check
  const { isLoading: authLoading } = useQuery({
    queryKey: ["/api/admin/session"],
    queryFn: async () => {
      const res = await fetch("/api/admin/session", { credentials: "include" });
      const data = await res.json();
      setIsAuthChecked(true);
      setIsAuthed(data.authenticated === true);
      if (!data.authenticated) setLocation("/admin/login");
      return data;
    },
    retry: false,
  });

  // Fetch leads
  const { data: leadsData, isLoading: leadsLoading } = useQuery<{ success: boolean; leads: CrmLead[] }>({
    queryKey: ["/api/admin/crm/leads"],
    enabled: isAuthed,
  });

  // Fetch stats
  const { data: statsData } = useQuery<{ success: boolean; stats: CrmStats }>({
    queryKey: ["/api/admin/crm/stats"],
    enabled: isAuthed,
  });

  const leads = leadsData?.leads || [];
  const stats = statsData?.stats;

  // Unique affiliates for filter
  const affiliateNames = useMemo(() => {
    const names = new Set<string>();
    leads.forEach(l => { if (l.affiliateUsername) names.add(l.affiliateUsername); });
    return Array.from(names).sort();
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const matchSearch = !search || 
        l.businessName.toLowerCase().includes(search.toLowerCase()) ||
        (l.contactName && l.contactName.toLowerCase().includes(search.toLowerCase())) ||
        (l.city && l.city.toLowerCase().includes(search.toLowerCase())) ||
        (l.phone && l.phone.includes(search)) ||
        (l.email && l.email.toLowerCase().includes(search.toLowerCase()));
      const matchAffiliate = filterAffiliate === "all" || l.affiliateUsername === filterAffiliate;
      return matchSearch && matchAffiliate;
    });
  }, [leads, search, filterAffiliate]);

  // Group by status
  const columnLeads = useMemo(() => {
    const grouped: Record<LeadStatus, CrmLead[]> = {
      pending: [],
      called: [],
      call_later: [],
      not_interested: [],
      sale_closed: [],
    };
    filteredLeads.forEach(l => {
      const status = (l.status || "pending") as LeadStatus;
      if (grouped[status]) grouped[status].push(l);
      else grouped.pending.push(l);
    });
    return grouped;
  }, [filteredLeads]);

  // Mutations
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/crm/leads/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/stats"] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/crm/leads/${id}/notes`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/crm/leads"] });
      setDetailLead(null);
      toast({ title: "Guardado", description: "Notas actualizadas." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudieron guardar las notas", variant: "destructive" });
    },
  });

  // Drag and drop handler
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) {
      updateStatus.mutate({ id: leadId, status: targetStatus });
    }
  }, [updateStatus]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
      setLocation("/admin/login");
    } catch {}
  };

  // Loading states
  if (authLoading || !isAuthChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthed) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <HandshakeIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-title">
                CRM de Ventas
              </h1>
              <p className="text-sm text-muted-foreground">
                Pipeline de leads &middot; {leads.length} leads totales
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild size="sm">
              <Link href="/admin">
                <Home className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="border-b bg-card/50 shrink-0">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-6 overflow-x-auto text-sm">
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-none">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="h-8 w-px bg-border shrink-0" />

              {COLUMNS.map((col) => (
                <div key={col.id} className="flex items-center gap-2 shrink-0">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${STATUS_BADGE_COLORS[col.id]?.replace("text-", "").includes("blue") ? "bg-blue-100 dark:bg-blue-900" : col.bgColor}`}>
                    <col.icon className={`h-4 w-4 ${col.color}`} />
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-none">{stats.pipeline[col.id] || 0}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[80px]">{col.label}</p>
                  </div>
                </div>
              ))}

              <div className="h-8 w-px bg-border shrink-0" />

              <div className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-lg leading-none">{stats.conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Conversión</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b bg-card/30 shrink-0">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar negocio, contacto, ciudad..."
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          <Select value={filterAffiliate} onValueChange={setFilterAffiliate}>
            <SelectTrigger className="w-[200px]" data-testid="select-affiliate-filter">
              <SelectValue placeholder="Todos los afiliados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los afiliados</SelectItem>
              {affiliateNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || filterAffiliate !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setFilterAffiliate("all"); }}
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
          <p className="text-xs text-muted-foreground ml-auto">
            {filteredLeads.length} de {leads.length} leads
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      {leadsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-4 min-h-0 h-full" style={{ minWidth: `${COLUMNS.length * 300}px` }}>
            {COLUMNS.map((col) => {
              const colLeads = columnLeads[col.id] || [];
              return (
                <div
                  key={col.id}
                  className={`flex flex-col w-[280px] shrink-0 rounded-xl border-2 ${col.bgColor} transition-colors`}
                  onDrop={(e) => handleDrop(e, col.id)}
                  onDragOver={handleDragOver}
                  data-testid={`column-${col.id}`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-4 py-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <col.icon className={`h-4 w-4 ${col.color}`} />
                      <h3 className="font-semibold text-sm">{col.label}</h3>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs h-5 min-w-[20px] flex items-center justify-center"
                    >
                      {colLeads.length}
                    </Badge>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-[200px]">
                    {colLeads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground">
                        <col.icon className="h-6 w-6 mb-2 opacity-30" />
                        <p>Sin leads</p>
                        <p className="text-[10px] mt-1">Arrastra aquí</p>
                      </div>
                    ) : (
                      colLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onOpenDetail={setDetailLead}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lead Detail Sheet */}
      {detailLead && (
        <LeadDetailSheet
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onStatusChange={(id, status) => {
            updateStatus.mutate({ id, status });
            // Optimistically update the detail lead
            setDetailLead(prev => prev ? { ...prev, status } : null);
          }}
          onNotesSave={(id, notes) => updateNotes.mutate({ id, notes })}
          isPending={updateNotes.isPending}
        />
      )}
    </div>
  );
}
