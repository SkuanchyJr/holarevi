import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Plus,
  FlaskConical,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type LeadStatus =
  | "pending"
  | "called"
  | "not_interested"
  | "call_later"
  | "sale_closed";

interface AffiliateMe {
  id: string;
  username: string;
  commissionPct: number;
  zone?: string | null;
  status: "active" | "paused";
}

interface Lead {
  id: string;
  businessName: string;
  city?: string | null;
  category?: string | null;
  totalReviews?: number | null;
  unansweredReviews?: number | null;
  avgRating?: number | string | null;
  reviewsPerDay?: number | string | null;
  replyPct?: number | string | null;
  website?: string | null;

  address?: string | null;
  phone?: string | null;
  email?: string | null;
  googleMapsUrl?: string | null;

  status: LeadStatus;
  notes?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

// statusLabel moved inside component to use t()

const statusBadgeVariant = (s: LeadStatus) => {
  if (s === "sale_closed") return "default";
  if (s === "pending") return "secondary";
  if (s === "call_later") return "outline";
  if (s === "called") return "outline";
  return "destructive";
};

export default function AffiliateDashboard() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const statusLabels: Record<LeadStatus, string> = {
    pending: t("affiliate.status.pending"),
    called: t("affiliate.status.called"),
    not_interested: t("affiliate.status.not_interested"),
    call_later: t("affiliate.status.call_later"),
    sale_closed: t("affiliate.status.sale_closed"),
  };

  // Sale dialog
  const [saleLead, setSaleLead] = useState<Lead | null>(null);
  const [saleEmail, setSaleEmail] = useState("");
  const [salePlan, setSalePlan] = useState("49");
  const [saleComment, setSaleComment] = useState("");

  // Notes dialog
  const [notesLead, setNotesLead] = useState<Lead | null>(null);
  const [notesText, setNotesText] = useState("");

  // Add leads dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addText, setAddText] = useState("");

  // Fetch affiliate session/me
  const { data: me, isLoading: meLoading, error: meError } = useQuery<AffiliateMe>({
    queryKey: ["/api/affiliate/me"],
    retry: false,
  });

