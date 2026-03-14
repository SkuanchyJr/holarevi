import { Button } from "@/components/ui/button";
import { useLanguage, type Language } from "@/lib/i18n";
import { Globe } from "lucide-react";

const languageOrder: Language[] = ["es", "ca", "en"];
const languageLabels: Record<Language, string> = {
  es: "ES",
  ca: "CA",
  en: "EN",
};

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const cycleLanguage = () => {
    const currentIndex = languageOrder.indexOf(language);
    const nextIndex = (currentIndex + 1) % languageOrder.length;
    setLanguage(languageOrder[nextIndex]);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleLanguage}
      data-testid="button-language-toggle"
      title={`Language: ${languageLabels[language]}`}
    >
      <span className="text-sm font-medium">{languageLabels[language]}</span>
      <span className="sr-only">Toggle language</span>
    </Button>
  );
}
