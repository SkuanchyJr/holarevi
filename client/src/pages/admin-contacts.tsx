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
  LogOut,
  Mail,
  Phone,
  Building,
  Calendar,
  Loader2,
  MessageSquare,
  User,
  Rocket,
  Power,
  Trash2,
  BarChart3,
  Home,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

export default function AdminContacts() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [prelaunchEnabled, setPrelaunchEnabled] = useState<boolean | null>(
    null,
  );
  const [isTogglingPrelaunch, setIsTogglingPrelaunch] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // 👈 para desactivar botón mientras borra

  useEffect(() => {
    checkAuthAndFetchContacts();
    fetchPrelaunchStatus();
  }, []);

  const fetchPrelaunchStatus = async () => {
    try {
      const response = await fetch("/api/admin/prelaunch-status", {
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) {
        setPrelaunchEnabled(data.prelaunchEnabled);
      }
    } catch (err) {
      console.error("Failed to fetch prelaunch status:", err);
    }
  };

  const togglePrelaunch = async () => {
    if (prelaunchEnabled === null) return;

    setIsTogglingPrelaunch(true);
    try {
      const endpoint = prelaunchEnabled
        ? "/api/admin/disable-prelaunch"
        : "/api/admin/enable-prelaunch";

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setPrelaunchEnabled(!prelaunchEnabled);
        toast({
          title: prelaunchEnabled
            ? "Prelaunch desactivado"
            : "Prelaunch activado",
          description: prelaunchEnabled
            ? "El sitio ahora es accesible para todos los usuarios."
            : "El sitio ahora muestra la página de prelaunch.",
        });
      } else {
        toast({
          title: "Error",
          description:
            data.message || "No se pudo cambiar el estado del prelaunch.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Ocurrió un error al cambiar el estado del prelaunch.",
        variant: "destructive",
      });
    } finally {
      setIsTogglingPrelaunch(false);
    }
  };

  const checkAuthAndFetchContacts = async () => {
    try {
      const sessionResponse = await fetch("/api/admin/session", {
        credentials: "include",
      });
      const sessionData = await sessionResponse.json();

      if (!sessionData.authenticated) {
        setLocation("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/contacts", {
        credentials: "include",
      });

      if (response.status === 401) {
        setLocation("/admin/login");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setContacts(data.contacts);
      } else {
        setError("Failed to load contacts");
      }
    } catch (err) {
      setError("An error occurred while loading contacts");
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

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este contacto? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      const response = await fetch(`/api/admin/contacts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setContacts((prev) => prev.filter((c) => c.id !== id));
        toast({
          title: "Contacto eliminado",
          description: "Contacto eliminado correctamente.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo borrar el contacto. Inténtalo de nuevo.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo borrar el contacto. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              Contact Submissions
            </h1>
            <p className="text-muted-foreground text-sm">
              {contacts.length} submission{contacts.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {prelaunchEnabled !== null && (
              <div className="flex items-center gap-2">
                <Badge
                  variant={prelaunchEnabled ? "default" : "secondary"}
                  className="flex items-center gap-1"
                  data-testid="badge-prelaunch-status"
                >
                  <Rocket className="h-3 w-3" />
                  {prelaunchEnabled ? "Prelaunch activo" : "Prelaunch inactivo"}
                </Badge>
                <Button
                  variant={prelaunchEnabled ? "destructive" : "default"}
                  size="sm"
                  onClick={togglePrelaunch}
                  disabled={isTogglingPrelaunch}
                  data-testid="button-toggle-prelaunch"
                >
                  {isTogglingPrelaunch ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-1" />
                      {prelaunchEnabled
                        ? "Desactivar prelaunch"
                        : "Activar prelaunch"}
                    </>
                  )}
                </Button>
              </div>
            )}
            <Button
              variant="outline"
              asChild
              data-testid="button-home"
            >
              <Link href="/admin">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Link>
            </Button>
            <Button
              variant="default"
              asChild
              data-testid="button-affiliates"
            >
              <Link href="/admin/affiliates">
                <User className="h-4 w-4 mr-2" />
                Affiliates
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              data-testid="button-analytics"
            >
              <Link href="/admin/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {error && (
          <div
            className="mb-4 p-4 text-destructive bg-destructive/10 rounded-md"
            data-testid="status-error"
          >
            {error}
          </div>
        )}

        {contacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" data-testid="text-empty">
                No contact submissions yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <Card key={contact.id} data-testid={`card-contact-${contact.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <CardTitle
                        className="text-lg"
                        data-testid={`text-name-${contact.id}`}
                      >
                        {contact.name}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Calendar className="h-3 w-3" />
                        {formatDate(contact.createdAt)}
                      </Badge>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(contact.id)}
                        disabled={deletingId === contact.id}
                        data-testid={`button-delete-${contact.id}`}
                      >
                        {deletingId === contact.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <CardDescription className="flex flex-wrap gap-4 mt-2">
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {contact.company}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:underline"
                        data-testid={`link-email-${contact.id}`}
                      >
                        {contact.email}
                      </a>
                    </span>
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <a
                          href={`tel:${contact.phone}`}
                          className="hover:underline"
                          data-testid={`link-phone-${contact.id}`}
                        >
                          {contact.phone}
                        </a>
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p
                    className="text-sm whitespace-pre-wrap"
                    data-testid={`text-message-${contact.id}`}
                  >
                    {contact.message}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
