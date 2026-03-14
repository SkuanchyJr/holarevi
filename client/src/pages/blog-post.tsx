import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { LandingHeader } from "@/components/landing-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEffect } from "react";
import { format } from "date-fns";
import { es, ca, enUS } from "date-fns/locale";
import type { Blog } from "@shared/schema";

const dateLocales = {
  es,
  ca,
  en: enUS,
};

function parseMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-4">$1</h2>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\n\n/gim, '</p><p class="mt-4">')
    .replace(/\n/gim, '<br/>');
}

export default function BlogPostPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const slug = params.slug as string;
  
  const { data: blogData, isLoading, error } = useQuery<{ success: boolean; blog: Blog }>({
    queryKey: [`/api/blogs/${slug}`],
    enabled: !!slug,
  });

  const blog = blogData?.blog;

  useEffect(() => {
    if (blog) {
      document.title = blog.metaTitle || blog.title;
      
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', blog.metaDescription || blog.subtitle || blog.content.substring(0, 160));

      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.setAttribute('content', blog.metaTitle || blog.title);

      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        document.head.appendChild(ogDesc);
      }
      ogDesc.setAttribute('content', blog.metaDescription || blog.subtitle || blog.content.substring(0, 160));
    }

    return () => {
      document.title = "HolaRevi";
    };
  }, [blog]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-8" />
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center py-16">
            <h1 className="text-2xl font-bold mb-4">{t("blog.notFound")}</h1>
            <p className="text-muted-foreground mb-8">{t("blog.notFoundDesc")}</p>
            <Button asChild>
              <Link href="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("blog.backToList")}
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main className="container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          <Button variant="ghost" size="sm" asChild className="mb-8">
            <Link href="/blog">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("blog.backToList")}
            </Link>
          </Button>

          <header className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4" />
              <time dateTime={new Date(blog.createdAt).toISOString()}>
                {format(new Date(blog.createdAt), "d MMMM yyyy", {
                  locale: dateLocales[language as keyof typeof dateLocales] || enUS,
                })}
              </time>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              {blog.title}
            </h1>
            {blog.subtitle && (
              <p className="text-xl text-muted-foreground">
                {blog.subtitle}
              </p>
            )}
          </header>

          <div 
            className="prose prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: `<p>${parseMarkdown(blog.content)}</p>` }}
          />
        </article>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} HolaRevi. {t("landing.footer.allRightsReserved")}</p>
        </div>
      </footer>
    </div>
  );
}
