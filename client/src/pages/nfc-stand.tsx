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
} from "lucide-react";
import { LandingHeader } from "@/components/landing-header";
import { Link } from "wouter";
import { Seo } from "@/components/seo";
import { useLanguage } from "@/lib/i18n";

/* ─── Utility ─────────────────────────────────────────────────────────────── */
function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

/* ─── Floating 3D product visual (CSS-only) ───────────────────────────────── */
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
      const x = ((e.clientY - cy) / (rect.height / 2)) * -8;
      const y = ((e.clientX - cx) / (rect.width / 2)) * 8;
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
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto" style={{ perspective: "1200px" }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-primary/20 blur-[100px] animate-pulse" />
        <div className="absolute top-1/4 left-1/3 h-40 w-40 rounded-full bg-amber-400/15 blur-[60px]" />
      </div>

      <div
        className="transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />

          {/* Product image */}
          <img
            src="/nfc-stand-hero.png"
            alt="HolaRevi NFC Stand"
            className="w-full h-auto relative z-10"
            loading="eager"
          />

          {/* Reflection effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none z-20" />
        </div>

        {/* Floating badge */}
        <div className="absolute -top-4 -right-4 z-30 animate-bounce" style={{ animationDuration: "3s" }}>
          <Badge className="bg-amber-500 text-black font-bold px-4 py-2 text-sm shadow-lg shadow-amber-500/30 border-0">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            NFC
          </Badge>
        </div>
      </div>
    </div>
  );
}

/* ─── Animated counter ────────────────────────────────────────────────────── */
function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = Math.ceil(value / 40);
          const interval = setInterval(() => {
            start += step;
            if (start >= value) {
              setCount(value);
              clearInterval(interval);
            } else {
              setCount(start);
            }
          }, 30);
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
      <div className="text-4xl font-bold text-foreground">
        {count}{suffix}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

