import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  LogOut,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Ticket,
  Calendar,
  Percent,
  DollarSign,
  Hash,
  BarChart3,
  Users,
  Home,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface PromoCode {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  expiresAt: string | null;
  isActive: boolean;
  maxUses: number | null;
  currentUses: number;
  createdAt: string;
}

interface PromoCodeFormData {
  code: string;
  discountType: string;
  discountValue: number;
  expiresAt: string;
  isActive: boolean;
  maxUses: string;
}

const defaultFormData: PromoCodeFormData = {
  code: "",
  discountType: "percentage",
  discountValue: 10,
  expiresAt: "",
  isActive: true,
  maxUses: "",
};

export default function AdminPromoCodes() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState<PromoCodeFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndFetchPromoCodes();
  }, []);

  const checkAuthAndFetchPromoCodes = async () => {
    try {
      const sessionResponse = await fetch("/api/admin/session", {
        credentials: "include",
      });
      const sessionData = await sessionResponse.json();

      if (!sessionData.authenticated) {
        setLocation("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/promo-codes", {
        credentials: "include",
      });

      if (response.status === 401) {
        setLocation("/admin/login");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setPromoCodes(data.promoCodes);
      } else {
        setError("Failed to load promo codes");
      }
    } catch (err) {
      setError("An error occurred while loading promo codes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      setLocation("/admin/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const openCreateDialog = () => {
    setEditingPromoCode(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: PromoCode) => {
    setEditingPromoCode(promo);
    setFormData({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      expiresAt: promo.expiresAt ? promo.expiresAt.split("T")[0] : "",
      isActive: promo.isActive,
      maxUses: promo.maxUses?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast({
        title: "Error",
        description: "Promo code is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.discountValue <= 0) {
      toast({
        title: "Error",
        description: "Discount value must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (formData.discountType === "percentage" && formData.discountValue > 100) {
      toast({
        title: "Error",
        description: "Percentage discount cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const parsedMaxUses = formData.maxUses ? parseInt(formData.maxUses, 10) : null;
      const body: Record<string, any> = {
        code: formData.code.toUpperCase().trim(),
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        expiresAt: formData.expiresAt || null,
        isActive: formData.isActive,
        maxUses: isNaN(parsedMaxUses as number) ? null : parsedMaxUses,
      };

      const url = editingPromoCode
        ? `/api/admin/promo-codes/${editingPromoCode.id}`
        : "/api/admin/promo-codes";
      
      const method = editingPromoCode ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: editingPromoCode ? "Promo code updated" : "Promo code created",
          description: `Code "${body.code}" has been ${editingPromoCode ? "updated" : "created"}.`,
        });
        setIsDialogOpen(false);
        checkAuthAndFetchPromoCodes();
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to save promo code",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while saving",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this promo code? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      const response = await fetch(`/api/admin/promo-codes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setPromoCodes((prev) => prev.filter((p) => p.id !== id));
        toast({
          title: "Promo code deleted",
          description: "The promo code has been deleted successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to delete promo code",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while deleting",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (promo: PromoCode) => {
    try {
      const response = await fetch(`/api/admin/promo-codes/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !promo.isActive }),
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setPromoCodes((prev) =>
          prev.map((p) =>
            p.id === promo.id ? { ...p, isActive: !p.isActive } : p
          )
        );
        toast({
          title: promo.isActive ? "Promo code disabled" : "Promo code enabled",
          description: `Code "${promo.code}" is now ${!promo.isActive ? "active" : "inactive"}.`,
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to update promo code",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An error occurred while updating",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === "percentage") {
      return `${value}%`;
    }
    return `$${(value / 100).toFixed(2)}`;
  };

  if (isLoading) {
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
            <h1 className="text-2xl font-bold" data-testid="text-title">
              Promo Codes
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage discount codes for subscriptions
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/admin">
              <Button variant="outline" size="sm" data-testid="link-home">
                <Home className="h-4 w-4 mr-1" />
                Home
              </Button>
            </Link>
            <Link href="/admin/contacts">
              <Button variant="outline" size="sm" data-testid="link-contacts">
                <Users className="h-4 w-4 mr-1" />
                Contacts
              </Button>
            </Link>
            <Link href="/admin/analytics">
              <Button variant="outline" size="sm" data-testid="link-analytics">
                <BarChart3 className="h-4 w-4 mr-1" />
                Analytics
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-muted-foreground">
            {promoCodes.length} promo code{promoCodes.length !== 1 ? "s" : ""}
          </div>
          <Button onClick={openCreateDialog} data-testid="button-create-promo">
            <Plus className="h-4 w-4 mr-1" />
            Create Promo Code
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {promoCodes.length === 0 && !error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No promo codes yet.</p>
              <Button
                className="mt-4"
                onClick={openCreateDialog}
                data-testid="button-create-first-promo"
              >
                Create Your First Promo Code
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {promoCodes.map((promo) => (
              <Card key={promo.id} data-testid={`card-promo-${promo.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-mono">
                        {promo.code}
                      </CardTitle>
                      <CardDescription>
                        Created {formatDate(promo.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge variant={promo.isActive ? "default" : "secondary"}>
                      {promo.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      {promo.discountType === "percentage" ? (
                        <Percent className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        {formatDiscount(promo.discountType, promo.discountValue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {promo.currentUses}
                        {promo.maxUses ? `/${promo.maxUses}` : ""} uses
                      </span>
                    </div>
                    {promo.expiresAt && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Expires {formatDate(promo.expiresAt)}
                          {new Date(promo.expiresAt) < new Date() && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Expired
                            </Badge>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={promo.isActive}
                        onCheckedChange={() => handleToggleActive(promo)}
                        data-testid={`switch-active-${promo.id}`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {promo.isActive ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(promo)}
                        data-testid={`button-edit-${promo.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(promo.id)}
                        disabled={deletingId === promo.id}
                        data-testid={`button-delete-${promo.id}`}
                      >
                        {deletingId === promo.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPromoCode ? "Edit Promo Code" : "Create Promo Code"}
            </DialogTitle>
            <DialogDescription>
              {editingPromoCode
                ? "Update the promo code settings."
                : "Create a new discount code for subscriptions."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="SUMMER20"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                disabled={!!editingPromoCode}
                data-testid="input-code"
              />
              {editingPromoCode && (
                <p className="text-xs text-muted-foreground">
                  Code cannot be changed after creation
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountType">Discount Type</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger data-testid="select-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  {formData.discountType === "percentage"
                    ? "Discount %"
                    : "Amount (cents)"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  min={1}
                  max={formData.discountType === "percentage" ? 100 : undefined}
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountValue: parseInt(e.target.value) || 0,
                    })
                  }
                  data-testid="input-discount-value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  data-testid="input-expires-at"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUses">Max Uses (Optional)</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={formData.maxUses}
                  onChange={(e) =>
                    setFormData({ ...formData, maxUses: e.target.value })
                  }
                  data-testid="input-max-uses"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
                data-testid="switch-is-active"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              data-testid="button-save"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingPromoCode ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
