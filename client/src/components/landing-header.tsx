import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";

interface LandingHeaderProps {
  showLoginButton?: boolean;
  /** Hide the slim -90% promo bar (e.g. on the pricing page itself). */
  hidePromoBar?: boolean;
}

export function LandingHeader({ showLoginButton = true, hidePromoBar = false }: LandingHeaderProps) {
  const { t, language } = useLanguage();

  return (
    <>
      {!hidePromoBar && (
        <Link href={`/${language}/pricing`}>
          <div
            className="group flex items-center justify-center gap-2 bg-primary px-4 py-1.5 text-center text-xs font-medium text-primary-foreground sm:text-sm cursor-pointer"
            data-testid="bar-promo"
          >
            <Sparkles className="hidden h-3.5 w-3.5 shrink-0 sm:inline-block" />
            <span>{t("promo.bar.text")}</span>
            <span className="hidden items-center gap-1 font-semibold underline-offset-2 group-hover:underline sm:inline-flex">
              {t("promo.bar.cta")}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      )}

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href={`/${language}/`}>
              <div className="flex items-center py-4 cursor-pointer">
                <img
                  src="/holarevi-dark.png"
                  alt="HolaRevi Logo"
                  className="h-14 w-auto block dark:hidden object-contain"
                />
                <img
                  src="/holarevi-light.png"
                  alt="HolaRevi Logo"
                  className="h-14 w-auto hidden dark:block object-contain"
                />
              </div>
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              <Link href={`/${language}/nfc`}>
                <span className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5" data-testid="link-nfc">
                  NFC
                  <span className="inline-flex items-center rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 leading-none">
                    {t("nav.new") || "New"}
                  </span>
                </span>
              </Link>
              <Link href={`/${language}/blog`}>
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-blog">
                  {t("nav.blog")}
                </span>
              </Link>
              <Link href={`/${language}/pricing`}>
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5" data-testid="link-pricing">
                  {t("nav.pricing")}
                  <span className="inline-flex items-center rounded-full bg-primary/15 text-primary text-[10px] font-bold px-1.5 py-0.5 leading-none">
                    {t("common.discountBadge")}
                  </span>
                </span>
              </Link>
              <Link href={`/${language}/contact`}>
                <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-contact">
                  {t("nav.contact") || t("common.contact")}
                </span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            {showLoginButton && (
              <Button asChild data-testid="button-login">
                <a href={`/${language}/auth`}>{t("nav.login")}</a>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
