import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useLocation } from "wouter";

const languages = [
  { code: "es", label: "ES" },
  { code: "en", label: "EN" },
] as const;

export function LanguageToggle() {
  const { language } = useLanguage();
  const [location, setLocation] = useLocation();

  const toggleLanguage = () => {
    const nextLang = language === "es" ? "en" : "es";
    
    // Calculate new path
    const currentPath = location.replace(/^\/(en|es)/, "") || "/";
    const nextPath = `/${nextLang}${currentPath === "/" ? "" : currentPath}`;
    
    setLocation(nextPath);
    // Force i18n to sync since wouter setLocation doesn't trigger popstate
    setTimeout(() => {
      window.dispatchEvent(new Event("popstate"));
    }, 0);
  };

  const label = language === "es" ? "ES" : "EN";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      data-testid="button-language-toggle"
      title={`Switch to ${language === "es" ? "English" : "Spanish"}`}
    >
      <span className="text-xs font-bold">{label}</span>
    </Button>
  );
}
