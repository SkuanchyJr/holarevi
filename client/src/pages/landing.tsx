import { useState, useEffect } from "react";
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
  Zap,
  ArrowRight,
  Store,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  Reply,
  BarChart3,
  User,
  Palette,
  Gauge,
  Users,
  LayoutDashboard,
  Shield,
  Headphones,
  FileCheck,
  UserCheck,
  Settings,
  Building2,
  Bell,
  Calendar as CalendarIcon,
  Sparkles,
  Package,
  MessageSquare,
  Globe,
  Clock,
  PhoneCall,
  Inbox,
  Workflow,
  CheckCircle2,
  Wrench,
  Stethoscope,
  Hotel,
  Utensils,
  HeartHandshake,
} from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { Link } from "wouter";
import { ReviewDemo } from "@/components/review-demo";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Blog } from "@shared/schema";
import { SiInstagram, SiTiktok } from "react-icons/si";

type BillingCycle = "monthly" | "yearly";

const PRICING = {
  local: { monthly: 49, yearly: 470.4 },
  pro: { monthly: 99, yearly: 950.4 },
  business: { monthly: 199, yearly: 1909.6 },
};

type PlanKey = keyof typeof PRICING | "enterprise";

const PRICING_CONTENT: Record<
  PlanKey,
  {
    name: string;
    description: string;
    accent:
      | "emerald"
      | "primary"
      | "amber"
      | "slate";
    icon: JSX.Element;
    priceLabel?: string;
    ctaLabel: string;
    ctaHref: string;
    footnote?: string;
    features: { icon: JSX.Element; text: string }[];
    mostPopular?: boolean;
  }
