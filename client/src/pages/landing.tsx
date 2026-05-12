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
import { format, formatDistanceToNow } from "date-fns";
import { es, enUS } from "date-fns/locale";
import type { Blog } from "@shared/schema";
import { formatPrice } from "@shared/plans";
import { SiInstagram, SiTiktok } from "react-icons/si";
import { Seo } from "@/components/seo";
import { useLanguage } from "@/lib/i18n";

type BillingCycle = "monthly" | "yearly";

// Keep these in sync with shared/plans.ts (yearly = monthly × 10, i.e. "2 months free").
const PRICING = {
  local: { monthly: 14, yearly: 140 },
  pro: { monthly: 39, yearly: 390 },
  business: { monthly: 99, yearly: 990 },
};

type PlanKey = keyof typeof PRICING | "enterprise";

// Pricing moved inside component for i18n

const STATS = [
  { label: "landing.stats.reviews", value: "+18.400" },
  { label: "landing.stats.responseTime", value: "2 min" },
  { label: "landing.stats.locations", value: "120+" },
];

// How many reviews to pull for the testimonials wall (only posted replies are returned).
const SHOWCASE_REVIEWS_LIMIT = 100;

type PublicReview = {
  id: string;
  reviewerName: string | null;
  reviewerPhotoUrl: string | null;
  rating: number;
  comment: string | null;
  language: string | null;
  postedReply: string | null;
  generatedReply: string | null;
  reviewedAt: string | null;
  repliedAt: string | null;
};

type PublicReviewsResponse = {
  success: boolean;
  restaurantName: string;
  reviews: PublicReview[];
};

// LOGOS moved inside component

const FAQ = [
  { q: "landing.faq.q1", a: "landing.faq.a1" },
  { q: "landing.faq.q2", a: "landing.faq.a2" },
  { q: "landing.faq.q3", a: "landing.faq.a3" },
  { q: "landing.faq.q4", a: "landing.faq.a4" },
  { q: "landing.faq.q5", a: "landing.faq.a5" },
  { q: "landing.faq.q6", a: "landing.faq.a6" },
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
  const { t } = useLanguage();
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
            <span className="text-xs font-medium text-primary">{t("reviews.aiGeneratedReply")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{response}</p>
        </div>
      )}
    </div>
  );
}

// ─── Product-themed background visual for the landing hero ──────────────────

function HeroBackgroundVisual() {
  const floatingItems = [
    {
      className: "left-[5%] top-14 w-44 rotate-[-8deg]",
      icon: <Star className="h-4 w-4 fill-amber-400 text-amber-400" />,
      label: "Nueva reseña",
      value: "5.0",
      detail: "Google Reviews",
    },
    {
      className: "right-[6%] top-24 w-48 rotate-[7deg]",
      icon: <TrendingUp className="h-4 w-4 text-emerald-500" />,
      label: "Reputación",
      value: "+32%",
      detail: "más respuestas",
    },
    {
      className: "left-[8%] bottom-28 w-48 rotate-[6deg]",
      icon: <span className="text-sm font-bold text-emerald-600">€</span>,
      label: "Ingresos protegidos",
      value: "+1.240€",
      detail: "clientes recuperados",
    },
    {
      className: "right-[9%] bottom-20 w-52 rotate-[-6deg]",
      icon: <MessageSquare className="h-4 w-4 text-primary" />,
      label: "Respuesta IA",
      value: "2 min",
      detail: "lista para publicar",
    },
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" />
      <div className="absolute -top-32 left-1/2 h-96 w-[50rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute left-[8%] top-1/4 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute right-[4%] top-1/3 h-80 w-80 rounded-full bg-amber-300/12 blur-3xl" />
      <div className="absolute inset-x-0 top-28 hidden h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent md:block" />
      <div className="absolute inset-x-0 bottom-36 hidden h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent md:block" />

      <div className="hidden md:block">
        {floatingItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "absolute rounded-2xl border border-foreground/10 bg-background/70 p-4 shadow-xl shadow-primary/5 backdrop-blur-xl",
              item.className
            )}
          >
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/70">
                {item.icon}
              </span>
              {item.label}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-2xl font-bold tracking-tight text-foreground">{item.value}</span>
              <span className="text-right text-xs text-muted-foreground">{item.detail}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute left-[16%] top-[18%] hidden text-7xl font-black text-primary/[0.035] lg:block">
        ★★★★★
      </div>
      <div className="absolute right-[14%] top-[44%] hidden text-8xl font-black text-emerald-500/[0.04] lg:block">
        €
      </div>
    </div>
  );
}