/* ─── Step card for "how it works" ────────────────────────────────────────── */
function StepCard({ step, icon, title, description }: { step: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative">
      <div className="rounded-2xl border bg-card p-8 h-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30">
        <div className="flex items-start justify-between mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
            {icon}
          </div>
          <span className="text-5xl font-black text-muted-foreground/10 select-none">{step}</span>
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ─── FAQ ──────────────────────────────────────────────────────────────────── */
function NFCFaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden transition-all duration-300">
      <button type="button" onClick={onToggle} className="w-full text-left p-6 focus:outline-none">
        <div className="flex items-center justify-between gap-4">
          <span className="text-base font-semibold">{q}</span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform duration-300", open && "rotate-180")} />
        </div>
      </button>
      <div className={cn("overflow-hidden transition-all duration-300", open ? "max-h-40 pb-6 px-6" : "max-h-0")}>
        <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function NFCStand() {
  const { t, language } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
    { icon: <TrendingUp className="h-6 w-6" />, title: t("nfc.benefits.b1.title"), desc: t("nfc.benefits.b1.desc") },
    { icon: <Star className="h-6 w-6" />, title: t("nfc.benefits.b2.title"), desc: t("nfc.benefits.b2.desc") },
    { icon: <Users className="h-6 w-6" />, title: t("nfc.benefits.b3.title"), desc: t("nfc.benefits.b3.desc") },
    { icon: <Building2 className="h-6 w-6" />, title: t("nfc.benefits.b4.title"), desc: t("nfc.benefits.b4.desc") },
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
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Seo
        title={t("nfc.seo.title")}
        description={t("nfc.seo.description")}
        keywords={t("nfc.seo.keywords")}
      />
      <LandingHeader />

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" />
          <div className="absolute -top-32 left-1/2 h-96 w-[50rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
          <div className="absolute top-1/2 right-0 h-64 w-64 rounded-full bg-amber-500/8 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 pt-20 pb-16 sm:pt-28 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              {/* Left: Copy */}
              <div className="order-2 lg:order-1">
                <Badge variant="secondary" className="gap-1.5 px-4 py-1.5 text-sm mb-6">
                  <Wifi className="h-3.5 w-3.5 text-primary" />
                  {t("nfc.hero.badge")}
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                  {t("nfc.hero.titleHighlight")}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary">
                    {t("nfc.hero.titlePrefix")}
                  </span>
                </h1>

                <p className="mt-6 text-lg text-muted-foreground sm:text-xl leading-relaxed">
                  {t("nfc.hero.subtitle")}
                </p>

                <div className="mt-4 flex items-center gap-2 text-amber-500 font-semibold">
                  <Zap className="h-5 w-5 fill-current" />
                  {t("nfc.hero.lightningText") || "en menos de 5 min"}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="text-base px-8 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-lg shadow-primary/25" asChild data-testid="button-nfc-preorder-hero">
                    <Link href={`/${language}/contact`}>
                      {t("nfc.hero.cta")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-nfc-learn-more">
                    <a href="#how">{t("nfc.hero.ctaSecondary")}</a>
                  </Button>
                </div>

                <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  {t("nfc.hero.footerText")}
                </p>
              </div>

              {/* Right: 3D Product */}
              <div className="order-1 lg:order-2">
                <ProductHero3D />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF STRIP ───────────────────────────────────────────── */}
      <section className="py-12 border-y bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-12">
            <AnimatedStat value={30} suffix="seg" label={t("nfc.stats.s1")} />
            <AnimatedStat value={100} suffix="%" label={t("nfc.stats.s2")} />
            <AnimatedStat value={5} suffix="x" label={t("nfc.stats.s3")} />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how" className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <Badge variant="secondary" className="mb-4">{t("nfc.how.eyebrow")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("nfc.how.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("nfc.how.subtitle")}</p>
          </div>

          <div className="mx-auto max-w-5xl grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < 2 && (
                  <div className="absolute top-10 left-full w-full hidden md:flex items-center justify-center z-10 -mx-3">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
                <StepCard {...step} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BENEFITS ─────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <Badge variant="secondary" className="mb-4">{t("nfc.benefits.eyebrow")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("nfc.benefits.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("nfc.benefits.subtitle")}</p>
          </div>

          <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border bg-card p-8 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 group">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  {b.icon}
                </div>
                <h3 className="text-lg font-bold mt-2">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SPECIFICATIONS ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">{t("nfc.specs.eyebrow")}</Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("nfc.specs.title")}</h2>
            </div>

            <div className="rounded-3xl border bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                {SPECS.map((spec) => (
                  <div key={spec.label} className="p-6 text-center group hover:bg-primary/5 transition-colors">
                    <div className="text-sm text-muted-foreground mb-1">{spec.label}</div>
                    <div className="text-lg font-bold">{spec.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MOCKUPS ──────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <Badge variant="secondary" className="mb-4">{t("nfc.mockups.eyebrow")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("nfc.mockups.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("nfc.mockups.subtitle")}</p>
          </div>

          <div className="mx-auto max-w-6xl grid gap-8 md:grid-cols-3">
            {MOCKUPS.map((mockup) => (
              <div key={mockup.label} className="group relative rounded-2xl overflow-hidden border bg-card shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={mockup.src}
                    alt={mockup.label}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6">
                  <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-sm">
                    {mockup.label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <Badge variant="secondary" className="mb-4">{t("nfc.faq.eyebrow")}</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("nfc.faq.title")}</h2>
          </div>
          <div className="mx-auto max-w-3xl space-y-4">
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
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" />
          <div className="absolute bottom-0 left-1/2 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
        </div>

        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6 gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {t("nfc.finalCta.eyebrow")}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              {t("nfc.finalCta.title")}
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              {t("nfc.finalCta.subtitle")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-base px-10 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-lg shadow-primary/25" asChild data-testid="button-nfc-preorder-final">
                <Link href={`/${language}/contact`}>
                  {t("nfc.finalCta.ctaPrimary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-nfc-contact">
                <Link href={`/${language}/contact`}>{t("nfc.finalCta.ctaSecondary")}</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
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
                <img src="/holarevi-dark.png" alt="HolaRevi" className="h-10 w-auto block dark:hidden object-contain" />
                <img src="/holarevi-light.png" alt="HolaRevi" className="h-10 w-auto hidden dark:block object-contain" />
              </div>
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HolaRevi. {t("landing.footer.rights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
