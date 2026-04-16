import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { ReactNode, createContext, useContext, useCallback, useMemo, useEffect } from "react";

// Initial resources with SEO-optimized landing page content
// We will move these to separate JSON files if needed later, 
// but for the first iteration, we can keep them here or import them.
import esJson from "../locales/es.json";
import enJson from "../locales/en.json";

// Language detection logic
const languageDetector = new LanguageDetector();
languageDetector.addDetector({
  name: "path-detector",
  lookup() {
    if (typeof window === "undefined") return undefined;
    const path = window.location.pathname;
    const firstPart = path.split("/").filter(Boolean)[0];
    if (firstPart === "en") return "en";
    if (firstPart === "es") return "es";
    return undefined;
  }
});

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enJson },
      es: { translation: esJson },
    },
    fallbackLng: "en",
    detection: {
      order: ["path-detector", "querystring", "cookie", "localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: any) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation();

  const language = (i18nInstance.language?.split("-")[0] as Language) || "es";

  const setLanguage = useCallback((lang: Language) => {
    i18nInstance.changeLanguage(lang);
    
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split("/").filter(Boolean);
    
    let newPath;
    if (pathParts[0] === "en" || pathParts[0] === "es") {
      pathParts[0] = lang;
      newPath = "/" + pathParts.join("/");
    } else {
      newPath = `/${lang}${currentPath}`;
    }

    // Include search params if any
    if (window.location.search) {
      newPath += window.location.search;
    }
    
    // Use window.history to avoid full page reload but trigger sync
    window.history.pushState({}, "", newPath);
    // Manually trigger popstate so other components (like wouter) notice
    window.dispatchEvent(new Event("popstate"));
  }, [i18nInstance]);

  // Sync state if URL changes (external to this component)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith("/en")) i18nInstance.changeLanguage("en");
      if (path.startsWith("/es")) i18nInstance.changeLanguage("es");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [i18nInstance]);

  const value = useMemo(() => ({
    language: language.startsWith("en") ? "en" as const : "es" as const,
    setLanguage,
    t: (key: string, options?: any) => t(key, options),
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslations() {
  const { language, t } = useLanguage();
  return { language, t };
}

export default i18n;