// ─── Google-styled review card for the testimonials wall ────────────────────

function GoogleGLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function GoogleStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating ? "fill-[#FBBC04] text-[#FBBC04]" : "text-muted-foreground/25"
          )}
        />
      ))}
    </div>
  );
}

function GoogleReviewCard({
  review,
  businessName,
}: {
  review: PublicReview;
  businessName: string;
}) {
  const { t, language } = useLanguage();
  const [imgFailed, setImgFailed] = useState(false);
  const reply = (review.postedReply ?? review.generatedReply ?? "").trim();
  const dateLocale = language === "es" ? es : enUS;
  const reviewedDate = review.reviewedAt ? new Date(review.reviewedAt) : null;
  const showPhoto = Boolean(review.reviewerPhotoUrl) && !imgFailed;
  const reviewerName =
    review.reviewerName?.trim() || t("landing.testimonials.anonymous");
  const initial = reviewerName.charAt(0).toUpperCase();

  return (
    <Card className="rounded-2xl bg-background shadow-sm">
      <CardContent className="p-6">
        {/* Header: reviewer + Google badge */}
        <div className="flex items-start gap-3">
          {showPhoto ? (
            <img
              src={review.reviewerPhotoUrl as string}
              alt={reviewerName}
              className="h-10 w-10 rounded-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{reviewerName}</p>
            <div className="mt-1 flex items-center gap-2">
              <GoogleStars rating={review.rating} />
              {reviewedDate ? (
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(reviewedDate, { addSuffix: true, locale: dateLocale })}
                </span>
              ) : null}
            </div>
          </div>
          <GoogleGLogo className="h-5 w-5 shrink-0" />
        </div>

        {/* Review text */}
        {review.comment ? (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {review.comment}
          </p>
        ) : null}

        {/* Owner reply published with HolaRevi — intentionally smaller */}
        {reply ? (
          <div className="mt-4 rounded-xl border-l-2 border-primary/30 bg-muted/40 p-3">
            <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="text-xs font-medium">{businessName}</span>
              <span className="text-[11px] text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                {t("landing.testimonials.repliedWith")}
              </span>
            </div>
            <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
              {reply}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function Landing() {
  const { t, language } = useLanguage();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
      name: t("pricing.local.name"),
      description: t("pricing.local.description"),
      accent: "emerald",
      icon: <MapPin className="h-5 w-5" />,
      ctaLabel: t("pricing.local.cta"),
      ctaHref: `/${language}/auth`,
      footnote: t("pricing.local.footnote"),
      features: [
        { icon: <MapPin className="h-4 w-4" />, text: t("pricing.local.f1") },
        { icon: <Sparkles className="h-4 w-4" />, text: t("pricing.local.f2") },
        { icon: <Reply className="h-4 w-4" />, text: t("pricing.local.f3") },
        { icon: <Settings className="h-4 w-4" />, text: t("pricing.local.f4") },
        { icon: <BarChart3 className="h-4 w-4" />, text: t("pricing.local.f5") },
        { icon: <User className="h-4 w-4" />, text: t("pricing.local.f6") },
        { icon: <Palette className="h-4 w-4" />, text: t("pricing.local.f7") },
      ],
    },
    pro: {
      name: t("pricing.pro.name"),
      description: t("pricing.pro.description"),
      accent: "primary",
      icon: <Zap className="h-5 w-5" />,
      ctaLabel: t("pricing.pro.cta"),
      ctaHref: `/${language}/auth`,
      mostPopular: true,
      features: [
        { icon: <MapPin className="h-4 w-4" />, text: t("pricing.pro.f1") },
        { icon: <Sparkles className="h-4 w-4" />, text: t("pricing.pro.f2") },
        { icon: <BarChart3 className="h-4 w-4" />, text: t("pricing.pro.f3") },
        { icon: <Zap className="h-4 w-4" />, text: t("pricing.pro.f4") },
        { icon: <Users className="h-4 w-4" />, text: t("pricing.pro.f5") },
        { icon: <Headphones className="h-4 w-4" />, text: t("pricing.pro.f6") },
      ],
    },
    business: {
      name: t("pricing.business.name"),
      description: t("pricing.business.description"),
      accent: "amber",
      icon: <Building2 className="h-5 w-5" />,
      ctaLabel: t("pricing.business.cta"),
      ctaHref: `/${language}/auth`,
      footnote: t("pricing.business.footnote"),
      features: [
        { icon: <MapPin className="h-4 w-4" />, text: t("pricing.business.f1") },
        { icon: <LayoutDashboard className="h-4 w-4" />, text: t("pricing.business.f2") },
        { icon: <Users className="h-4 w-4" />, text: t("pricing.business.f3") },
        { icon: <Shield className="h-4 w-4" />, text: t("pricing.business.f4") },
        { icon: <Headphones className="h-4 w-4" />, text: t("pricing.business.f5") },
      ],
    },
    enterprise: {
      name: t("pricing.enterprise.name"),
      description: t("pricing.enterprise.description"),
      accent: "slate",
      icon: <Building2 className="h-5 w-5" />,
      priceLabel: t("common.custom"),
      ctaLabel: t("pricing.enterprise.cta"),
      ctaHref: `/${language}/contact`,
      features: [
        { icon: <Settings className="h-4 w-4" />, text: t("pricing.enterprise.f1") },
        { icon: <LayoutDashboard className="h-4 w-4" />, text: t("pricing.enterprise.f2") },
        { icon: <BarChart3 className="h-4 w-4" />, text: t("pricing.enterprise.f3") },
        { icon: <User className="h-4 w-4" />, text: t("pricing.enterprise.f4") },
      ],
    },
  };

  const { data: blogsData } = useQuery<{ success: boolean; blogs: Blog[] }>({
    queryKey: ["/api/blogs"],
  });
  const blogs = blogsData?.blogs?.slice(0, 3) || [];

  // Fetch the landing config to know which restaurant to showcase.
  const { data: landingConfig } = useQuery<{ success: boolean; showcaseRestaurantId: string | null }>({
    queryKey: ["/api/config/landing"],
  });
  const showcaseRestaurantId = landingConfig?.showcaseRestaurantId ?? "";

  // Real Google Maps reviews (with their published HolaRevi replies) for the
  // testimonials wall. Falls back to the static carousel when no showcase
  // restaurant is configured or none of its reviews have a published reply.
  const { data: googleReviewsData } = useQuery<PublicReviewsResponse>({
    queryKey: [
      `/api/public/reviews/${showcaseRestaurantId}?limit=${SHOWCASE_REVIEWS_LIMIT}`,
    ],
    enabled: showcaseRestaurantId.length > 0,
  });
  const googleReviews = (googleReviewsData?.reviews ?? []).filter(
    (r) => (r.postedReply ?? r.generatedReply ?? "").trim().length > 0
  );
  const hasGoogleReviews = googleReviews.length > 0;
  const showcaseBusinessName = googleReviewsData?.restaurantName ?? "HolaRevi";
  const googleAvgRating = hasGoogleReviews
    ? googleReviews.reduce((sum, r) => sum + r.rating, 0) / googleReviews.length
    : 0;

  const testimonials = [
    {
      text: t("landing.testimonials.t1.text"),
      author: t("landing.testimonials.t1.author"),
    },
    {
      text: t("landing.testimonials.t2.text"),
      author: t("landing.testimonials.t2.author"),
    },
    {
      text: t("landing.testimonials.t3.text"),
      author: t("landing.testimonials.t3.author"),
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

  const LOGOS = [
    t("landing.industries.restaurants"),
    t("landing.industries.hotels"),
    t("landing.industries.clinics"),
    t("landing.industries.beauty"),
    t("landing.industries.repairs"),
    t("landing.industries.retail"),
  ];

  return (
    <div className="page-texture min-h-screen text-foreground selection:bg-primary selection:text-primary-foreground">
      <Seo 
        title={t("seo.home.title")}
        description={t("seo.home.description")}
        keywords={t("seo.home.keywords")}
      />
      <LandingHeader />

      {/* ─── A) HERO ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <HeroBackgroundVisual />

        <div className="container mx-auto px-4 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="mx-auto max-w-6xl">

            {/* Top badge */}
            <div className="flex justify-center mb-8">
              <Badge variant="secondary" className="gap-1.5 px-4 py-1.5 text-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("hero.badge")}
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="text-center text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl max-w-4xl mx-auto leading-[1.1]">
              {t("hero.titlePrefix")}{" "}
              <span className="text-primary">{t("hero.titleHighlight")}</span>
            </h1>

            <p className="mt-6 text-center text-lg text-muted-foreground max-w-2xl mx-auto sm:text-xl">
              {t("hero.subtitle")}
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="text-base px-8" data-testid="button-hero-try-free">
                <a href={`/${language}/auth`}>
                  {t("hero.ctaPrimary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-hero-demo">
                <a href="#demo">{t("hero.ctaSecondary")}</a>
              </Button>
            </div>

            <p className="mt-3 text-center text-sm text-muted-foreground">
              {t("hero.footerText")}
            </p>

            {/* Social proof strip */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              {STATS.map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold text-foreground">{s.value}</span>
                  <span className="text-xs">{t(s.label)}</span>
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
                    <span className="text-xs text-muted-foreground">{t("landing.hero.browser_url")}</span>
                  </div>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    {t("landing.hero.live_badge")}
                  </Badge>
                </div>

                {/* Reviews */}
                <div className="space-y-3">
                  <ReviewCard
                    author={t("landing.hero.review1_author")}
                    rating={5}
                    text={t("landing.hero.review1_text")}
                    response={t("landing.hero.review1_response")}
                  />
                  <ReviewCard
                    author={t("landing.hero.review2_author")}
                    rating={4}
                    text={t("landing.hero.review2_text")}
                    response={t("landing.hero.review2_response")}
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
                      {t("landing.hero.generating")}
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
            {t("landing.logos.title")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: <Utensils className="h-4 w-4" />, label: t("landing.logos.restaurants") },
              { icon: <Hotel className="h-4 w-4" />, label: t("landing.logos.hotels") },
              { icon: <Stethoscope className="h-4 w-4" />, label: t("landing.logos.clinics") },
              { icon: <HeartHandshake className="h-4 w-4" />, label: t("landing.logos.beauty") },
              { icon: <Wrench className="h-4 w-4" />, label: t("landing.logos.repairs") },
              { icon: <Store className="h-4 w-4" />, label: t("landing.logos.retail") },
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
              <Badge variant="secondary" className="mb-4">{t("landing.problem.eyebrow")}</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("landing.problem.title")}
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                {t("landing.problem.subtitle")}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: <XCircle className="h-6 w-6" />,
                  stat: "63%",
                  title: t("landing.problem.c1.title"),
                  desc: t("landing.problem.c1.desc"),
                  color: "text-destructive",
                  bg: "bg-destructive/10",
                },
                {
                  icon: <Clock className="h-6 w-6" />,
                  stat: "3–5 días",
                  title: t("landing.problem.c2.title"),
                  desc: t("landing.problem.c2.desc"),
                  color: "text-amber-600",
                  bg: "bg-amber-500/10",
                },
                {
                  icon: <AlertCircle className="h-6 w-6" />,
                  stat: "Sin tono",
                  title: t("landing.problem.c3.title"),
                  desc: t("landing.problem.c3.desc"),
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
                <Badge variant="secondary" className="mb-4">{t("landing.solution.eyebrow")}</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {t("landing.solution.title")}
                </h2>
                <p className="mt-4 text-muted-foreground text-lg">
                  {t("landing.solution.subtitle")}
                </p>

                <ul className="mt-8 space-y-4">
                  {[
                    {
                      icon: <Sparkles className="h-5 w-5 text-primary" />,
                      text: t("landing.solution.points.p1"),
                    },
                    {
                      icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
                      text: t("landing.solution.points.p2"),
                    },
                    {
                      icon: <Palette className="h-5 w-5 text-primary" />,
                      text: t("landing.solution.points.p3"),
                    },
                    {
                      icon: <Settings className="h-5 w-5 text-primary" />,
                      text: t("landing.solution.points.p4"),
                    },
                    {
                      icon: <Globe className="h-5 w-5 text-primary" />,
                      text: t("landing.solution.points.p5"),
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
                    <a href={`/${language}/auth`}>
                      {t("landing.solution.ctaPrimary")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-solution-demo">
                    <Link href={`/${language}/contact`}>{t("landing.solution.ctaSecondary")}</Link>
                  </Button>
                </div>
              </div>

              {/* Right: feature cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: <Reply className="h-5 w-5 text-primary" />,
                    title: t("landing.solution.c1.title"),
                    desc: t("landing.solution.c1.desc"),
                    badge: t("landing.solution.c1.badge"),
                  },
                  {
                    icon: <Palette className="h-5 w-5 text-primary" />,
                    title: t("landing.solution.c2.title"),
                    desc: t("landing.solution.c2.desc"),
                    badge: t("landing.solution.c2.badge"),
                  },
                  {
                    icon: <BarChart3 className="h-5 w-5 text-primary" />,
                    title: t("landing.solution.c3.title"),
                    desc: t("landing.solution.c3.desc"),
                    badge: t("landing.solution.c3.badge"),
                  },
                  {
                    icon: <MapPin className="h-5 w-5 text-primary" />,
                    title: t("landing.solution.c4.title"),
                    desc: t("landing.solution.c4.desc"),
                    badge: t("landing.solution.c4.badge"),
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

      {/* ─── PRUEBA EN VIVO ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-primary/5">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
              
              <div className="relative p-8 sm:p-12 text-center">
                <Badge variant="outline" className="mb-4 border-primary/30 text-primary gap-1.5">
                  <Star className="h-3.5 w-3.5" />
                  {t("landing.liveTest.eyebrow")}
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  {t("landing.liveTest.title")}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                  {t("landing.liveTest.subtitle")}
                </p>
                <Button size="lg" asChild className="text-lg px-8">
                  <a href="https://holarevi.com/r/ca387167-dafe-459d-a0cc-1005a11e221b" target="_blank" rel="noopener noreferrer">
                    <Star className="mr-2 h-5 w-5 fill-current text-amber-400" />
                    {t("landing.liveTest.cta")}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DEMO INTERACTIVA ───────────────────────────────────────────── */}
      <section id="demo" className="py-16 sm:py-24 border-y bg-background">
        <div className="container mx-auto px-4">
          <ReviewDemo />
        </div>
      </section>

      {/* ─── E) CÓMO FUNCIONA ───────────────────────────────────────────── */}
      <section id="how" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow={t("landing.how.eyebrow")}
            title={t("landing.how.title")}
            subtitle={t("landing.how.subtitle")}
          />

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "01",
                  icon: <Store className="h-7 w-7" />,
                  title: t("landing.how.step1.title"),
                  desc: t("landing.how.step1.desc"),
                },
                {
                  step: "02",
                  icon: <Palette className="h-7 w-7" />,
                  title: t("landing.how.step2.title"),
                  desc: t("landing.how.step2.desc"),
                },
                {
                  step: "03",
                  icon: <Zap className="h-7 w-7" />,
                  title: t("landing.how.step3.title"),
                  desc: t("landing.how.step3.desc"),
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
                <a href={`/${language}/auth`}>
                  {t("landing.how.cta")}
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
            eyebrow={t("landing.benefits.eyebrow")}
            title={t("landing.benefits.title")}
            subtitle={t("landing.benefits.subtitle")}
          />

          <div className="mx-auto mt-12 max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: t("landing.benefits.b1.title"),
                desc: t("landing.benefits.b1.desc"),
              },
              {
                icon: <Star className="h-6 w-6" />,
                title: t("landing.benefits.b2.title"),
                desc: t("landing.benefits.b2.desc"),
              },
              {
                icon: <Users className="h-6 w-6" />,
                title: t("landing.benefits.b3.title"),
                desc: t("landing.benefits.b3.desc"),
              },
              {
                icon: <Clock className="h-6 w-6" />,
                title: t("landing.benefits.b4.title"),
                desc: t("landing.benefits.b4.desc"),
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
            eyebrow={t("landing.testimonials.eyebrow")}
            title={t("landing.testimonials.title")}
            subtitle={
              hasGoogleReviews
                ? t("landing.testimonials.googleSubtitle")
                : t("landing.testimonials.subtitle")
            }
          />

          {hasGoogleReviews ? (
            <>
              {/* Google rating summary — gives the section an "official" feel */}
              <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
                <GoogleGLogo className="h-4 w-4" />
                <span className="font-semibold">{googleAvgRating.toFixed(1)}</span>
                <GoogleStars rating={Math.round(googleAvgRating)} />
                <span className="text-muted-foreground">
                  {googleReviews.length} {t("landing.testimonials.googleReviewsLabel")}
                </span>
              </div>

              {/* Masonry wall of real Google reviews + the replies posted with HolaRevi */}
              <div className="mx-auto mt-12 max-w-6xl columns-1 gap-6 sm:columns-2 lg:columns-3">
                {googleReviews.map((review) => (
                  <div key={review.id} className="mb-6 break-inside-avoid">
                    <GoogleReviewCard review={review} businessName={showcaseBusinessName} />
                  </div>
                ))}
              </div>
            </>
          ) : (
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
                        aria-label={t("landing.testimonials.prev")}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={goNext}
                        aria-label={t("landing.testimonials.next")}
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
          )}
        </div>
      </section>

      {/* ─── H) EXTRA SOLUTIONS ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">

            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
                {t("landing.extraSolutions.eyebrow")}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t("landing.extraSolutions.title")}
              </h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                {t("landing.extraSolutions.subtitle")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("landing.extraSolutions.disclaimer")}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {[
                {
                  icon: <Globe className="h-6 w-6" />,
                  title: t("landing.extraSolutions.s1.title"),
                  desc: t("landing.extraSolutions.s1.desc"),
                  tags: [t("landing.extraSolutions.s1.tag1"), t("landing.extraSolutions.s1.tag2"), t("landing.extraSolutions.s1.tag3")],
                },
                {
                  icon: <Workflow className="h-6 w-6" />,
                  title: t("landing.extraSolutions.s2.title"),
                  desc: t("landing.extraSolutions.s2.desc"),
                  tags: [t("landing.extraSolutions.s2.tag1"), t("landing.extraSolutions.s2.tag2"), t("landing.extraSolutions.s2.tag3")],
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
                <Link href={`/${language}/contact`}>
                  {t("landing.extraSolutions.cta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── NFC STAND PROMO ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl">
            <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
              {/* Glow */}
              <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/15 blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-blue-400/10 blur-[60px] pointer-events-none" />

              <div className="relative grid gap-8 lg:grid-cols-2 items-center p-8 sm:p-12">
                {/* Left: Copy */}
                <div>
                  <Badge variant="outline" className="mb-4 border-primary/30 text-primary gap-1.5">
                    <Wifi className="h-3.5 w-3.5" />
                    {t("nfc.hero.badge")}
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t("nfc.hero.titlePrefix")}{" "}
                    <span className="text-primary">{t("nfc.hero.titleHighlight")}</span>
                  </h2>
                  <p className="mt-3 text-muted-foreground">
                    {t("nfc.hero.subtitle")}
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button size="lg" asChild data-testid="button-landing-nfc-preorder">
                      <Link href={`/${language}/nfc`}>
                        {t("nfc.hero.cta")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Right: Product image */}
                <div className="flex justify-center">
                  <div className="relative w-64 sm:w-72">
                    <div className="absolute inset-0 -z-10 rounded-full bg-primary/10 blur-[40px]" />
                    <img
                      src="/nfc-stand-hero.png"
                      alt="HolaRevi NFC Stand"
                      className="w-full h-auto rounded-2xl shadow-xl"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRECIO / PRICE TEASER ──────────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("landing.priceTeaser.eyebrow")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("landing.priceTeaser.title")}
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              {t("landing.priceTeaser.subtitle")}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3 max-w-3xl mx-auto">
              {([
                { id: "local", name: "Local", popular: false },
                { id: "pro", name: "Pro", popular: true },
                { id: "business", name: "Business", popular: false },
              ] as const).map((p) => (
                <Card
                  key={p.id}
                  className={cn(
                    "rounded-2xl",
                    p.popular && "border-primary border-2"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-semibold text-muted-foreground">{p.name}</span>
                      {p.popular && (
                        <Badge variant="secondary" className="text-[10px]">{t("common.mostPopular")}</Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">€{formatPrice(PRICING[p.id].monthly, language)}</span>
                      <span className="text-sm text-muted-foreground">{t("landing.priceTeaser.perMonth")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="text-base px-8" data-testid="button-price-teaser-pricing">
                <Link href={`/${language}/pricing`}>
                  {t("landing.priceTeaser.cta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-price-teaser-start">
                <a href={`/${language}/auth`}>{t("landing.priceTeaser.ctaSecondary")}</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{t("landing.priceTeaser.note")}</p>
          </div>
        </div>
      </section>

      {/* ─── I) FAQ ─────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow={t("landing.faq.eyebrow")}
            title={t("landing.faq.title")}
            subtitle={t("landing.faq.subtitle")}
          />

          <div className="mx-auto mt-12 max-w-3xl space-y-4">
            {FAQ.map((item, idx) => (
              <FAQItem
                key={item.q}
                q={t(item.q)}
                a={t(item.a)}
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
            <Badge variant="secondary" className="mb-6">{t("landing.finalCta.eyebrow")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("landing.finalCta.title")}
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              {t("landing.finalCta.subtitle")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="text-base px-10" data-testid="button-final-cta-try">
                <a href={`/${language}/auth`}>
                  {t("landing.finalCta.ctaPrimary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-final-cta-pricing">
                <Link href={`/${language}/pricing`}>{t("landing.finalCta.ctaSecondary")}</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t("landing.finalCta.feature1")}
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t("landing.finalCta.feature2")}
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
                <Badge variant="secondary" className="mb-4">{t("landing.blogSection.eyebrow")}</Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {t("landing.blogSection.title")}
                </h2>
                <p className="mt-4 text-muted-foreground">
                  {t("landing.blogSection.description")}
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {blogs.map((blog) => (
                  <Link key={blog.id} href={`/${language}/blog/${blog.slug}`}>
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
                          {t("landing.blogSection.readMore")}
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="text-center mt-8">
                <Button variant="outline" asChild>
                  <Link href={`/${language}/blog`}>
                    {t("landing.blogSection.viewAll")}
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
                href={`/${language}/privacy`}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-privacy"
              >
                {t("landing.footer.privacy")}
              </Link>
              <Link
                href={`/${language}/terms`}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-terms"
              >
                {t("landing.footer.terms")}
              </Link>
              <Link
                href={`/${language}/google-permissions`}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-google-permissions"
              >
                {t("landing.footer.googlePermissions")}
              </Link>
              <Link
                href={`/${language}/contact`}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-footer-contact"
              >
                {t("landing.footer.contact")}
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4" /> {t("landing.footer.secureData")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Wifi className="h-4 w-4" /> {t("landing.footer.officialApi")}
              </span>
              <span className="inline-flex items-center gap-2">
                <Headphones className="h-4 w-4" /> {t("landing.footer.support")}
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
              © {new Date().getFullYear()} HolaRevi. {t("landing.footer.rights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