> = {
  local: {
    name: "Local",
    description: "Para un negocio con una ubicación.",
    accent: "emerald",
    icon: <MapPin className="h-5 w-5" />,
    ctaLabel: "Probar 7 días gratis",
    ctaHref: "/api/login",
    footnote: "Sin compromiso. Si no cancelas antes de 7 días, se cobrará automáticamente 49\u20AC/mes.",
    features: [
      {
        icon: <MapPin className="h-4 w-4" />,
        text: "1 ubicación",
      },
      {
        icon: <Sparkles className="h-4 w-4" />,
        text: "Respuestas automáticas ilimitadas a reseñas nuevas",
      },
      {
        icon: <Reply className="h-4 w-4" />,
        text: "Responder reseñas antiguas",
      },
      {
        icon: <Settings className="h-4 w-4" />,
        text: "Modo automático o revisión antes de publicar",
      },
      {
        icon: <BarChart3 className="h-4 w-4" />,
        text: "Analítica básica (tendencia y sentimiento)",
      },
      {
        icon: <User className="h-4 w-4" />,
        text: "1 usuario",
      },
      {
        icon: <Palette className="h-4 w-4" />,
        text: "Plantillas y tono de marca",
      },
    ],
  },
  pro: {
    name: "Pro",
    description: "Para equipos y operaciones con varias ubicaciones.",
    accent: "primary",
    icon: <Zap className="h-5 w-5" />,
    ctaLabel: "Empezar ahora",
    ctaHref: "/api/login",
    mostPopular: true,
    features: [
      {
        icon: <MapPin className="h-4 w-4" />,
        text: "Hasta 3 ubicaciones",
      },
      {
        icon: <Sparkles className="h-4 w-4" />,
        text: "Respuestas automáticas ilimitadas a reseñas nuevas",
      },
      {
        icon: <Reply className="h-4 w-4" />,
        text: "Responder reseñas antiguas",
      },
      {
        icon: <BarChart3 className="h-4 w-4" />,
        text: "Analítica y control por ubicación",
      },
      {
        icon: <Zap className="h-4 w-4" />,
        text: "Prioridad en mejoras y nuevas funciones",
      },
      {
        icon: <Users className="h-4 w-4" />,
        text: "Hasta 3 usuarios",
      },
      {
        icon: <Palette className="h-4 w-4" />,
        text: "Plantillas avanzadas y tono consistente",
      },
      {
        icon: <Headphones className="h-4 w-4" />,
        text: "Soporte prioritario",
      },
    ],
  },
  business: {
    name: "Business",
    description: "Para cadenas y operaciones multi-ubicación con control.",
    accent: "amber",
    icon: <Building2 className="h-5 w-5" />,
    ctaLabel: "Probar gratis",
    ctaHref: "/api/login",
    footnote: "Ubicación extra: se aplica un coste adicional (según configuración).",
    features: [
      {
        icon: <MapPin className="h-4 w-4" />,
        text: "Ubicaciones incluidas (según plan)",
      },
      {
        icon: <MapPin className="h-4 w-4" />,
        text: "Añade ubicaciones extra según necesidad",
      },
      {
        icon: <LayoutDashboard className="h-4 w-4" />,
        text: "Panel avanzado multi-ubicación",
      },
      {
        icon: <Users className="h-4 w-4" />,
        text: "Equipo y colaboración",
      },
      {
        icon: <Shield className="h-4 w-4" />,
        text: "Roles y permisos",
      },
      {
        icon: <Headphones className="h-4 w-4" />,
        text: "SLA y soporte avanzado",
      },
      {
        icon: <FileCheck className="h-4 w-4" />,
        text: "Cumplimiento y buenas prácticas (GDPR)",
      },
      {
        icon: <UserCheck className="h-4 w-4" />,
        text: "Onboarding asistido",
      },
      {
        icon: <User className="h-4 w-4" />,
        text: "Responsable de cuenta",
      },
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "Integraciones, auditoría y escalabilidad a medida.",
    accent: "slate",
    icon: <Building2 className="h-5 w-5" />,
    priceLabel: "A medida",
    ctaLabel: "Hablar con ventas",
    ctaHref: "/contact",
    features: [
      {
        icon: <Settings className="h-4 w-4" />,
        text: "API e integraciones",
      },
      {
        icon: <LayoutDashboard className="h-4 w-4" />,
        text: "Conexión con CRM / sistemas internos",
      },
      {
        icon: <Zap className="h-4 w-4" />,
        text: "Automatizaciones y flujos",
      },
      {
        icon: <FileCheck className="h-4 w-4" />,
        text: "Auditoría y trazabilidad",
      },
      {
        icon: <BarChart3 className="h-4 w-4" />,
        text: "Reporting avanzado",
      },
      {
        icon: <Shield className="h-4 w-4" />,
        text: "SLA dedicado",
      },
      {
        icon: <User className="h-4 w-4" />,
        text: "Account manager",
      },
      {
        icon: <UserCheck className="h-4 w-4" />,
        text: "Onboarding y migración",
      },
    ],
  },
};

const STATS = [
  { label: "Reseñas respondidas", value: "+18.400" },
  { label: "Tiempo medio de respuesta", value: "2 min" },
  { label: "Ubicaciones gestionadas", value: "120+" },
];

const LOGOS = ["Restaurantes", "Hoteles", "Clínicas", "Estética", "Talleres", "Retail"];

const MODULES = [
  {
    icon: <Reply className="h-5 w-5" />,
    title: "Reseñas (Google)",
    desc: "Responde con consistencia y control, sin perder el contexto del negocio.",
    bullets: ["Tono de marca y plantillas", "Revisión antes de publicar (opcional)"],
  },
  {
    icon: <PhoneCall className="h-5 w-5" />,
    title: "Recepcionista IA (llamadas)",
    desc: "Convierte llamadas perdidas en atención real, con registro y seguimiento.",
    bullets: ["Derivación y mensajes", "Historial y motivos de llamada"],
  },
  {
    icon: <Inbox className="h-5 w-5" />,
    title: "Inbox (mensajes)",
    desc: "Centraliza canales para responder rápido y sin duplicados.",
    bullets: ["Bandeja única por ubicación", "Asignación a responsables"],
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Alertas y seguimiento",
    desc: "Evita incendios: incidencias críticas, tendencias y tareas pendientes.",
    bullets: ["Alertas por reseñas negativas", "SLA internos y recordatorios"],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Analíticas",
    desc: "Mide calidad, tiempos, sentimiento y evolución por ubicación.",
    bullets: ["KPIs accionables", "Comparativas entre locales"],
  },
  {
    icon: <Palette className="h-5 w-5" />,
    title: "Plantillas y tono de marca",
    desc: "Respuestas coherentes aunque rote el personal o crezca la cadena.",
    bullets: ["Guías de estilo", "Bloques reutilizables (próximamente)"],
  },
];

const DIFFERENTIATORS = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Control y auditoría",
    desc: "Trazabilidad de quién responde, qué se publica y por qué.",
  },
  {
    icon: <Workflow className="h-5 w-5" />,
    title: "Operación escalable",
    desc: "Procesos repetibles por ubicación, equipo y turnos.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Roles y permisos",
    desc: "Accesos por perfil (owner, manager, equipo).",
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Multi-ubicación real",
    desc: "Una sola vista para controlar toda la marca.",
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Integraciones",
    desc: "Conecta con tu stack (próximamente / Enterprise).",
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Velocidad con consistencia",
    desc: "Respuesta rápida sin sacrificar el tono ni el criterio.",
  },
];

