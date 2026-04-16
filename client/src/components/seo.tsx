import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "software";
  lang?: string;
}

export function Seo({
  title,
  description,
  keywords,
  image = "https://holarevi.com/og-image.png",
  url = "https://holarevi.com",
  type = "website",
  lang,
}: SeoProps) {
  const { t, i18n } = useTranslation();
  
  const currentLang = lang || i18n.language || "es";
  const siteName = "HolaRevi";
  const defaults = currentLang.startsWith("en")
    ? {
        title: "AI Google Review Responder & Management | HolaRevi",
        description: "Boost your local SEO and reputation. HolaRevi's AI automatically responds to your Google reviews in your brand's tone, 24/7.",
        keywords: "ai google review responder, reputation management software, automate google reviews, local seo tool, hospitality saas",
      }
    : {
        title: "Responder reseñas de Google con IA de forma automática | HolaRevi",
        description: "Optimiza la reputación online de tu negocio. HolaRevi responde tus reseñas de Google automáticamente con inteligencia artificial, manteniendo tu tono de marca 24/7.",
        keywords: "responder reseñas Google IA, gestión reputación online SaaS, automatización reseñas Google, software para negocios locales, inteligencia artificial reseñas",
      };
  const defaultTitle = t("seo.home.title", defaults.title);
  const defaultDescription = t("seo.home.description", defaults.description);
  const defaultKeywords = t("seo.home.keywords", defaults.keywords);

  const metaTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const metaDescription = description || defaultDescription;
  const metaKeywords = keywords || defaultKeywords;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <html lang={currentLang} />

      {/* canonical and alternate (hreflang) */}
      <link rel="canonical" href={`${url}/${currentLang}`} />
      <link rel="alternate" hrefLang="es" href={`${url}/es`} />
      <link rel="alternate" hrefLang="en" href={`${url}/en`} />
      <link rel="alternate" hrefLang="x-default" href={`${url}/en`} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={metaTitle} />
      <meta property="twitter:description" content={metaDescription} />
      <meta property="twitter:image" content={image} />

      {/* JSON-LD Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": type === "software" ? "SoftwareApplication" : "Organization",
          "name": siteName,
          "url": url,
          "logo": "https://holarevi.com/logo.png",
          "description": metaDescription,
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "49.00",
            "priceCurrency": "EUR"
          }
        })}
      </script>
    </Helmet>
  );
}
