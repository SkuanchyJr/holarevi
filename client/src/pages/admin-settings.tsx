import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, Loader2, Home, Settings, ArrowLeft, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

interface Restaurant {
  id: string;
  name: string;
  googleBusinessId?: string | null;
}

export default function AdminSettings() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentShowcaseId, setCurrentShowcaseId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/session", { credentials: "include" });
      const data = await res.json();
      if (!data.authenticated) {
        setLocation(`/${language}/admin/login`);
        return;
      }
    } catch {
      setLocation(`/${language}/admin/login`);
      return;
    } finally {
      setIsLoadingAuth(false);
    }
    fetchData();
  };

  const jsonHeaders = { Accept: "application/json" };

  const fetchData = async () => {
    const [restaurantsRes, configRes] = await Promise.all([
      fetch("/api/admin/restaurants", { credentials: "include", headers: jsonHeaders }),
      fetch("/api/admin/config/showcase-restaurant", { credentials: "include", headers: jsonHeaders }),
    ]);
    if (!restaurantsRes.ok || !configRes.ok) return;
    const restaurantsData: Restaurant[] = await restaurantsRes.json();
    const configData: { success: boolean; restaurantId: string | null } = await configRes.json();

    setRestaurants(restaurantsData);
    const rid = configData.restaurantId ?? "";
    setCurrentShowcaseId(rid || null);
    setSelectedId(rid || "none");
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setLocation(`/${language}/admin/login`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/config/showcase-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ restaurantId: selectedId === "none" ? null : selectedId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentShowcaseId(selectedId === "none" ? null : selectedId);
        toast({ title: "Guardado", description: "Configuración actualizada." });
      } else {
        throw new Error(data.message);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "No se pudo guardar.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentRestaurant = restaurants.find((r) => r.id === currentShowcaseId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ajustes del sitio</h1>
              <p className="text-sm text-muted-foreground">
                Configuración global del landing y la plataforma
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/${language}/admin`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Panel admin
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Showcase restaurant */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle>Restaurante escaparate (Testimonios)</CardTitle>
                <CardDescription>
                  Las reseñas de Google de este negocio (con respuesta publicada) se muestran en la
                  sección "Testimonios" del landing. Vacío = se muestra el carrusel estático.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentRestaurant ? (
              <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Activo ahora: </span>
                <span className="font-medium">{currentRestaurant.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">({currentRestaurant.id})</span>
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                No configurado — el landing muestra el carrusel estático.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar negocio</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="— ninguno (carrusel estático) —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— ninguno (carrusel estático) —</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Guardar
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
