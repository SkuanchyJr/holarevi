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
  Star,
  TrendingUp,
  AlertCircle,
  XCircle,
  Wifi,
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
    accent: "emerald" | "primary" | "amber" | "slate";
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
    footnote:
      "Sin compromiso. Si no cancelas antes de 7 días, se cobrará automáticamente 49€/mes.",
    features: [
      { icon: <MapPin className="h-4 w-4" />, text: "1 ubicación" },
      {
        icon: <Sparkles className="h-4 w-4" />,
        text: "Respuestas automáticas ilimitadas a reseñas nuevas",
      },
      { icon: <Reply className="h-4 w-4" />, text: "Responder reseñas antiguas" },
      {
        icon: <Settings className="h-4 w-4" />,
        text: "Modo automático o revisión antes de publicar",
      },
      {
        icon: <BarChart3 className="h-4 w-4" />,
        text: "Analítica básica (tendencia y sentimiento)",
      },
      { icon: <User className="h-4 w-4" />, text: "1 usuario" },
      { icon: <Palette className="h-4 w-4" />, text: "Plantillas y tono de marca" },
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
      { icon: <MapPin className="h-4 w-4" />, text: "Hasta 3 ubicaciones" },
      {
        icon: <Sparkles className="h-4 w-4" />,
        text: "Respuestas automáticas ilimitadas a reseñas nuevas",
      },
      { icon: <Reply className="h-4 w-4" />, text: "Responder reseñas antiguas" },
      { icon: <BarChart3 className="h-4 w-4" />, text: "Analítica y control por ubicación" },
      {
        icon: <Zap className="h-4 w-4" />,
        text: "Prioridad en mejoras y nuevas funciones",
      },
      { icon: <Users className="h-4 w-4" />, text: "Hasta 3 usuarios" },
      {
        icon: <Palette className="h-4 w-4" />,
        text: "Plantillas avanzadas y tono consistente",
      },
      { icon: <Headphones className="h-4 w-4" />, text: "Soporte prioritario" },
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
      { icon: <MapPin className="h-4 w-4" />, text: "Ubicaciones incluidas (según plan)" },
      { icon: <MapPin className="h-4 w-4" />, text: "Añade ubicaciones extra según necesidad" },
      { icon: <LayoutDashboard className="h-4 w-4" />, text: "Panel avanzado multi-ubicación" },
      { icon: <Users className="h-4 w-4" />, text: "Equipo y colaboración" },
      { icon: <Shield className="h-4 w-4" />, text: "Roles y permisos" },
      { icon: <Headphones className="h-4 w-4" />, text: "SLA y soporte avanzado" },
      { icon: <FileCheck className="h-4 w-4" />, text: "Cumplimiento y buenas prácticas (GDPR)" },
      { icon: <UserCheck className="h-4 w-4" />, text: "Onboarding asistido" },
      { icon: <User className="h-4 w-4" />, text: "Responsable de cuenta" },
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
      { icon: <Settings className="h-4 w-4" />, text: "API e integraciones" },
      {
        icon: <LayoutDashboard className="h-4 w-4" />,
        text: "Conexión con CRM / sistemas internos",
      },
      { icon: <Zap className="h-4 w-4" />, text: "Automatizaciones y flujos" },
      { icon: <FileCheck className="h-4 w-4" />, text: "Auditoría y trazabilidad" },
      { icon: <BarChart3 className="h-4 w-4" />, text: "Reporting avanzado" },
      { icon: <Shield className="h-4 w-4" />, text: "SLA dedicado" },
      { icon: <User className="h-4 w-4" />, text: "Account manager" },
      { icon: <UserCheck className="h-4 w-4" />, text: "Onboarding y migración" },
    ],
  },
};

const STATS = [
  { label: "Reseñas respondidas", value: "+18.400" },
  { label: "Tiempo medio de respuesta", value: "2 min" },
  { label: "Ubicaciones gestionadas", value: "120+" },
];

const LOGOS = [
  "Restaurantes",
  "Hoteles",
  "Clínicas",
  "Estética",
  "Talleres",
  "Retail",
];

