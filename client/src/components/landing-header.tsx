import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";

interface LandingHeaderProps {
  showLoginButton?: boolean;
}

export function LandingHeader({ showLoginButton = true }: LandingHeaderProps) {
  const { t, language } = useLanguage();

  return (
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
            <Link href={`/${language}/blog`}>
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-blog">
                {t("nav.blog")}
              </span>
            </Link>
            <Link href={`/${language}/pricing`}>
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-pricing">
                {t("nav.pricing")}
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
  );
}
