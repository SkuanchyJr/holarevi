import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  ArrowRight,
  Smartphone,
  Wifi,
  Clock,
  TrendingUp,
  Shield,
  CheckCircle2,
  Sparkles,
  Zap,
  Users,
  Building2,
  ChevronDown,
  X,
  Check,
  Lock,
  Truck,
  RefreshCw,
  Quote,
  Flame,
  Crown,
  Headphones,
  Palette,
  Award,
} from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { Link } from "wouter";
import { Seo } from "@/components/seo";
import { useLanguage } from "@/lib/i18n";

/* ─── Utility ─────────────────────────────────────────────────────────────── */
function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

/* Launch-pricing deadline (urgency).
   Update when launch window changes — this is the only knob. */
const LAUNCH_END_DATE = new Date("2026-06-15T23:59:59");

/* Stock indicator state. Tweak as reservations come in. */
const TOTAL_UNITS = 100;
const RESERVED_UNITS = 67;

/* ─── IntersectionObserver hook for reveal-on-scroll ─────────────────────── */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─── Premium 3D product visual ───────────────────────────────────────────── */
function ProductHero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = ((e.clientY - cy) / (rect.height / 2)) * -10;
      const y = ((e.clientX - cx) / (rect.width / 2)) * 10;
      setRotation({ x, y });
    };
    const onLeave = () => setRotation({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-lg mx-auto"
      style={{ perspective: "1400px" }}
    >
      {/* Halos */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-[120px] animate-glow-pulse" />
        <div className="absolute top-1/4 left-1/3 h-48 w-48 rounded-full bg-amber-400/20 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 h-40 w-40 rounded-full bg-sky-400/20 blur-[80px]" />
      </div>

      {/* Floating chips */}
      <div className="absolute -top-2 -left-4 z-30 hidden sm:block animate-float-slow" style={{ animationDelay: "0s" }}>
        <div className="glass-card rounded-2xl px-4 py-2.5 shadow-2xl shadow-primary/20 flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-xs font-bold">+18 reviews</span>
        </div>
      </div>

      <div
        className="absolute -bottom-4 -right-2 z-30 hidden sm:block animate-float-slow"
        style={{ animationDelay: "1.5s" }}
      >
        <div className="glass-card rounded-2xl px-4 py-2.5 shadow-2xl shadow-primary/20 flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] text-muted-foreground">Tap to review</div>
            <div className="text-xs font-bold">2 sec ago</div>
          </div>
        </div>
      </div>

      <div
        className="transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="relative rounded-[2rem] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] border border-white/10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />
          {/* Top highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Product image */}
          <img
            src="/nfc-stand-hero.png"
            alt="HolaRevi NFC Stand"
            className="w-full h-auto relative z-10"
            loading="eager"
          />

          {/* Bottom shadow */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-20" />
        </div>

        {/* NFC corner badge */}
        <div className="absolute -top-3 -right-3 z-30">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-amber-400 blur-xl opacity-60 animate-glow-pulse" />
            <Badge className="relative bg-gradient-to-br from-amber-400 to-amber-500 text-black font-bold px-4 py-2 text-xs shadow-xl border-0">
              <Wifi className="h-3.5 w-3.5 mr-1.5" />
              NFC ready
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Animated counter ────────────────────────────────────────────────────── */
function AnimatedStat({
  value,
  suffix,
  label,
  prefix = "",
}: {
  value: number;
  suffix?: string;
  label: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 1200;
          const startTime = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setCount(Math.round(value * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
        {prefix}{count}{suffix}
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

/* ─── Stat block (no animation, plain) ────────────────────────────────────── */
function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground mt-1.5">{label}</div>
    </div>
  );
}

/* ─── Countdown timer ─────────────────────────────────────────────────────── */
function useCountdown(target: Date) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  void tick;
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const minutes = Math.floor((diff / 60_000) % 60);
  const seconds = Math.floor((diff / 1_000) % 60);
  return { days, hours, minutes, seconds };
}

function CountdownTimer({
  labels,
}: {
  labels: { days: string; hours: string; minutes: string; seconds: string };
}) {
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_END_DATE);
  const items: Array<[number, string]> = [
    [days, labels.days],
    [hours, labels.hours],
    [minutes, labels.minutes],
    [seconds, labels.seconds],
  ];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {items.map(([n, l]) => (
        <div
          key={l}
          className="rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur p-3 sm:p-4 text-center"
        >
          <div className="text-2xl sm:text-3xl font-mono font-bold tabular-nums">
            {String(n).padStart(2, "0")}
          </div>
          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-1">
            {l}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Units progress bar ──────────────────────────────────────────────────── */
function UnitsProgress({
  reserved,
  total,
  labelReserved,
  labelLeft,
}: {
  reserved: number;
  total: number;
  labelReserved: string;
  labelLeft: string;
}) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const pct = (reserved / total) * 100;

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => setProgress(pct));
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pct]);

  const left = total - reserved;

  return (
    <div ref={ref}>
      <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
        <span className="font-medium">
          <span className="font-bold text-foreground">{reserved}</span>
          <span className="text-muted-foreground"> / {total} {labelReserved}</span>
        </span>
        <span className="font-semibold text-amber-600 dark:text-amber-400">
          {labelLeft.replace("{count}", String(left))}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-foreground/8 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-shimmer transition-all duration-1500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ─── How-it-works step ───────────────────────────────────────────────────── */
function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative h-full">
      <div className="relative rounded-3xl border border-foreground/10 bg-card/50 backdrop-blur-sm p-7 h-full transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 overflow-hidden">
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative flex items-start justify-between mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary group-hover:from-primary group-hover:to-blue-500 group-hover:text-primary-foreground transition-all duration-500 shadow-sm">
            {icon}
          </div>
          <span className="text-6xl font-black bg-gradient-to-br from-foreground/10 to-foreground/0 bg-clip-text text-transparent select-none leading-none">
            {step}
          </span>
        </div>
        <h3 className="relative text-xl font-bold mb-2 tracking-tight">{title}</h3>
        <p className="relative text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ─── FAQ ──────────────────────────────────────────────────────────────────── */
function NFCFaqItem({
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
    <div
      className={cn(
        "rounded-2xl border bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-300",
        open ? "border-primary/40 shadow-lg shadow-primary/5" : "border-foreground/10 hover:border-foreground/20"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-6 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold">{q}</span>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/5 transition-all duration-300",
              open && "bg-primary text-primary-foreground rotate-180"
            )}
          >
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-6 text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Promo bar (sticky on top) ───────────────────────────────────────────── */
function PromoBar({
  text,
  cta,
  href,
}: {
  text: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary via-blue-500 to-primary text-primary-foreground bg-[length:200%_100%] animate-shimmer">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-medium flex-wrap">
          <Flame className="h-4 w-4 shrink-0 fill-current" />
          <span>{text}</span>
          <Link
            href={href}
            className="inline-flex items-center gap-1 underline underline-offset-2 font-semibold hover:opacity-90"
            data-testid="link-nfc-promobar"
          >
            {cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Pricing/Preorder card ──────────────────────────────────────────────── */
function PreorderCard({
  href,
  t,
}: {
  href: string;
  t: (k: string) => string;
}) {
  const features = [
    t("nfc.pricing.feature1"),
    t("nfc.pricing.feature2"),
    t("nfc.pricing.feature3"),
    t("nfc.pricing.feature4"),
    t("nfc.pricing.feature5"),
    t("nfc.pricing.feature6"),
    t("nfc.pricing.feature7"),
  ];

  return (
    <div className="relative">
      {/* Glow halo */}
      <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_100%] animate-shimmer opacity-60 blur-xl" />

      <div className="relative rounded-[2rem] border border-primary/20 bg-card/95 backdrop-blur-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* "Most reserved" tag */}
        <div className="absolute top-5 right-5">
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 shadow-none">
            <Crown className="h-3 w-3" />
            {t("nfc.pricing.tagPopular")}
          </Badge>
        </div>

        <div className="p-6 sm:p-10">
          {/* Title */}
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            {t("nfc.pricing.eyebrow")}
          </Badge>

          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            {t("nfc.pricing.title")}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">{t("nfc.pricing.subtitle")}</p>

          {/* Price block */}
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-5xl sm:text-6xl font-bold tracking-tight">
              {t("nfc.pricing.priceNew")}
            </span>
            <span className="text-2xl text-muted-foreground line-through decoration-2 decoration-destructive/60">
              {t("nfc.pricing.priceCrossed")}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-6">
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
              <Sparkles className="h-3 w-3" />
              {t("nfc.pricing.saveBadge")}
            </Badge>
            <span className="text-sm text-muted-foreground">{t("nfc.pricing.unit")}</span>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-8">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </div>
                <span className="text-foreground/90">{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full h-14 text-base font-bold bg-gradient-to-r from-primary to-blue-500 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-primary/25"
            asChild
            data-testid="button-nfc-preorder-card"
          >
            <Link href={href}>
              {t("nfc.pricing.cta")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>

          {/* Notes */}
          <div className="mt-5 space-y-2">
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <Lock className="h-3 w-3" />
              {t("nfc.pricing.secureNote")}
            </p>
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <Truck className="h-3 w-3" />
              {t("nfc.pricing.shipping")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function NFCStand() {
  const { t, language } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const contactHref = `/${language}/contact`;

  const STEPS = [
    {
      step: "01",
      icon: <Smartphone className="h-7 w-7" />,
      title: t("nfc.how.step1.title"),
      description: t("nfc.how.step1.desc"),
    },
    {
      step: "02",
      icon: <Star className="h-7 w-7" />,
      title: t("nfc.how.step2.title"),
      description: t("nfc.how.step2.desc"),
    },
    {
      step: "03",
      icon: <CheckCircle2 className="h-7 w-7" />,
      title: t("nfc.how.step3.title"),
      description: t("nfc.how.step3.desc"),
    },
  ];

  const BENEFITS = [
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: t("nfc.benefits.b1.title"),
      desc: t("nfc.benefits.b1.desc"),
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: t("nfc.benefits.b2.title"),
      desc: t("nfc.benefits.b2.desc"),
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: t("nfc.benefits.b3.title"),
      desc: t("nfc.benefits.b3.desc"),
    },
    {
      icon: <Building2 className="h-6 w-6" />,
      title: t("nfc.benefits.b4.title"),
      desc: t("nfc.benefits.b4.desc"),
    },
  ];

  const SPECS = [
    { label: t("nfc.specs.s1.label"), value: t("nfc.specs.s1.value") },
    { label: t("nfc.specs.s2.label"), value: t("nfc.specs.s2.value") },
    { label: t("nfc.specs.s3.label"), value: t("nfc.specs.s3.value") },
    { label: t("nfc.specs.s4.label"), value: t("nfc.specs.s4.value") },
    { label: t("nfc.specs.s5.label"), value: t("nfc.specs.s5.value") },
    { label: t("nfc.specs.s6.label"), value: t("nfc.specs.s6.value") },
  ];

  const MOCKUPS = [
    { src: "/nfc-stand-restaurant.png", label: t("nfc.mockups.restaurant") },
    { src: "/nfc-stand-hotel.png", label: t("nfc.mockups.hotel") },
    { src: "/nfc-stand-shop.png", label: t("nfc.mockups.shop") },
  ];

  const FAQ = [
    { q: t("nfc.faq.q1"), a: t("nfc.faq.a1") },
    { q: t("nfc.faq.q2"), a: t("nfc.faq.a2") },
    { q: t("nfc.faq.q3"), a: t("nfc.faq.a3") },
    { q: t("nfc.faq.q4"), a: t("nfc.faq.a4") },
    { q: t("nfc.faq.q5"), a: t("nfc.faq.a5") },
    { q: t("nfc.faq.q6"), a: t("nfc.faq.a6") },
    { q: t("nfc.faq.q7"), a: t("nfc.faq.a7") },
  ];

  const TESTIMONIALS = [
    {
      quote: t("nfc.testimonials.t1.quote"),
      author: t("nfc.testimonials.t1.author"),
      role: t("nfc.testimonials.t1.role"),
    },
    {
      quote: t("nfc.testimonials.t2.quote"),
      author: t("nfc.testimonials.t2.author"),
      role: t("nfc.testimonials.t2.role"),
    },
    {
      quote: t("nfc.testimonials.t3.quote"),
      author: t("nfc.testimonials.t3.author"),
      role: t("nfc.testimonials.t3.role"),
    },
  ];

  const COMPARISON_ROWS = [
    { label: t("nfc.comparison.row1"), manual: t("nfc.comparison.row1Manual"), nfc: t("nfc.comparison.row1NFC") },
    { label: t("nfc.comparison.row2"), manual: t("nfc.comparison.row2Manual"), nfc: t("nfc.comparison.row2NFC") },
    { label: t("nfc.comparison.row3"), manual: t("nfc.comparison.row3Manual"), nfc: t("nfc.comparison.row3NFC") },
    { label: t("nfc.comparison.row4"), manual: t("nfc.comparison.row4Manual"), nfc: t("nfc.comparison.row4NFC") },
    { label: t("nfc.comparison.row5"), manual: t("nfc.comparison.row5Manual"), nfc: t("nfc.comparison.row5NFC") },
    { label: t("nfc.comparison.row6"), manual: t("nfc.comparison.row6Manual"), nfc: t("nfc.comparison.row6NFC") },
  ];

  const LOGO_ITEMS = [
    t("nfc.logos.l1"),
    t("nfc.logos.l2"),
    t("nfc.logos.l3"),
    t("nfc.logos.l4"),
    t("nfc.logos.l5"),
    t("nfc.logos.l6"),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Seo
        title={t("nfc.seo.title")}
        description={t("nfc.seo.description")}
        keywords={t("nfc.seo.keywords")}
      />

      <PromoBar text={t("nfc.promobar.text")} cta={t("nfc.promobar.cta")} href="#preorder" />
      <LandingHeader />

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" />
          <div className="absolute inset-0 bg-grid-pattern opacity-50 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
          <div className="absolute -top-32 left-1/2 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
          <div className="absolute top-1/2 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-[100px]" />
          <div className="absolute top-1/3 left-0 h-72 w-72 rounded-full bg-sky-500/10 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Left: Copy */}
              <div className="order-2 lg:order-1 animate-fade-in-up">
                {/* Badge row */}
                <div className="flex items-center gap-2 flex-wrap mb-5">
                  <Badge
                    variant="secondary"
                    className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm border-primary/20 bg-primary/8"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {t("nfc.hero.badge")}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-medium">{t("nfc.hero.rating")}</span>
                  </div>
                </div>

                {/* Headline */}
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.05]">
                  {t("nfc.hero.title1")}{" "}
                  <span className="text-gradient-shimmer">
                    {t("nfc.hero.titleHighlight")}
                  </span>{" "}
                  {t("nfc.hero.title2")}
                </h1>

                {/* Subtitle */}
                <p className="mt-6 text-lg text-muted-foreground sm:text-xl leading-relaxed max-w-xl">
                  {t("nfc.hero.subtitle")}
                </p>

                {/* Lightning callout */}
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  <Zap className="h-4 w-4 fill-current" />
                  {t("nfc.hero.lightningText")}
                </div>

                {/* Price block */}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <span className="text-4xl font-bold tracking-tight">
                    {t("nfc.hero.priceNew")}
                  </span>
                  <span className="text-xl text-muted-foreground line-through decoration-2 decoration-destructive/60">
                    {t("nfc.hero.priceCrossed")}
                  </span>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
                    <Sparkles className="h-3 w-3" />
                    {t("nfc.hero.saveText")}
                  </Badge>
                </div>

                {/* CTAs */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="text-base h-14 px-8 bg-gradient-to-r from-primary to-blue-500 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-primary/25 font-bold"
                    asChild
                    data-testid="button-nfc-preorder-hero"
                  >
                    <Link href={contactHref}>
                      {t("nfc.hero.cta")}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base h-14 px-8 border-foreground/15 backdrop-blur-sm bg-background/50 hover:bg-foreground/5"
                    asChild
                    data-testid="button-nfc-learn-more"
                  >
                    <a href="#how">{t("nfc.hero.ctaSecondary")}</a>
                  </Button>
                </div>

                {/* Trust strip */}
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    {t("nfc.hero.trust1")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    {t("nfc.hero.trust2")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    {t("nfc.hero.trust3")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-primary" />
                    {t("nfc.hero.trust4")}
                  </span>
                </div>
              </div>

              {/* Right: 3D Product */}
              <div className="order-1 lg:order-2 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
                <ProductHero3D />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LOGO MARQUEE ────────────────────────────────────────────────── */}
      <section className="border-y border-foreground/8 py-10 bg-muted/20">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs sm:text-sm font-medium uppercase tracking-widest text-muted-foreground mb-6">
            {t("nfc.logos.title")}
          </p>
          <div className="marquee-mask relative overflow-hidden">
            <div className="flex gap-12 animate-marquee whitespace-nowrap">
              {[...LOGO_ITEMS, ...LOGO_ITEMS, ...LOGO_ITEMS].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-base sm:text-lg font-semibold text-foreground/60 hover:text-foreground transition-colors shrink-0"
                >
                  <Building2 className="h-5 w-5 text-primary/70" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ─────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 reveal-on-scroll" ref={useReveal<HTMLElement>()}>
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatBlock value={t("nfc.stats.s1Value")} label={t("nfc.stats.s1Label")} />
            <StatBlock value={t("nfc.stats.s2Value")} label={t("nfc.stats.s2Label")} />
            <StatBlock value={t("nfc.stats.s3Value")} label={t("nfc.stats.s3Label")} />
            <StatBlock value={t("nfc.stats.s4Value")} label={t("nfc.stats.s4Label")} />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section
        id="how"
        className="py-16 sm:py-24 reveal-on-scroll"
        ref={useReveal<HTMLElement>()}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              {t("nfc.how.eyebrow")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("nfc.how.title")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("nfc.how.subtitle")}</p>
          </div>

          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-3 relative">
            {/* connector line */}
            <div className="absolute left-0 right-0 top-[3.5rem] hidden md:block">
              <div className="mx-[16%] h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </div>
            {STEPS.map((step) => (
              <StepCard key={step.step} {...step} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFITS ─────────────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 bg-muted/20 relative overflow-hidden reveal-on-scroll"
        ref={useReveal<HTMLElement>()}
      >
        <div className="absolute inset-0 -z-10 bg-dot-pattern opacity-40" />

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              {t("nfc.benefits.eyebrow")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("nfc.benefits.title")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("nfc.benefits.subtitle")}</p>
          </div>

          <div className="mx-auto max-w-6xl grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="group relative rounded-3xl border border-foreground/10 bg-card/60 backdrop-blur-sm p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary mb-5 group-hover:from-primary group-hover:to-blue-500 group-hover:text-primary-foreground transition-all duration-500">
                  {b.icon}
                </div>
                <h3 className="relative text-lg font-bold tracking-tight mb-2">{b.title}</h3>
                <p className="relative text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PREORDER / PRICING (with countdown) ─────────────────────────── */}
      <section
        id="preorder"
        className="py-16 sm:py-24 relative overflow-hidden reveal-on-scroll"
        ref={useReveal<HTMLElement>()}
      >
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
          <div className="absolute top-0 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
        </div>

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              {/* Left: Urgency block */}
              <div>
                <Badge variant="secondary" className="mb-4 gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <Flame className="h-3.5 w-3.5" />
                  {t("nfc.urgency.eyebrow")}
                </Badge>
                <h2 className="text-3xl font-bold tracking-tight sm:text-5xl leading-tight">
                  {t("nfc.urgency.title")}
                </h2>
                <p className="mt-4 text-muted-foreground text-lg max-w-xl">
                  {t("nfc.urgency.subtitle")}
                </p>

                {/* Countdown */}
                <div className="mt-8">
                  <CountdownTimer
                    labels={{
                      days: t("nfc.urgency.days"),
                      hours: t("nfc.urgency.hours"),
                      minutes: t("nfc.urgency.minutes"),
                      seconds: t("nfc.urgency.seconds"),
                    }}
                  />
                </div>

                {/* Units progress */}
                <div className="mt-8">
                  <UnitsProgress
                    reserved={RESERVED_UNITS}
                    total={TOTAL_UNITS}
                    labelReserved={t("nfc.urgency.unitsLabel")}
                    labelLeft={`${t("nfc.urgency.unitsLeftPrefix")} {count} ${t("nfc.urgency.unitsLeftSuffix")}`}
                  />
                </div>

                {/* Trust mini-icons */}
                <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                  <div className="rounded-xl border border-foreground/10 bg-card/60 p-3 text-center">
                    <Truck className="h-5 w-5 text-primary mx-auto mb-1" />
                    <div className="text-xs font-medium">{t("nfc.hero.trust1")}</div>
                  </div>
                  <div className="rounded-xl border border-foreground/10 bg-card/60 p-3 text-center">
                    <Shield className="h-5 w-5 text-primary mx-auto mb-1" />
                    <div className="text-xs font-medium">{t("nfc.hero.trust3")}</div>
                  </div>
                  <div className="rounded-xl border border-foreground/10 bg-card/60 p-3 text-center">
                    <Lock className="h-5 w-5 text-primary mx-auto mb-1" />
                    <div className="text-xs font-medium">{t("nfc.hero.trust2")}</div>
                  </div>
                </div>
              </div>

              {/* Right: Pricing card */}
              <PreorderCard href={contactHref} t={t} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ───────────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 bg-muted/20 reveal-on-scroll"
        ref={useReveal<HTMLElement>()}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              {t("nfc.comparison.eyebrow")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("nfc.comparison.title")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("nfc.comparison.subtitle")}</p>
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="rounded-3xl border border-foreground/10 bg-card/60 backdrop-blur-sm overflow-hidden shadow-xl shadow-primary/5">
              {/* Header row */}
              <div className="grid grid-cols-3 sm:grid-cols-[2fr_1fr_1fr] border-b border-foreground/10 bg-foreground/[0.02]">
                <div className="hidden sm:block p-4 sm:p-5" />
                <div className="p-4 sm:p-5 text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground">
                    <X className="h-4 w-4" />
                    {t("nfc.comparison.manualHeader")}
                  </div>
                </div>
                <div className="p-4 sm:p-5 text-center bg-primary/5 border-l border-foreground/10 relative">
                  <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary">
                    <Sparkles className="h-4 w-4" />
                    {t("nfc.comparison.nfcHeader")}
                  </div>
                </div>
              </div>

              {/* Rows */}
              {COMPARISON_ROWS.map((row, idx) => (
                <div
                  key={row.label}
                  className={cn(
                    "grid grid-cols-3 sm:grid-cols-[2fr_1fr_1fr]",
                    idx < COMPARISON_ROWS.length - 1 && "border-b border-foreground/10"
                  )}
                >
                  <div className="hidden sm:block p-4 sm:p-5 text-sm font-medium text-foreground/80">
                    {row.label}
                  </div>
                  <div className="col-span-1 sm:hidden p-4 text-xs font-semibold text-muted-foreground border-r border-foreground/10">
                    {row.label}
                  </div>
                  <div className="p-4 sm:p-5 text-sm text-center text-muted-foreground flex items-center justify-center gap-1.5">
                    <X className="h-3.5 w-3.5 text-destructive/70" />
                    <span>{row.manual}</span>
                  </div>
                  <div className="p-4 sm:p-5 text-sm text-center font-semibold bg-primary/5 border-l border-foreground/10 flex items-center justify-center gap-1.5">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
                    <span>{row.nfc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Button
                size="lg"
                className="h-13 px-8 bg-gradient-to-r from-primary to-blue-500 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-primary/25 font-bold"
                asChild
                data-testid="button-nfc-preorder-comparison"
              >
                <Link href={contactHref}>
                  {t("nfc.hero.cta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MOCKUPS ──────────────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 reveal-on-scroll"
        ref={useReveal<HTMLElement>()}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              {t("nfc.mockups.eyebrow")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("nfc.mockups.title")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("nfc.mockups.subtitle")}</p>
          </div>

          <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
            {MOCKUPS.map((mockup) => (
              <div
                key={mockup.label}
                className="group relative rounded-3xl overflow-hidden border border-foreground/10 bg-card shadow-sm hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-500"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={mockup.src}
                    alt={mockup.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                  <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-md font-semibold">
                    {mockup.label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Additional environments as text chips */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
            {[
              t("nfc.mockups.clinic"),
              t("nfc.mockups.cafe"),
              t("nfc.mockups.reception"),
            ].map((label) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/60 backdrop-blur-sm px-4 py-2 text-sm font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <Building2 className="h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 bg-muted/20 reveal-on-scroll"
        ref={useReveal<HTMLElement>()}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              {t("nfc.testimonials.eyebrow")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("nfc.testimonials.title")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("nfc.testimonials.subtitle")}</p>
          </div>

          <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((tt, i) => (
              <div
                key={i}
                className="group relative rounded-3xl border border-foreground/10 bg-card/60 backdrop-blur-sm p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30"
              >
                <Quote className="absolute top-6 right-6 h-10 w-10 text-primary/15" />
                <div className="flex items-center gap-0.5 mb-4">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-base leading-relaxed mb-6 text-foreground/90">
                  "{tt.quote}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-foreground/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-500 text-white font-bold text-sm">
                    {tt.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{tt.author}</div>
                    <div className="text-xs text-muted-foreground">{tt.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SPECIFICATIONS ──────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 reveal-on-scroll"
        ref={useReveal<HTMLElement>()}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                {t("nfc.specs.eyebrow")}
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
                {t("nfc.specs.title")}
              </h2>
              <p className="mt-4 text-muted-foreground text-lg">{t("nfc.specs.subtitle")}</p>
            </div>

            <div className="rounded-3xl border border-foreground/10 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden shadow-xl shadow-primary/5">
              <div className="grid grid-cols-2 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-foreground/8">
                {SPECS.map((spec) => (
                  <div
                    key={spec.label}
                    className="p-6 sm:p-8 text-center group hover:bg-primary/5 transition-colors"
                  >
                    <div className="text-xs sm:text-sm uppercase tracking-wider text-muted-foreground mb-2">
                      {spec.label}
                    </div>
                    <div className="text-lg sm:text-xl font-bold tracking-tight">{spec.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-24 bg-muted/20 reveal-on-scroll"
        ref={useReveal<HTMLElement>()}
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <Badge variant="secondary" className="mb-4">
              {t("nfc.faq.eyebrow")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("nfc.faq.title")}
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">{t("nfc.faq.subtitle")}</p>
          </div>
          <div className="mx-auto max-w-3xl space-y-3">
            {FAQ.map((item, idx) => (
              <NFCFaqItem
                key={idx}
                q={item.q}
                a={item.a}
                open={openFaq === idx}
                onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" />
          <div className="absolute bottom-0 left-1/2 h-80 w-[50rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute inset-0 bg-grid-pattern opacity-30 [mask-image:radial-gradient(ellipse_at_bottom,black_30%,transparent_70%)]" />
        </div>

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5 border-primary/30 bg-primary/10">
              <Flame className="h-3.5 w-3.5 text-primary" />
              {t("nfc.finalCta.eyebrow")}
            </Badge>
            <h2 className="text-4xl font-bold tracking-tight sm:text-6xl leading-[1.05]">
              {t("nfc.finalCta.title")}{" "}
              <span className="text-gradient-shimmer">
                {t("nfc.finalCta.titleHighlight")}
              </span>
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("nfc.finalCta.subtitle")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="text-base h-14 px-10 bg-gradient-to-r from-primary to-blue-500 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 shadow-lg shadow-primary/25 font-bold"
                asChild
                data-testid="button-nfc-preorder-final"
              >
                <Link href={contactHref}>
                  {t("nfc.finalCta.ctaPrimary")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base h-14 px-8 border-foreground/15 backdrop-blur-sm bg-background/50 hover:bg-foreground/5"
                asChild
                data-testid="button-nfc-contact"
              >
                <Link href={contactHref}>{t("nfc.finalCta.ctaSecondary")}</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t("nfc.finalCta.feature1")}
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t("nfc.finalCta.feature2")}
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t("nfc.finalCta.feature3")}
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t("nfc.finalCta.feature4")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER (simple) ──────────────────────────────────────────────── */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <Link href={`/${language}/`}>
              <div className="flex items-center py-2 cursor-pointer">
                <img
                  src="/holarevi-dark.png"
                  alt="HolaRevi"
                  className="h-10 w-auto block dark:hidden object-contain"
                />
                <img
                  src="/holarevi-light.png"
                  alt="HolaRevi"
                  className="h-10 w-auto hidden dark:block object-contain"
                />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HolaRevi. {t("landing.footer.rights")}
            </p>
          </div>
        </div>
      </footer>

      {/* ─── STICKY MOBILE CTA ───────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-foreground/10 bg-background/90 backdrop-blur-xl shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.15)]">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{t("nfc.hero.priceNew")}</span>
              <span className="text-xs text-muted-foreground line-through">
                {t("nfc.hero.priceCrossed")}
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] py-0 h-4">
                -40%
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {t("nfc.hero.trust1")} · {t("nfc.hero.trust3")}
            </div>
          </div>
          <Button
            size="lg"
            className="h-11 bg-gradient-to-r from-primary to-blue-500 shadow-lg shadow-primary/25 font-bold whitespace-nowrap"
            asChild
            data-testid="button-nfc-preorder-mobile"
          >
            <Link href={contactHref}>
              {t("nfc.hero.cta")}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      {/* spacer for sticky CTA on mobile */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
    </div>
  );
}