const USE_CASES = [
  {
    icon: <Utensils className="h-5 w-5" />,
    title: "Restaurantes",
    bullets: ["Reduce llamadas perdidas y quejas", "Responde reseñas con tono consistente"],
  },
  {
    icon: <Hotel className="h-5 w-5" />,
    title: "Hoteles",
    bullets: ["Control por turnos y ubicaciones", "Detecta incidencias recurrentes"],
  },
  {
    icon: <Stethoscope className="h-5 w-5" />,
    title: "Clínicas",
    bullets: ["Atención rápida con trazabilidad", "Protocolos de respuesta y derivación"],
  },
  {
    icon: <HeartHandshake className="h-5 w-5" />,
    title: "Centros de estética",
    bullets: ["Mejora la conversión desde reseñas", "Respuesta inmediata a dudas frecuentes"],
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: "Talleres",
    bullets: ["Centraliza llamadas y mensajes", "Menos fricción en presupuestos y citas"],
  },
];

const FAQ = [
  {
    q: "¿HolaRevi sustituye a mi equipo?",
    a: "No. Es una infraestructura para que tu equipo responda mejor y más rápido. Puedes automatizar partes, revisar antes de publicar o trabajar en modo manual con plantillas.",
  },
  {
    q: "¿Solo sirve para reseñas de Google?",
    a: "El núcleo empieza por reseñas, pero el enfoque es centralizar atención y reputación: llamadas, mensajes, alertas y analítica. Algunos módulos pueden estar en despliegue progresivo.",
  },
  {
    q: "¿Puedo controlar el tono y lo que se publica?",
    a: "Sí. Configuras tono, plantillas y reglas. También puedes activar revisión previa para que nada se publique sin aprobación.",
  },
  {
    q: "¿Funciona para varias ubicaciones?",
    a: "Sí. La plataforma está pensada para multi-ubicación: panel unificado, comparativas y control por local. El límite depende del plan.",
  },
  {
    q: "¿Qué pasa con reseñas antiguas?",
    a: "Puedes responder reseñas antiguas además de automatizar las nuevas, según el plan. La idea es recuperar reputación sin un esfuerzo manual masivo.",
  },
  {
    q: "¿Qué métricas incluye la analítica?",
    a: "Tiempos de respuesta, volumen, sentimiento y evolución por ubicación. En planes avanzados, reporting y comparativas más completas.",
  },
  {
    q: "¿Hay roles y permisos?",
    a: "En planes Business/Enterprise puedes gestionar roles y permisos. Si tu caso requiere un esquema específico, lo vemos en Enterprise.",
  },
  {
    q: "¿Necesito una tarjeta para la prueba?",
    a: "Depende de la configuración actual de tu cuenta. Si se solicita, es para evitar interrupciones al finalizar la prueba. No se cobra durante el periodo gratuito.",
  },
];

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("mx-auto", center ? "max-w-2xl text-center" : "max-w-3xl")}>
      {eyebrow ? (
        <Badge variant="secondary" className={cn(center ? "mb-4" : "mb-3")}>
          {eyebrow}
        </Badge>
      ) : null}
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6">
        <div className="text-2xl font-bold">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function FAQItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="rounded-2xl">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
        aria-expanded={open}
      >
        <CardHeader className="p-6">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-base sm:text-lg leading-snug">{q}</CardTitle>
            <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
          </div>
        </CardHeader>
      </button>
      {open ? (
        <CardContent className="px-6 pb-6 pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function Landing() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const { data: blogsData } = useQuery<{ success: boolean; blogs: Blog[] }>({
    queryKey: ["/api/blogs"],
  });
  const blogs = blogsData?.blogs?.slice(0, 3) || [];

  const testimonials = [
    {
      text: "Antes respondíamos tarde y cada persona escribía distinto. Ahora tenemos un sistema: respuestas consistentes, seguimiento y visibilidad por ubicación.",
      author: "Operaciones, cadena de restauración",
    },
    {
      text: "Lo que más valoramos es el control. Puedes automatizar, pero también revisar y mantener el tono. Se nota en la reputación y en el equipo.",
      author: "Dirección, clínica privada",
    },
    {
      text: "Centralizar reseñas y atención reduce el ruido. Menos tareas repetidas, menos llamadas perdidas y decisiones basadas en datos.",
      author: "Manager, hotel urbano",
    },
  ];
  const totalTestimonials = testimonials.length;

  const getPrice = (planKey: keyof typeof PRICING) => {
    if (billingCycle === "yearly") {
      return Math.round(PRICING[planKey].yearly / 12);
    }
    return PRICING[planKey].monthly;
  };

  const getYearlyTotal = (planKey: keyof typeof PRICING) => {
    return PRICING[planKey].yearly;
  };

  const goPrev = () => {
    setCurrentTestimonial((prev) => (prev === 0 ? totalTestimonials - 1 : prev - 1));
  };

  const goNext = () => {
    setCurrentTestimonial((prev) => (prev === totalTestimonials - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev === totalTestimonials - 1 ? 0 : prev + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [totalTestimonials]);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {/* A) HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
          <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <Badge variant="secondary" className="mb-4">
                  Plataforma B2B para negocios locales
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                  Infraestructura de{" "}
                  <span className="text-primary">atención y reputación</span> para negocios locales
                </h1>

                <p className="mt-6 text-lg text-muted-foreground">
                  Centraliza reseñas, llamadas, mensajes y feedback en un sistema único. Automatiza lo repetible,
                  mantiene el control y escala por ubicación sin perder el tono de marca.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button size="lg" asChild data-testid="button-hero-try-free">
                    <a href="/api/login">
                      Probar gratis <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>

                  <Button size="lg" variant="outline" asChild data-testid="button-hero-demo">
                    <Link href="/contact">Ver demo</Link>
                  </Button>

                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={() => {
                      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    data-testid="button-hero-pricing"
                    className="justify-start sm:justify-center"
                  >
                    Ver precios
                  </Button>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Respuestas consistentes con plantillas y tono.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Menos llamadas perdidas con seguimiento.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Visibilidad por ubicación, equipo y tiempos.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    document.getElementById("trust")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-12 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                  aria-label="Bajar para ver más"
                  data-testid="button-scroll-down"
                >
                  Ver cómo funciona <ChevronDown className="h-4 w-4 animate-bounce" />
                </button>
              </div>

              <div className="lg:col-span-5">
                <Card className="rounded-2xl border bg-gradient-to-b from-muted/40 to-background">
                  <CardHeader className="p-6">
                    <CardTitle className="text-base">Panel unificado</CardTitle>
                    <CardDescription>
                      Una vista operativa para reputación, atención y seguimiento.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-2xl border bg-background p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Reply className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Reseñas</p>
                          </div>
                          <Badge variant="secondary">Automatizado</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Respuestas con tono de marca y revisión opcional.
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-background p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Llamadas</p>
                          </div>
                          <Badge variant="secondary">Registro</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Motivos, derivación y seguimiento sin perder contexto.
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-background p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Inbox className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Inbox</p>
                          </div>
                          <Badge variant="secondary">Centralizado</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Mensajes y tareas por ubicación, equipo y prioridad.
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-background p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <p className="text-sm font-medium">Analítica</p>
                          </div>
                          <Badge variant="secondary">KPIs</Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Tiempos, volumen, sentimiento y evolución.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3 rounded-2xl border bg-muted/30 p-4">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Diseñado para operaciones reales: turnos, rotación y multi-ubicación.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Keep existing demo component 
            <div className="mt-16">
              <ReviewDemo />
            </div>*/}
          </div>
        </div>
      </section>

      {/* B) PRUEBA SOCIAL / CONFIANZA */}
      <section id="trust" className="py-16 sm:py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Confianza y tracción"
            title="Menos caos, más control operativo"
            subtitle="Datos y señales (editables) para comunicar valor sin humo."
          />

          <div className="mx-auto mt-10 max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              {STATS.map((s) => (
                <StatCard key={s.label} label={s.label} value={s.value} />
              ))}
            </div>

            <div className="mt-10 rounded-2xl border bg-background p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Sectores que ya operan con atención y reputación como proceso (placeholder):
                </p>
                <div className="flex flex-wrap gap-2">
                  {LOGOS.map((name) => (
                    <div
                      key={name}
                      className="rounded-xl border bg-muted/30 px-3 py-1 text-xs text-muted-foreground"
                      aria-label={name}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* C) PROBLEMA → SOLUCIÓN */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-2 lg:items-start">
            <Card className="rounded-2xl">
              <CardHeader className="p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <CardTitle className="mt-6 text-2xl">El problema</CardTitle>
                <CardDescription className="mt-2 text-base">
                  La reputación y la atención suelen estar dispersas, con respuestas lentas y sin control.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-0">
                <ul className="space-y-4">
                  {[
                    "Reseñas, llamadas y mensajes en sitios distintos.",
                    "Llamadas perdidas y clientes sin respuesta.",
                    "Respuestas inconsistentes: depende de quién esté de turno.",
                    "Sin auditoría: difícil saber qué pasó y quién actuó.",
                    "Imposible escalar cuando crecen las ubicaciones.",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <div className="mt-1 h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center">
                        <span className="h-2 w-2 rounded-full bg-destructive" />
                      </div>
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-primary/30 bg-gradient-to-b from-primary/5 to-background">
              <CardHeader className="p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <CardTitle className="mt-6 text-2xl">La solución</CardTitle>
                <CardDescription className="mt-2 text-base">
                  Un sistema unificado para operar atención y reputación con consistencia, automatización y control.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8 pt-0">
                <ul className="space-y-4">
                  {[
                    "Bandeja y panel únicos por ubicación.",
                    "Automatiza lo repetible, revisa lo sensible.",
                    "Tono de marca y plantillas para respuestas coherentes.",
                    "Alertas, seguimiento y trazabilidad de acciones.",
                    "Analítica operativa para mejorar tiempos y calidad.",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild data-testid="button-problem-solution-try">
                    <a href="/api/login">
                      Probar gratis <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    data-testid="button-problem-solution-how"
                  >
                    Ver cómo funciona
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* D) CÓMO FUNCIONA */}
      <section id="how" className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Cómo funciona"
            title="De dispersión a operación en 4 pasos"
            subtitle="Implementación simple, impacto rápido."
          />

          <div className="mx-auto mt-12 max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <Store className="h-6 w-6" />,
                title: "Conecta ubicaciones",
                desc: "Centraliza tus perfiles y canales por negocio/ubicación.",
              },
              {
                icon: <Palette className="h-6 w-6" />,
                title: "Define tono y reglas",
                desc: "Plantillas, estilo y criterios de respuesta.",
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: "Automatiza y asigna",
                desc: "Responde más rápido y deriva casos sensibles.",
              },
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: "Mide y mejora",
                desc: "KPIs operativos para mejorar tiempos y calidad.",
              },
            ].map((step) => (
              <Card key={step.title} className="rounded-2xl">
                <CardHeader className="p-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {step.icon}
                  </div>
                  <CardTitle className="mt-6 text-xl">{step.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm">{step.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* E) MÓDULOS */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Módulos"
            title="La infraestructura: piezas claras, resultado operativo"
            subtitle="Empieza por lo esencial y amplía según tu operación."
          />

          <div className="mx-auto mt-12 max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <Card key={m.title} className="rounded-2xl hover-elevate">
                <CardHeader className="p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {m.icon}
                  </div>
                  <CardTitle className="mt-6 text-xl">{m.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm">{m.desc}</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8 pt-0">
                  <ul className="space-y-3">
                    {m.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-6xl rounded-2xl border bg-muted/20 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Gauge className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Pensado para operación diaria</p>
                  <p className="text-sm text-muted-foreground">
                    Turnos, rotación, multi-ubicación, control y visibilidad.
                  </p>
                </div>
              </div>
              <Button variant="outline" asChild data-testid="button-modules-demo">
                <Link href="/contact">Ver demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* F) DIFERENCIADORES */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Diferenciadores"
            title="No es un “bot”. Es un sistema con control."
            subtitle="Automatización con trazabilidad, consistencia y escalabilidad."
          />

          <div className="mx-auto mt-12 max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map((d) => (
              <Card key={d.title} className="rounded-2xl">
                <CardHeader className="p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {d.icon}
                  </div>
                  <CardTitle className="mt-6 text-xl">{d.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm">{d.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* G) CASOS DE USO */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Casos de uso"
            title="Diseñado para negocios locales con volumen real"
            subtitle="Donde la atención y la reputación impactan en ventas cada día."
          />

          <div className="mx-auto mt-12 max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((c) => (
              <Card key={c.title} className="rounded-2xl hover-elevate">
                <CardHeader className="p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    {c.icon}
                  </div>
                  <CardTitle className="mt-6 text-xl">{c.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm">
                    Beneficios directos para operación y reputación.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8 pt-0">
                  <ul className="space-y-3">
                    {c.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">{b}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* I) FAQ */}
      <section id="faq" className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="FAQ"
            title="Preguntas habituales"
            subtitle="Respuestas claras para decidir rápido."
          />

          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {FAQ.map((item, idx) => (
              <FAQItem
                key={item.q}
                q={item.q}
                a={item.a}
                open={openFaq === idx}
                onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (kept, but aligned to new positioning) */}
      <section id="testimonials" className="bg-muted/20 py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Operación real"
            title="Lo que valoran los equipos"
            subtitle="Consistencia, control y visibilidad. Eso es infraestructura."
          />

          <div className="mx-auto mt-12 max-w-3xl">
            <Card className="p-8 hover-elevate rounded-2xl">
              <CardContent className="space-y-6">
                <p className="text-muted-foreground text-lg">{testimonials[currentTestimonial].text}</p>
                <p className="mt-2 font-semibold">{testimonials[currentTestimonial].author}</p>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goPrev} aria-label="Testimonio anterior">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={goNext} aria-label="Siguiente testimonio">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <span className="text-sm text-muted-foreground">
                    {currentTestimonial + 1} / {totalTestimonials}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* J) CTA FINAL */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <Card className="mx-auto max-w-6xl rounded-2xl border-primary/30 bg-gradient-to-r from-primary/10 via-background to-background">
            <CardContent className="p-8 sm:p-12">
              <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-8">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Monta tu operación de atención y reputación en días, no en meses
                  </h2>
                  <p className="mt-4 text-muted-foreground">
                    Centraliza canales, define tono, automatiza lo repetible y gana visibilidad por ubicación.
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">Consistencia de marca</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">Menos incidencias sin respuesta</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                      <p className="text-sm text-muted-foreground">KPIs para mejorar</p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4">
                  <div className="rounded-2xl border bg-background p-6">
                    <p className="text-sm font-medium">Empieza hoy</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prueba el sistema y decide con datos.
                    </p>
                    <div className="mt-6 flex flex-col gap-3">
                      <Button size="lg" asChild data-testid="button-final-cta-try">
                        <a href="/api/login">
                          Probar gratis <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="lg" variant="outline" asChild data-testid="button-final-cta-demo">
                        <Link href="/contact">Ver demo</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                        data-testid="button-final-cta-pricing"
                      >
                        Ver precios
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Blog (kept) */}
      {blogs.length > 0 && (
        <section className="py-16 sm:py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <Badge variant="secondary" className="mb-4">
                  Blog
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Ideas prácticas para atención y reputación
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Guías cortas para mejorar operación, respuesta y consistencia.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {blogs.map((blog) => (
                  <Link key={blog.id} href={`/blog/${blog.slug}`}>
                    <Card
                      className="h-full hover-elevate cursor-pointer transition-all rounded-2xl"
                      data-testid={`card-landing-blog-${blog.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <CalendarIcon className="h-3 w-3" />
                          <time dateTime={new Date(blog.createdAt).toISOString()}>
                            {format(new Date(blog.createdAt), "d MMM yyyy", { locale: es })}
                          </time>
                        </div>
                        <CardTitle className="text-base line-clamp-2">{blog.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {blog.subtitle ||
                            blog.content.replace(/[#*`]/g, "").substring(0, 120)}
                          ...
                        </p>
                        <div className="flex items-center gap-1 mt-3 text-primary font-medium text-xs">
                          Leer más
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="text-center mt-8">
                <Button variant="outline" asChild>
                  <Link href="/blog">
                    Ver todos los artículos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* K) FOOTER */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 py-2">
              <img
                src="/holarevi-dark.png"
                alt="HolaRevi Logo"
                className="h-10 w-auto block dark:hidden object-contain"
              />
              <img
                src="/holarevi-light.png"
                alt="HolaRevi Logo"
                className="h-10 w-auto hidden dark:block object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-privacy"
              >
                Privacidad
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-terms"
              >
                Términos
              </Link>
              <Link
                href="/google-permissions"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-google-permissions"
              >
                Google Permissions
              </Link>
              <Link
                href="/contact"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-contact"
              >
                Contacto
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4" /> Control y trazabilidad
              </span>
              <span className="inline-flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" /> Multi-ubicación
              </span>
              <span className="inline-flex items-center gap-2">
                <Headphones className="h-4 w-4" /> Soporte
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/holarevi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-instagram"
                aria-label="Instagram"
              >
                <SiInstagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.tiktok.com/@holarevi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-tiktok"
                aria-label="TikTok"
              >
                <SiTiktok className="h-5 w-5" />
              </a>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HolaRevi. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
