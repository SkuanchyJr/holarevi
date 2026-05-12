import { useState } from "react";
import { X, Flame } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { Countdown } from "./countdown";
import { LAUNCH_OFFER_END_AT, PROMO, isPromoActive } from "./promo-config";

export function PromoBar() {
  const { t, language } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !isPromoActive()) return null;

  return (
    <div
      className="relative z-[60] w-full bg-gradient-to-r from-orange-600 via-rose-600 to-orange-600 text-white shadow-md"
      role="banner"
      data-testid="promo-bar"
    >
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Flame className="h-4 w-4 shrink-0" />
            <span>
              {t("convert.promoBar.headline").replace("{percent}", String(PROMO.percentOff))}
            </span>
          </span>
          <span className="hidden sm:inline opacity-90">·</span>
          <span className="inline-flex items-center gap-2">
            <span className="opacity-90">{t("convert.promoBar.endsIn")}</span>
            <Countdown
              to={LAUNCH_OFFER_END_AT}
              compact
              labels={{
                d: t("convert.countdown.d"),
                h: t("convert.countdown.h"),
                m: t("convert.countdown.m"),
                s: t("convert.countdown.s"),
              }}
              className="font-mono font-bold tabular-nums"
            />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/${language}/auth`}
            className="hidden sm:inline-flex items-center rounded-md bg-white px-3 py-1 text-xs font-bold text-rose-700 hover:bg-white/95 transition-colors"
            data-testid="promo-bar-cta"
          >
            {t("convert.promoBar.cta")}
          </a>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={t("convert.promoBar.dismiss")}
            className="rounded-md p-1 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            data-testid="promo-bar-dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
