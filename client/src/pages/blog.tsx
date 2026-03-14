import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { LandingHeader } from "@/components/landing-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Calendar } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { format } from "date-fns";
import { es, ca, enUS } from "date-fns/locale";
import type { Blog } from "@shared/schema";

const dateLocales = {
  es,
  ca,
  en: enUS,
};

export default function BlogPage() {
  const { t, language } = useLanguage();
  
  const { data: blogsData, isLoading } = useQuery<{ success: boolean; blogs: Blog[] }>({
    queryKey: ["/api/blogs"],
  });

  const blogs = blogsData?.blogs || [];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              {t("blog.title")}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t("blog.subtitle")}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {t("blog.noPosts")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {blogs.map((blog) => (
                <Link key={blog.id} href={`/blog/${blog.slug}`}>
                  <Card className="hover-elevate cursor-pointer transition-all" data-testid={`card-blog-${blog.id}`}>
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        <time dateTime={new Date(blog.createdAt).toISOString()}>
                          {format(new Date(blog.createdAt), "d MMMM yyyy", {
                            locale: dateLocales[language as keyof typeof dateLocales] || enUS,
                          })}
                        </time>
                      </div>
                      <CardTitle className="text-xl hover:text-primary transition-colors">
                        {blog.title}
                      </CardTitle>
                      {blog.subtitle && (
                        <p className="text-muted-foreground mt-1">
                          {blog.subtitle}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground line-clamp-3">
                        {blog.content.replace(/[#*`]/g, '').substring(0, 200)}...
                      </p>
                      <div className="flex items-center gap-1 mt-4 text-primary font-medium text-sm">
                        {t("blog.readMore")}
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} HolaRevi. {t("landing.footer.allRightsReserved")}</p>
        </div>
      </footer>
    </div>
  );
}