const FAQ = [
  {
    q: "¿HolaRevi publica las respuestas automáticamente?",
    a: "Sí. Puedes activar el modo automático y HolaRevi publica cada respuesta en cuanto llega la reseña. También puedes elegir el modo de revisión: la IA genera la respuesta y tú la apruebas antes de publicar.",
  },
  {
    q: "¿Funciona con mi perfil de Google Business?",
    a: "Sí. HolaRevi se conecta directamente con Google Business Profile para leer reseñas y publicar respuestas en tu nombre.",
  },
  {
    q: "¿Puedo controlar el tono y el estilo de las respuestas?",
    a: "Sí. Configuras el tono, las plantillas y las instrucciones de marca. Las respuestas siempre suenan a tu negocio, no a un bot.",
  },
  {
    q: "¿Qué pasa con reseñas antiguas sin responder?",
    a: "Puedes responder reseñas antiguas además de automatizar las nuevas. La idea es recuperar reputación sin un esfuerzo manual masivo.",
  },
  {
    q: "¿Funciona para varias ubicaciones?",
    a: "Sí. La plataforma está pensada para multi-ubicación: panel unificado, comparativas y control por local. El límite depende del plan.",
  },
  {
    q: "¿Necesito una tarjeta para la prueba gratuita?",
    a: "Depende de la configuración actual. Si se solicita, es para evitar interrupciones al finalizar la prueba. No se cobra durante el periodo gratuito.",
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
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 transition-transform",
                open && "rotate-180"
              )}
            />
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

// ─── Fake review card for hero visual ───────────────────────────────────────

