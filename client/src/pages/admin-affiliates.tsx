import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  Loader2,
  Plus,
  Users,
  Upload,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Euro,
  BarChart3,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Affiliate {
  id: string;
  username: string;
  zone: string | null;
  status: "active" | "paused";
  commissionPct: number;
  createdAt: string;
  leadCount: number;
  saleCount: number;
  totalSalesEur: number;
  totalCommission: number;
}

interface Lead {
  id: string;
  affiliateId: string;
  businessName: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

interface Sale {
  id: string;
  affiliateId: string;
  businessEmail: string | null;
  planSoldEur: number;
  status: string;
  createdAt: string;
  affiliate: { username: string } | null;
}

export default function AdminAffiliates() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAffiliate, setExpandedAffiliate] = useState<string | null>(null);
  const [affiliateLeads, setAffiliateLeads] = useState<Record<string, Lead[]>>({});
  const [isLoadingLeads, setIsLoadingLeads] = useState<string | null>(null);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newZone, setNewZone] = useState("");
  const [newCommission, setNewCommission] = useState("15");
  
  const [csvData, setCsvData] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const sessionResponse = await fetch("/api/admin/session", {
        credentials: "include",
      });
      const sessionData = await sessionResponse.json();

      if (!sessionData.authenticated) {
        setLocation("/admin/login");
        return;
      }

      await Promise.all([fetchAffiliates(), fetchSales()]);
    } catch (err) {
      console.error("Error checking auth:", err);
      setLocation("/admin/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAffiliates = async () => {
    const response = await fetch("/api/admin/affiliates", {
      credentials: "include",
    });
    const data = await response.json();
    if (data.success) {
      setAffiliates(data.affiliates);
    }
  };

  const fetchSales = async () => {
    const response = await fetch("/api/admin/affiliate-sales", {
      credentials: "include",
    });
    const data = await response.json();
    if (data.success) {
      setSales(data.sales);
    }
  };

  const fetchLeadsForAffiliate = async (affiliateId: string) => {
    if (affiliateLeads[affiliateId]) return;
    
    setIsLoadingLeads(affiliateId);
    try {
      const response = await fetch(`/api/admin/affiliates/${affiliateId}/leads`, {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setAffiliateLeads(prev => ({ ...prev, [affiliateId]: data.leads }));
      }
    } catch (err) {
      console.error("Error fetching leads:", err);
    } finally {
      setIsLoadingLeads(null);
    }
  };

  const toggleExpanded = async (affiliateId: string) => {
    if (expandedAffiliate === affiliateId) {
      setExpandedAffiliate(null);
    } else {
      setExpandedAffiliate(affiliateId);
      await fetchLeadsForAffiliate(affiliateId);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
      credentials: "include",
    });
    setLocation("/admin/login");
  };

  const handleCreateAffiliate = async () => {
    if (!newUsername || !newPassword) {
      toast({ title: "Error", description: "Username and password required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          zone: newZone || null,
          commissionPct: parseInt(newCommission) || 15,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Affiliate created" });
        setShowCreateDialog(false);
        setNewUsername("");
        setNewPassword("");
        setNewZone("");
        setNewCommission("15");
        fetchAffiliates();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to create affiliate", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAffiliate = async () => {
    if (!selectedAffiliate) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/affiliates/${selectedAffiliate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: newUsername || undefined,
          password: newPassword || undefined,
          zone: newZone,
          commissionPct: parseInt(newCommission) || undefined,
          status: selectedAffiliate.status,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Affiliate updated" });
        setShowEditDialog(false);
        fetchAffiliates();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update affiliate", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (affiliate: Affiliate) => {
    const newStatus = affiliate.status === "active" ? "paused" : "active";
    try {
      const response = await fetch(`/api/admin/affiliates/${affiliate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: `Affiliate ${newStatus}` });
        fetchAffiliates();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleDeleteAffiliate = async (id: string) => {
    if (!confirm("Are you sure? This will delete all leads and sales for this affiliate.")) return;

    try {
      const response = await fetch(`/api/admin/affiliates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast({ title: "Success", description: "Affiliate deleted" });
        fetchAffiliates();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete affiliate", variant: "destructive" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvData(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImportLeads = async () => {
    if (!selectedAffiliate || !csvData) return;

    const lines = csvData.trim().split("\n");
    if (lines.length < 2) {
      toast({ title: "Error", description: "CSV must have header row and data", variant: "destructive" });
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const leads = lines.slice(1).map(line => {
      const values = line.split(",");
      const lead: Record<string, string> = {};
      headers.forEach((header, i) => {
        lead[header] = values[i]?.trim() || "";
      });
      return {
        businessName: lead["business_name"] || lead["businessname"] || lead["business"] || lead["name"] || "Unknown",
        contactName: lead["contact_name"] || lead["contactname"] || lead["contact"] || null,
        phone: lead["phone"] || lead["tel"] || null,
        email: lead["email"] || null,
        notes: lead["notes"] || null,
      };
    }).filter(l => l.businessName !== "Unknown");

    if (leads.length === 0) {
      toast({ title: "Error", description: "No valid leads found in CSV", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/affiliates/${selectedAffiliate.id}/leads/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ leads }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: `Imported ${data.imported} leads` });
        setShowImportDialog(false);
        setCsvData("");
        setAffiliateLeads(prev => ({ ...prev, [selectedAffiliate.id]: undefined as any }));
        fetchAffiliates();
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to import leads", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSaleStatus = async (saleId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/affiliate-sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (data.success) {
        toast({ title: "Success", description: "Sale status updated" });
        fetchSales();
        fetchAffiliates();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update sale", variant: "destructive" });
    }
  };

  const openEditDialog = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setNewUsername(affiliate.username);
    setNewPassword("");
    setNewZone(affiliate.zone || "");
    setNewCommission(affiliate.commissionPct.toString());
    setShowEditDialog(true);
  };

  const openImportDialog = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setCsvData("");
    setShowImportDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalSales = sales.reduce((sum, s) => sum + (s.planSoldEur || 0), 0);
  const pendingSales = sales.filter(s => s.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <Link href="/admin/contacts">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Affiliate Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/analytics">
              <Button variant="outline" size="sm" data-testid="link-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Affiliates</CardDescription>
              <CardTitle className="text-2xl" data-testid="text-affiliate-count">{affiliates.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Affiliates</CardDescription>
              <CardTitle className="text-2xl" data-testid="text-active-count">
                {affiliates.filter(a => a.status === "active").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Sales</CardDescription>
              <CardTitle className="text-2xl" data-testid="text-total-sales">{totalSales}€</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Sales</CardDescription>
              <CardTitle className="text-2xl" data-testid="text-pending-sales">{pendingSales}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold">Affiliates</h2>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-affiliate">
                <Plus className="h-4 w-4 mr-2" />
                New Affiliate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Affiliate</DialogTitle>
                <DialogDescription>Add a new affiliate partner</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="affiliate_username"
                    data-testid="input-username"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Strong password"
                    data-testid="input-password"
                  />
                </div>
                <div>
                  <Label htmlFor="zone">Zone (optional)</Label>
                  <Input
                    id="zone"
                    value={newZone}
                    onChange={e => setNewZone(e.target.value)}
                    placeholder="Barcelona, Madrid..."
                    data-testid="input-zone"
                  />
                </div>
                <div>
                  <Label htmlFor="commission">Commission %</Label>
                  <Input
                    id="commission"
                    type="number"
                    value={newCommission}
                    onChange={e => setNewCommission(e.target.value)}
                    placeholder="15"
                    data-testid="input-commission"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreateAffiliate} 
                  disabled={isSubmitting}
                  data-testid="button-submit-create"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Affiliate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-8">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Total €</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map(affiliate => (
                  <>
                    <TableRow key={affiliate.id} data-testid={`row-affiliate-${affiliate.id}`}>
                      <TableCell className="font-medium">{affiliate.username}</TableCell>
                      <TableCell>{affiliate.zone || "-"}</TableCell>
                      <TableCell>{affiliate.commissionPct}%</TableCell>
                      <TableCell>
                        <Badge variant={affiliate.status === "active" ? "default" : "secondary"}>
                          {affiliate.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{affiliate.leadCount}</TableCell>
                      <TableCell>{affiliate.saleCount}</TableCell>
                      <TableCell>{affiliate.totalSalesEur}€</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleExpanded(affiliate.id)}
                            data-testid={`button-expand-${affiliate.id}`}
                          >
                            {expandedAffiliate === affiliate.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditDialog(affiliate)}
                            data-testid={`button-edit-${affiliate.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openImportDialog(affiliate)}
                            data-testid={`button-import-${affiliate.id}`}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleToggleStatus(affiliate)}
                            data-testid={`button-toggle-${affiliate.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteAffiliate(affiliate.id)}
                            data-testid={`button-delete-${affiliate.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedAffiliate === affiliate.id && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/50">
                          {isLoadingLeads === affiliate.id ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            <div className="py-4">
                              <h4 className="font-medium mb-2">Leads ({affiliateLeads[affiliate.id]?.length || 0})</h4>
                              {affiliateLeads[affiliate.id]?.length > 0 ? (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Business</TableHead>
                                      <TableHead>Contact</TableHead>
                                      <TableHead>Phone</TableHead>
                                      <TableHead>Email</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {affiliateLeads[affiliate.id].map(lead => (
                                      <TableRow key={lead.id}>
                                        <TableCell>{lead.businessName}</TableCell>
                                        <TableCell>{lead.contactName || "-"}</TableCell>
                                        <TableCell>{lead.phone || "-"}</TableCell>
                                        <TableCell>{lead.email || "-"}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{lead.status}</Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <p className="text-muted-foreground text-sm">No leads assigned yet</p>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {affiliates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No affiliates yet. Create your first one!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold mb-4">Recent Sales</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Business Email</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.slice(0, 20).map(sale => (
                  <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                    <TableCell>{sale.affiliate?.username || "Unknown"}</TableCell>
                    <TableCell>{sale.businessEmail || "-"}</TableCell>
                    <TableCell>{sale.planSoldEur}€</TableCell>
                    <TableCell>
                      <Badge variant={
                        sale.status === "paid" ? "default" : 
                        sale.status === "validated" ? "secondary" : "outline"
                      }>
                        {sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Select
                        value={sale.status}
                        onValueChange={(value) => handleUpdateSaleStatus(sale.id, value)}
                      >
                        <SelectTrigger className="w-[120px]" data-testid={`select-status-${sale.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="validated">Validated</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {sales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No sales recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Affiliate</DialogTitle>
            <DialogDescription>Update affiliate details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                data-testid="input-edit-username"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">New Password (leave blank to keep)</Label>
              <Input
                id="edit-password"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                data-testid="input-edit-password"
              />
            </div>
            <div>
              <Label htmlFor="edit-zone">Zone</Label>
              <Input
                id="edit-zone"
                value={newZone}
                onChange={e => setNewZone(e.target.value)}
                data-testid="input-edit-zone"
              />
            </div>
            <div>
              <Label htmlFor="edit-commission">Commission %</Label>
              <Input
                id="edit-commission"
                type="number"
                value={newCommission}
                onChange={e => setNewCommission(e.target.value)}
                data-testid="input-edit-commission"
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleUpdateAffiliate} 
              disabled={isSubmitting}
              data-testid="button-submit-edit"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Leads</DialogTitle>
            <DialogDescription>
              Upload a CSV file with leads for {selectedAffiliate?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                data-testid="input-csv-file"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Columns: business_name, contact_name, phone, email, notes
              </p>
            </div>
            {csvData && (
              <div>
                <Label>Preview</Label>
                <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
                  {csvData.split("\n").slice(0, 5).join("\n")}
                  {csvData.split("\n").length > 5 && "\n..."}
                </pre>
              </div>
            )}
            <Button 
              className="w-full" 
              onClick={handleImportLeads} 
              disabled={isSubmitting || !csvData}
              data-testid="button-submit-import"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import Leads
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
