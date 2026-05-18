import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Package, QrCode, Eye, MessageSquare, Sparkles, ShoppingBag, Truck, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NfcOrder } from "@shared/schema";

// Keep in sync with client/src/pages/nfc-stand.tsx:45-46 until extracted to shared.
const TOTAL_UNITS = 100;
const RESERVED_UNITS = 67;

type OrderStatus = NfcOrder["status"];

const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  processing: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  shipped: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
  delivered: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30",
  cancelled: "bg-muted text-muted-foreground border-foreground/15",
  refunded: "bg-muted text-muted-foreground border-foreground/15",
};

function formatEur(cents: number | null | undefined) {
  const value = (cents ?? 0) / 100;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(date: Date | string | null | undefined, language: string) {
  if (!date) return "—";
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function MyOrdersCard({ orders, language, t }: { orders: NfcOrder[]; language: string; t: (k: string) => string }) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-5"
      data-testid="card-nfc-my-orders"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Package className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold">{t("nfcPanel.myOrders.title")}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="text-left font-semibold py-2 pr-4">{t("nfcPanel.myOrders.headerOrder")}</th>
              <th className="text-left font-semibold py-2 pr-4">{t("nfcPanel.myOrders.headerDate")}</th>
              <th className="text-right font-semibold py-2 pr-4">{t("nfcPanel.myOrders.headerQty")}</th>
              <th className="text-right font-semibold py-2 pr-4">{t("nfcPanel.myOrders.headerTotal")}</th>
              <th className="text-left font-semibold py-2">{t("nfcPanel.myOrders.headerStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const statusKey = (o.status ?? "pending_payment") as keyof typeof STATUS_STYLE;
              return (
                <tr key={o.id} className="border-b border-border/60 last:border-b-0" data-testid={`row-order-${o.id}`}>
                  <td className="py-3 pr-4 font-mono text-xs text-foreground/80">
                    {o.id?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-foreground/80">{formatDate(o.createdAt, language)}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">{o.quantity ?? 1}</td>
                  <td className="py-3 pr-4 text-right tabular-nums font-medium">{formatEur(o.totalCents)}</td>
                  <td className="py-3">
                    <Badge variant="outline" className={cn("font-medium", STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending_payment)}>
                      {t(`nfcPanel.myOrders.status.${statusKey}`)}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BuyStandCard({ language, t }: { language: string; t: (k: string) => string }) {
  const checkoutHref = `/${language}/nfc/checkout`;
  const reservedPct = Math.round((RESERVED_UNITS / TOTAL_UNITS) * 100);
  const unitsLeft = TOTAL_UNITS - RESERVED_UNITS;
  const bullets = [
    t("nfcPanel.buy.bullet1"),
    t("nfcPanel.buy.bullet2"),
    t("nfcPanel.buy.bullet3"),
    t("nfcPanel.buy.bullet4"),
  ];

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden" data-testid="card-nfc-buy">
      <div className="grid gap-6 md:grid-cols-[1fr_1.25fr] md:items-stretch">
        {/* Product image */}
        <div className="relative bg-gradient-to-br from-primary/10 via-background to-background p-6 flex items-center justify-center min-h-[220px]">
          <img
            src="/nfc-stand-hero.png"
            alt="HolaRevi NFC Stand"
            className="max-h-64 w-auto object-contain drop-shadow-xl"
            loading="lazy"
          />
          <Badge className="absolute top-4 left-4 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
            <Sparkles className="h-3 w-3" />
            {t("nfcPanel.buy.eyebrow")}
          </Badge>
        </div>

        {/* Offer details */}
        <div className="p-6 md:py-7 md:pr-7 md:pl-0 flex flex-col">
          <h2 className="text-xl font-semibold tracking-tight">{t("nfcPanel.buy.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("nfcPanel.buy.subtitle")}</p>

          {/* Price */}
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tracking-tight">{t("nfcPanel.buy.priceNew")}</span>
            <span className="text-lg text-muted-foreground line-through decoration-2 decoration-destructive/60">
              {t("nfcPanel.buy.priceCrossed")}
            </span>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
              <Sparkles className="h-3 w-3" />
              {t("nfcPanel.buy.save")}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("nfcPanel.buy.unit")}</p>

          {/* Bullets */}
          <ul className="mt-4 grid gap-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </div>
                <span className="text-foreground/90">{b}</span>
              </li>
            ))}
          </ul>

          {/* Units progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium">
                <span className="font-bold text-foreground">{RESERVED_UNITS}</span>
                <span className="text-muted-foreground"> / {TOTAL_UNITS} {t("nfcPanel.buy.unitsLabel")}</span>
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {t("nfcPanel.buy.unitsLeft").replace("{count}", String(unitsLeft))}
              </span>
            </div>
            <div className="h-2 rounded-full bg-foreground/8 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500"
                style={{ width: `${reservedPct}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <Button size="lg" className="font-semibold" asChild data-testid="button-nfc-panel-buy">
              <Link href={checkoutHref}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                {t("nfcPanel.buy.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                {t("nfc.hero.trust1")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                {t("nfc.hero.trust2")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                {t("nfc.hero.trust3")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MeasureStep({
  icon,
  title,
  desc,
  cta,
  href,
  testId,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta: string;
  href: string;
  testId: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed flex-1">{desc}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function MeasureResultsSteps({ language, t }: { language: string; t: (k: string) => string }) {
  const steps = [
    {
      icon: <QrCode className="h-4 w-4" />,
      title: t("nfcPanel.measure.step1.title"),
      desc: t("nfcPanel.measure.step1.desc"),
      cta: t("nfcPanel.measure.step1.cta"),
      href: `/${language}/qr-reviews`,
      testId: "step-create-qr",
    },
    {
      icon: <Eye className="h-4 w-4" />,
      title: t("nfcPanel.measure.step2.title"),
      desc: t("nfcPanel.measure.step2.desc"),
      cta: t("nfcPanel.measure.step2.cta"),
      href: `/${language}/qr-reviews`,
      testId: "step-track-scans",
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      title: t("nfcPanel.measure.step3.title"),
      desc: t("nfcPanel.measure.step3.desc"),
      cta: t("nfcPanel.measure.step3.cta"),
      href: `/${language}/reviews`,
      testId: "step-read-reviews",
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      title: t("nfcPanel.measure.step4.title"),
      desc: t("nfcPanel.measure.step4.desc"),
      cta: t("nfcPanel.measure.step4.cta"),
      href: `/${language}/review-summary`,
      testId: "step-ai-summary",
    },
  ];

  return (
    <section data-testid="section-nfc-measure">
      <div className="mb-3">
        <h2 className="text-base font-semibold">{t("nfcPanel.measure.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("nfcPanel.measure.subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <MeasureStep key={s.testId} {...s} />
        ))}
      </div>
    </section>
  );
}

export default function NFCPanel() {
  const { t, language } = useLanguage();

  const { data, isLoading } = useQuery<{ success: boolean; orders: NfcOrder[] }>({
    queryKey: ["/api/nfc-shop/my-orders"],
  });

  const orders = data?.orders ?? [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <PageHeader title={t("nfcPanel.title")} subtitle={t("nfcPanel.subtitle")} />

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : orders.length > 0 ? (
        <MyOrdersCard orders={orders} language={language} t={t} />
      ) : null}

      <BuyStandCard language={language} t={t} />

      <MeasureResultsSteps language={language} t={t} />
    </div>
  );
}