function ReviewCard({
  author,
  rating,
  text,
  response,
  delay = 0,
}: {
  author: string;
  rating: number;
  text: string;
  response?: string;
  delay?: number;
}) {
  return (
    <div
      className="rounded-2xl border bg-background p-4 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
          {author[0]}
        </div>
        <span className="text-sm font-medium">{author}</span>
        <div className="ml-auto flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3 w-3",
                i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
              )}
            />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{text}</p>
      {response && (
        <div className="mt-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">Respuesta automática · IA</span>
          </div>
          <p className="text-xs text-muted-foreground">{response}</p>
        </div>
      )}
    </div>
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
      text: "Antes tardábamos días en responder. Ahora cada reseña tiene respuesta en minutos, con el tono exacto que queremos. La valoración media ha subido medio punto en dos meses.",
      author: "Responsable de operaciones, cadena de restaurantes",
    },
    {
      text: "Tenemos 4 clínicas y gestionar las reseñas era imposible. HolaRevi lo hace solo. Solo revisamos las negativas antes de publicar.",
      author: "Directora, grupo de clínicas privadas",
    },
    {
      text: "El hotel siempre tuvo buenas reseñas pero pocas respuestas. Desde que usamos HolaRevi, respondemos el 100% y los clientes lo notan.",
      author: "Manager, hotel boutique",
    },
  ];
  const totalTestimonials = testimonials.length;

  const getPrice = (planKey: keyof typeof PRICING) => {
    if (billingCycle === "yearly") {
      return Math.round(PRICING[planKey].yearly / 12);
    }
    return PRICING[planKey].monthly;
  };

  const goPrev = () => {
    setCurrentTestimonial((prev) => (prev === 0 ? totalTestimonials - 1 : prev - 1));
  };

  const goNext = () => {
    setCurrentTestimonial((prev) =>
      prev === totalTestimonials - 1 ? 0 : prev + 1
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) =>
        prev === totalTestimonials - 1 ? 0 : prev + 1
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [totalTestimonials]);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {/* ─── A) HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" />
          <div className="absolute -top-32 left-1/2 h-96 w-[50rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="mx-auto max-w-6xl">

            {/* Top badge */}
            <div className="flex justify-center mb-8">
              <Badge variant="secondary" className="gap-1.5 px-4 py-1.5 text-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Automatización de reseñas con IA
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="text-center text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl max-w-4xl mx-auto leading-[1.1]">
              Responde todas tus reseñas de Google{" "}
              <span className="text-primary">con IA, automáticamente</span>
            </h1>

            <p className="mt-6 text-center text-lg text-muted-foreground max-w-2xl mx-auto sm:text-xl">
              HolaRevi genera y publica respuestas personalizadas a cada reseña de Google,
              en tu tono de marca, sin que tengas que hacer nada.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-try-free">
                <a href="/api/login">
                  Empezar gratis — 7 días sin coste
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-hero-demo">
                <Link href="/contact">Ver cómo funciona</Link>
              </Button>
            </div>

            <p className="mt-3 text-center text-sm text-muted-foreground">
              Sin tarjeta de crédito · Conecta en minutos · Cancela cuando quieras
            </p>

            {/* Social proof strip */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">{s.value}</span>
                  <span className="text-xs">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Hero visual: review feed mockup */}
            <div className="mt-16 mx-auto max-w-3xl">
              <div className="rounded-3xl border bg-muted/20 p-4 sm:p-6 shadow-xl">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                    <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                    <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />
                  </div>
                  <div className="flex-1 h-6 rounded-md bg-muted/50 flex items-center px-3">
                    <span className="text-xs text-muted-foreground">holarevi.com · Panel de reseñas</span>
                  </div>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    En vivo
                  </Badge>
                </div>

                {/* Reviews */}
                <div className="space-y-3">
                  <ReviewCard
                    author="María G."
                    rating={5}
                    text="Increíble experiencia. El personal fue muy amable y la comida estaba deliciosa. Volveremos sin duda."
                    response="¡Muchas gracias, María! Nos alegra mucho que hayas disfrutado la experiencia. Nuestro equipo trabaja cada día para que cada visita sea especial. ¡Te esperamos pronto!"
                  />
                  <ReviewCard
                    author="Carlos M."
                    rating={4}
                    text="Muy buen servicio, aunque la espera fue un poco larga. En general una visita muy agradable."
                    response="Gracias, Carlos, por tu valoración y tus palabras. Tomamos nota sobre los tiempos de espera para seguir mejorando. ¡Esperamos verte pronto de nuevo!"
                  />
                  <div className="rounded-2xl border bg-background p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-xs font-medium text-muted-foreground">
                      A
                    </div>
                    <div className="flex-1">
                      <div className="h-3 w-32 bg-muted/50 rounded mb-2" />
                      <div className="h-2 w-full bg-muted/30 rounded" />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      Generando...
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── B) SECTOR LOGOS / CONFIANZA ────────────────────────────────── */}
      <section className="py-10 border-y bg-muted/20">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Negocios locales que ya automatizan sus reseñas con HolaRevi
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: <Utensils className="h-4 w-4" />, label: "Restaurantes" },
              { icon: <Hotel className="h-4 w-4" />, label: "Hoteles" },
              { icon: <Stethoscope className="h-4 w-4" />, label: "Clínicas" },
              { icon: <HeartHandshake className="h-4 w-4" />, label: "Centros de estética" },
              { icon: <Wrench className="h-4 w-4" />, label: "Talleres" },
              { icon: <Store className="h-4 w-4" />, label: "Retail" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm text-muted-foreground"
              >
                {icon}
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── C) PROBLEMA ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">

            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">El problema</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                La mayoría de negocios ignoran sus reseñas
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                Y eso tiene un coste real: menos confianza, peor posicionamiento y clientes que se van a la competencia.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: <XCircle className="h-6 w-6" />,
                  stat: "63%",
                  title: "Sin respuesta",
                  desc: "De media, más de la mitad de las reseñas de Google quedan sin responder. Cada una es una oportunidad perdida.",
                  color: "text-destructive",
                  bg: "bg-destructive/10",
                },
                {
                  icon: <Clock className="h-6 w-6" />,
                  stat: "3–5 días",
                  title: "Respuesta tardía",
                  desc: "Cuando se responde, muchas veces es demasiado tarde. El cliente ya ha tomado otra decisión.",
                  color: "text-amber-600",
                  bg: "bg-amber-500/10",
                },
                {
                  icon: <AlertCircle className="h-6 w-6" />,
                  stat: "Sin tono",
                  title: "Respuestas inconsistentes",
                  desc: "Cada empleado escribe diferente. El resultado es una imagen de marca fragmentada y poco profesional.",
                  color: "text-orange-600",
                  bg: "bg-orange-500/10",
                },
              ].map((item) => (
                <Card key={item.title} className="rounded-2xl text-center">
                  <CardHeader className="p-8">
                    <div className={cn("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl", item.bg, item.color)}>
                      {item.icon}
                    </div>
                    <div className={cn("mt-4 text-4xl font-bold", item.color)}>{item.stat}</div>
                    <CardTitle className="mt-2 text-xl">{item.title}</CardTitle>
                    <CardDescription className="mt-2 text-sm">{item.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── D) SOLUCIÓN ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">

              {/* Left: copy */}
              <div>
                <Badge variant="secondary" className="mb-4">La solución</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Tus reseñas, respondidas automáticamente
                </h2>
                <p className="mt-4 text-muted-foreground text-lg">
                  HolaRevi usa IA para generar respuestas personalizadas a cada reseña de Google.
                  Entiende el contexto de tu negocio, mantiene tu tono de marca y publica sin que tengas que hacer nada.
                </p>

                <ul className="mt-8 space-y-4">
                  {[
                    {
                      icon: <Sparkles className="h-5 w-5 text-primary" />,
                      text: "Respuestas generadas por IA, personalizadas para cada reseña",
                    },
                    {
                      icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
                      text: "Publicación automática en Google Business Profile",
                    },
                    {
                      icon: <Palette className="h-5 w-5 text-primary" />,
                      text: "Tono de marca y plantillas configurables por ti",
                    },
                    {
                      icon: <Settings className="h-5 w-5 text-primary" />,
                      text: "Modo revisión: aprueba antes de publicar si lo prefieres",
                    },
                    {
                      icon: <Globe className="h-5 w-5 text-primary" />,
                      text: "Funciona 24/7, incluso cuando tu equipo no está",
                    },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-3">
                      {item.icon}
                      <span className="text-muted-foreground">{item.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" asChild data-testid="button-solution-try">
                    <a href="/api/login">
                      Empezar gratis
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-solution-demo">
                    <Link href="/contact">Hablar con el equipo</Link>
                  </Button>
                </div>
              </div>

              {/* Right: feature cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: <Reply className="h-5 w-5 text-primary" />,
                    title: "Respuestas automáticas",
                    desc: "La IA lee la reseña y genera una respuesta coherente al instante.",
                    badge: "Core",
                  },
                  {
                    icon: <Palette className="h-5 w-5 text-primary" />,
                    title: "Tono de marca",
                    desc: "Configuras el estilo una vez. Cada respuesta suena a tu negocio.",
                    badge: "Config",
                  },
                  {
                    icon: <BarChart3 className="h-5 w-5 text-primary" />,
                    title: "Analítica de reseñas",
                    desc: "Tendencia, sentimiento y evolución de tu reputación en el tiempo.",
                    badge: "Insights",
                  },
                  {
                    icon: <MapPin className="h-5 w-5 text-primary" />,
                    title: "Multi-ubicación",
                    desc: "Gestiona varios locales desde un panel unificado.",
                    badge: "Pro+",
                  },
                ].map((f) => (
                  <Card key={f.title} className="rounded-2xl">
                    <CardHeader className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          {f.icon}
                        </div>
                        <Badge variant="secondary" className="text-xs">{f.badge}</Badge>
                      </div>
                      <CardTitle className="text-base">{f.title}</CardTitle>
                      <CardDescription className="text-sm mt-1">{f.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ─── E) CÓMO FUNCIONA ───────────────────────────────────────────── */}
      <section id="how" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Cómo funciona"
            title="En marcha en menos de 10 minutos"
            subtitle="Tres pasos simples. Sin técnicos. Sin configuraciones complejas."
          />

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: <Store className="h-7 w-7" />,
                  title: "Conecta tu Google Business",
                  desc: "Vincula tu perfil de Google Business Profile en un clic. HolaRevi empieza a leer tus reseñas al instante.",
                },
                {
                  step: "02",
                  icon: <Palette className="h-7 w-7" />,
                  title: "Configura tu tono de marca",
                  desc: "Dinos cómo quieres sonar: formal, cercano, con humor… La IA aprende y mantiene ese tono en cada respuesta.",
                },
                {
                  step: "03",
                  icon: <Zap className="h-7 w-7" />,
                  title: "La IA responde por ti",
                  desc: "Cada nueva reseña recibe una respuesta personalizada y publicada automáticamente. Tú lo ves todo en el panel.",
                },
              ].map((step, i) => (
                <div key={step.step} className="relative">
                  {i < 2 && (
                    <div className="absolute top-10 left-full w-full hidden md:flex items-center justify-center z-10 -mx-3">
                      <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}
                  <Card className="rounded-2xl h-full">
                    <CardHeader className="p-8">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          {step.icon}
                        </div>
                        <span className="text-4xl font-black text-muted-foreground/15 select-none">
                          {step.step}
                        </span>
                      </div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                      <CardDescription className="mt-2 text-sm leading-relaxed">{step.desc}</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button size="lg" asChild data-testid="button-how-try">
                <a href="/api/login">
                  Empezar ahora — gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── F) BENEFICIOS ──────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Beneficios"
            title="El impacto en tu negocio es inmediato"
            subtitle="Más reputación, más confianza, más ventas. Sin trabajo manual adicional."
          />

          <div className="mx-auto mt-12 max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: "Mejor posicionamiento en Google",
                desc: "Google premia a los negocios que responden activamente a sus reseñas.",
              },
              {
                icon: <Star className="h-6 w-6" />,
                title: "Más valoración media",
                desc: "Responder bien a reseñas negativas convierte la crítica en confianza.",
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: "Mayor engagement con clientes",
                desc: "Un cliente que recibe respuesta tiene más probabilidad de volver y recomendar.",
              },
              {
                icon: <Clock className="h-6 w-6" />,
                title: "Horas de trabajo ahorradas",
                desc: "Tu equipo deja de gestionar reseñas manualmente. La IA lo hace por vosotros.",
              },
            ].map((b) => (
              <Card key={b.title} className="rounded-2xl">
                <CardHeader className="p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                    {b.icon}
                  </div>
                  <CardTitle className="text-lg mt-4">{b.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm">{b.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── G) TESTIMONIOS ─────────────────────────────────────────────── */}
      <section id="testimonials" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Lo que dicen los clientes"
            title="Resultados reales de negocios locales"
            subtitle="De restaurantes a clínicas. El resultado es el mismo: más reputación, menos trabajo."
          />

          <div className="mx-auto mt-12 max-w-3xl">
            <Card className="rounded-2xl">
              <CardContent className="p-8 sm:p-10">
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-lg sm:text-xl text-foreground leading-relaxed">
                  "{testimonials[currentTestimonial].text}"
                </p>
                <p className="mt-6 font-semibold text-sm text-muted-foreground">
                  — {testimonials[currentTestimonial].author}
                </p>

                <div className="mt-8 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goPrev}
                      aria-label="Testimonio anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={goNext}
                      aria-label="Siguiente testimonio"
                    >
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

      {/* ─── H) EXTRA SOLUTIONS ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">

            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                Soluciones avanzadas
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                ¿Necesitas más que automatización de reseñas?
              </h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                HolaRevi se centra en la automatización de reseñas. Para negocios con necesidades más complejas,
                ofrecemos soluciones personalizadas adicionales.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Estas soluciones <strong>no forman parte del producto estándar</strong> y requieren contactar con el equipo.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  icon: <Globe className="h-6 w-6" />,
                  title: "Webs de alta conversión automatizadas",
                  desc: "Páginas web diseñadas para convertir visitantes en clientes. Optimizadas, rápidas y conectadas a tus reseñas de Google para generar confianza desde el primer segundo.",
                  tags: ["Diseño", "Conversión", "Automatización"],
                },
                {
                  icon: <Workflow className="h-6 w-6" />,
                  title: "Infraestructura avanzada de automatización",
                  desc: "Para negocios con alto volumen de reseñas que necesitan flujos personalizados, integraciones con su CRM, auditoría avanzada y un sistema de atención completo.",
                  tags: ["Alto volumen", "Integraciones", "A medida"],
                },
              ].map((s) => (
                <Card
                  key={s.title}
                  className="rounded-2xl border-primary/20 bg-gradient-to-b from-primary/5 to-background"
                >
                  <CardHeader className="p-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-2">
                      {s.icon}
                    </div>
                    <CardTitle className="mt-4 text-xl">{s.title}</CardTitle>
                    <CardDescription className="mt-2 text-sm leading-relaxed">{s.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {s.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button variant="outline" size="lg" asChild data-testid="button-advanced-contact">
                <Link href="/contact">
                  Contactar para soluciones avanzadas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── I) FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow="Preguntas frecuentes"
            title="Todo lo que necesitas saber"
            subtitle="Respuestas claras para que decidas con confianza."
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

      {/* ─── J) CTA FINAL ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6">Empieza hoy</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Empieza a automatizar tus reseñas hoy
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              7 días gratis. Sin tarjeta. Sin complicaciones.
              Conecta tu Google Business y deja que la IA trabaje por ti.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="text-base px-10" data-testid="button-final-cta-try">
                <a href="/api/login">
                  Empezar gratis — 7 días
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-final-cta-contact">
                <Link href="/contact">Hablar con ventas</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Conecta en minutos
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Cancela cuando quieras
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BLOG ───────────────────────────────────────────────────────── */}
      {blogs.length > 0 && (
        <section className="py-16 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-12">
                <Badge variant="secondary" className="mb-4">Blog</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Ideas prácticas para tu reputación online
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Guías cortas para mejorar operación, respuesta y consistencia.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {blogs.map((blog) => (
                  <Link key={blog.id} href={`/blog/${blog.slug}`}>
                    <Card
                      className="h-full cursor-pointer transition-all rounded-2xl hover:shadow-md"
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

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
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
                <Shield className="h-4 w-4" /> Datos seguros
              </span>
              <span className="inline-flex items-center gap-2">
                <Wifi className="h-4 w-4" /> Google Business API oficial
              </span>
              <span className="inline-flex items-center gap-2">
                <Headphones className="h-4 w-4" /> Soporte en español
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