  // If the affiliate session expired (e.g. server restarted), bounce to login.
  useEffect(() => {
    if (meError && /401|unauth/i.test(String((meError as any)?.message || ""))) {
      setLocation(`/${language}/affiliate/login`);
    }
  }, [meError, language, setLocation]);

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/affiliate/leads"],
    retry: false,
    enabled: !!me,
  });

  const stats = useMemo(() => {
    const list = leads || [];
    const assigned = list.length;
    const contacted = list.filter((l) => l.status !== "pending").length;
    const sales = list.filter((l) => l.status === "sale_closed").length;
    const conversion = assigned > 0 ? Math.round((sales / assigned) * 100) : 0;

    return { assigned, contacted, sales, conversion };
  }, [leads]);

  const logout = async () => {
    try {
      await fetch("/api/affiliate/logout", { method: "POST", credentials: "include" });
    } catch {}
    setLocation(`/${language}/affiliate/login`);
  };

  const launchDemo = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/affiliate/demo/launch", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to launch demo");
      return res.json();
    },
    onSuccess: () => {
      // Force /api/auth/user refetch on next mount and navigate to product.
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      window.location.href = `/${language}/`;
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("demo.launchError"),
        variant: "destructive",
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (payload: { leadId: string; status: LeadStatus }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/affiliate/leads/${payload.leadId}/status`,
        { status: payload.status },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/leads"] });
    },
    onError: (err: any) => {
      toast({
        title: t("common.error"),
        description: err?.message || t("affiliate.dashboard.errors.updateStatus"),
        variant: "destructive",
      });
    },
  });

  const saveNotes = useMutation({
    mutationFn: async (payload: { leadId: string; notes: string }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/affiliate/leads/${payload.leadId}/notes`,
        { notes: payload.notes },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/leads"] });
      setNotesLead(null);
      setNotesText("");
      toast({ title: t("common.success"), description: t("affiliate.dashboard.dialogs.notes.success") });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("affiliate.dashboard.errors.saveNotes"),
        variant: "destructive",
      });
    },
  });

  const addLeads = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/affiliate/leads/bulk-text", { text });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/leads"] });
      setAddOpen(false);
      setAddText("");
      toast({
        title: t("common.success"),
        description: `${data?.created ?? 0} ${t("affiliate.dashboard.dialogs.add.successDesc")}`,
      });
    },
    onError: (err: any) => {
      toast({
        title: t("common.error"),
        description: err?.message || t("affiliate.dashboard.dialogs.add.error"),
        variant: "destructive",
      });
    },
  });

  const submitSale = useMutation({
    mutationFn: async (payload: {
      leadId: string;
      businessEmail: string;
      planSold: number;
      comment?: string;
    }) => {
      const res = await apiRequest("POST", "/api/affiliate/sales", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/leads"] });
      setSaleLead(null);
      setSaleEmail("");
      setSalePlan("49");
      setSaleComment("");
      toast({
        title: t("affiliate.dashboard.dialogs.sale.successTitle"),
        description: t("affiliate.dashboard.dialogs.sale.successDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("affiliate.dashboard.errors.submitSale"),
        variant: "destructive",
      });
    },
  });

  const openNotes = (lead: Lead) => {
    setNotesLead(lead);
    setNotesText(lead.notes || "");
  };

  const openSale = (lead: Lead) => {
    setSaleLead(lead);
    setSaleEmail(lead.email || "");
    setSalePlan("49");
    setSaleComment("");
  };

  if (meLoading || leadsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              {t("affiliate.dashboard.title")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {me?.username ? t("affiliate.dashboard.loginAs", { username: me.username }) : " "}
              {me?.zone ? ` • ${t("affiliate.dashboard.zone", { zone: me.zone })}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => launchDemo.mutate()}
              disabled={launchDemo.isPending}
              data-testid="button-launch-demo"
            >
              {launchDemo.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FlaskConical className="h-4 w-4 mr-2" />
              )}
              {t("demo.launchButton")}
            </Button>
            <Button onClick={() => setAddOpen(true)} data-testid="button-add-leads">
              <Plus className="h-4 w-4 mr-2" />
              {t("affiliate.dashboard.actions.addLeads")}
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("affiliate.dashboard.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("affiliate.dashboard.stats.assigned")}</CardDescription>
              <CardTitle className="text-3xl">{stats.assigned}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("affiliate.dashboard.stats.assignedDesc")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("affiliate.dashboard.stats.contacted")}</CardDescription>
              <CardTitle className="text-3xl">{stats.contacted}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("affiliate.dashboard.stats.contactedDesc")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("affiliate.dashboard.stats.sales")}</CardDescription>
              <CardTitle className="text-3xl">{stats.sales}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {t("affiliate.dashboard.stats.salesDesc")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("affiliate.dashboard.stats.conversion")}</CardDescription>
              <CardTitle className="text-3xl">{stats.conversion}%</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("affiliate.dashboard.stats.conversionDesc")}
            </CardContent>
          </Card>
        </div>

        {/* Leads list */}
        <Card>
          <CardHeader>
            <CardTitle>{t("affiliate.dashboard.leads.title")}</CardTitle>
            <CardDescription>
              {t("affiliate.dashboard.leads.subtitle")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!leads || leads.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                {t("affiliate.dashboard.leads.empty")}
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="border rounded-lg p-4 flex flex-col gap-3"
                    data-testid={`lead-${lead.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate max-w-[520px]">
                            {lead.businessName}
                          </p>
                          <Badge variant={statusBadgeVariant(lead.status)}>
                            {statusLabels[lead.status]}
                          </Badge>
                        </div>

                        <div className="text-sm text-muted-foreground flex flex-wrap gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.city}
                          </span>
                          {lead.category && <span>{lead.category}</span>}
                          {lead.avgRating != null && <span>⭐ {Number(lead.avgRating).toFixed(1)}</span>}
                          {lead.totalReviews != null && <span>{lead.totalReviews} {t("affiliate.dashboard.leads.reviews")}</span>}
                          {lead.unansweredReviews != null && <span>{lead.unansweredReviews} {t("affiliate.dashboard.leads.unanswered")}</span>}
                          {lead.reviewsPerDay != null && <span>{Number(lead.reviewsPerDay).toFixed(1)}{t("affiliate.dashboard.leads.perDay")}</span>}
                          {lead.replyPct != null && <span>{Number(lead.replyPct).toFixed(0)}% {t("affiliate.dashboard.leads.replied")}</span>}
                        </div>

                        <div className="text-sm text-muted-foreground flex flex-wrap gap-4 mt-2">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </a>
                          )}
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 hover:underline"
                            >
                              <Globe className="h-3 w-3" />
                              {t("affiliate.dashboard.leads.website")}
                            </a>
                          )}
                          {lead.googleMapsUrl && (
                            <a
                              href={lead.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 hover:underline"
                            >
                              <MapPin className="h-3 w-3" />
                              {t("affiliate.dashboard.leads.maps")}
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={lead.status}
                          onValueChange={(v) =>
                            updateStatus.mutate({
                              leadId: lead.id,
                              status: v as LeadStatus,
                            })
                          }
                        >
                          <SelectTrigger className="w-[170px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">{t("affiliate.status.pending")}</SelectItem>
                            <SelectItem value="called">{t("affiliate.status.called")}</SelectItem>
                            <SelectItem value="not_interested">
                              {t("affiliate.status.not_interested")}
                            </SelectItem>
                            <SelectItem value="call_later">
                              {t("affiliate.status.call_later")}
                            </SelectItem>
                            <SelectItem value="sale_closed">
                              {t("affiliate.status.sale_closed")}
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={() => openNotes(lead)}>
                          {t("affiliate.dashboard.actions.notes")}
                        </Button>

                        <Button onClick={() => openSale(lead)}>
                          {t("affiliate.dashboard.actions.reportSale")}
                        </Button>
                      </div>
                    </div>

                    {lead.notes && (
                      <div className="text-sm bg-muted/40 rounded-md p-3">
                        <span className="font-medium">{t("affiliate.dashboard.leads.notesLabel")}</span>{" "}
                        <span className="text-muted-foreground whitespace-pre-wrap">
                          {lead.notes}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add leads dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setAddText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("affiliate.dashboard.dialogs.add.title")}</DialogTitle>
            <DialogDescription>
              {t("affiliate.dashboard.dialogs.add.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t("affiliate.dashboard.dialogs.add.label")}</Label>
            <Textarea
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              rows={10}
              placeholder={
                "Bar Pepe | Tarragona | 600 111 222 | bar@pepe.com | Cliente recomendado\n" +
                "Restaurante Luna | Reus | 977 000 000 | hola@luna.es\n" +
                "Café Central"
              }
              data-testid="input-add-leads-text"
            />
            <p className="text-xs text-muted-foreground">
              {t("affiliate.dashboard.dialogs.add.help")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setAddText(""); }}>
              {t("affiliate.dashboard.dialogs.add.cancel")}
            </Button>
            <Button
              onClick={() => addLeads.mutate(addText)}
              disabled={!addText.trim() || addLeads.isPending}
              data-testid="button-submit-add-leads"
            >
              {addLeads.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("affiliate.dashboard.dialogs.add.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes dialog */}
      <Dialog open={!!notesLead} onOpenChange={(o) => !o && setNotesLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("affiliate.dashboard.dialogs.notes.title")}</DialogTitle>
            <DialogDescription>
              {t("affiliate.dashboard.dialogs.notes.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>{t("affiliate.dashboard.actions.notes")}</Label>
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder={t("affiliate.dashboard.dialogs.notes.placeholder")}
              rows={6}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesLead(null)}>
              {t("affiliate.dashboard.dialogs.notes.cancel")}
            </Button>
            <Button
              onClick={() =>
                notesLead &&
                saveNotes.mutate({ leadId: notesLead.id, notes: notesText })
              }
              disabled={saveNotes.isPending}
            >
              {saveNotes.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {saveNotes.isPending ? t("affiliate.dashboard.dialogs.notes.saving") : t("affiliate.dashboard.dialogs.notes.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sale dialog */}
      <Dialog open={!!saleLead} onOpenChange={(o) => !o && setSaleLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("affiliate.dashboard.dialogs.sale.title")}</DialogTitle>
            <DialogDescription>
              {t("affiliate.dashboard.dialogs.sale.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("affiliate.dashboard.dialogs.sale.email")}</Label>
              <Input
                value={saleEmail}
                onChange={(e) => setSaleEmail(e.target.value)}
                placeholder={t("affiliate.dashboard.dialogs.sale.emailPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("affiliate.dashboard.dialogs.sale.plan")}</Label>
              <Select value={salePlan} onValueChange={setSalePlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="49">€49 (Local)</SelectItem>
                  <SelectItem value="99">€99 (Pro)</SelectItem>
                  <SelectItem value="199">€199 (Business)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("affiliate.dashboard.dialogs.sale.comments")}</Label>
              <Textarea
                value={saleComment}
                onChange={(e) => setSaleComment(e.target.value)}
                placeholder={t("affiliate.dashboard.dialogs.sale.commentsPlaceholder")}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaleLead(null)}>
              {t("affiliate.dashboard.dialogs.sale.cancel")}
            </Button>
            <Button
              onClick={() =>
                saleLead &&
                submitSale.mutate({
                  leadId: saleLead.id,
                  businessEmail: saleEmail,
                  planSold: Number(salePlan),
                  comment: saleComment || undefined,
                })
              }
              disabled={!saleEmail || submitSale.isPending}
            >
              {submitSale.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {submitSale.isPending ? t("affiliate.dashboard.dialogs.sale.submitting") : t("affiliate.dashboard.dialogs.sale.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
