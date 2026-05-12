import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";

export default function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          company: formData.companyName,
          email: formData.email,
          phone: formData.phone || undefined,
          message: formData.message,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      setSubmitted(true);
      setFormData({
        name: "",
        companyName: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (err) {
      setError(t("contact.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-texture min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center py-4">
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
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-md">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold">
                  {t("contact.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("contact.name")}</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder={t("contact.namePlaceholder")}
                      value={formData.name}
                      onChange={handleChange}
                      required
                      data-testid="input-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName">{t("contact.company")}</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      type="text"
                      placeholder={t("contact.companyPlaceholder")}
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                      data-testid="input-company-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t("contact.email")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t("contact.emailPlaceholder")}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("contact.phone")}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+34 600 000 000"
                      value={formData.phone}
                      onChange={handleChange}
                      data-testid="input-phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">{t("contact.message")}</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder={t("contact.messagePlaceholder")}
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={4}
                      data-testid="input-message"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                    data-testid="button-submit"
                  >
                    {isSubmitting ? t("contact.sending") : t("contact.submit")}
                  </Button>

                  {error && (
                    <p className="text-destructive text-sm mt-2 text-center" data-testid="text-error">
                      {error}
                    </p>
                  )}

                  {submitted && (
                    <p className="text-green-600 dark:text-green-400 text-sm mt-2 text-center" data-testid="text-success">
                      {t("contact.success")}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-privacy">
                {t("landing.footer.privacy")}
              </Link>
              <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-terms">
                {t("landing.footer.terms")}
              </Link>
              <Link href="/google-permissions" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-google-permissions">
                Google API Permissions
              </Link>
              <Link href="/contact" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-contact">
                {t("landing.footer.contact")}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HolaRevi. {t("landing.footer.rights")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
