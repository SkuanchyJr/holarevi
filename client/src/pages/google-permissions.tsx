import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function GooglePermissions() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("googlePermissions.backToHome")}
            </Button>
          </Link>
        </div>

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1 data-testid="text-page-title">{t("googlePermissions.title")}</h1>
          <p className="text-muted-foreground">{t("googlePermissions.lastUpdated")}</p>

          <p>{t("googlePermissions.intro")}</p>

          <hr />

          <h2>{t("googlePermissions.s1Title")}</h2>
          <p>{t("googlePermissions.s1p1")}</p>
          <p>{t("googlePermissions.s1p2")}</p>
          <ol>
            <li>
              <strong>{t("googlePermissions.s1item1Title")}</strong>
              <ul>
                <li>{t("googlePermissions.s1item1a")}</li>
                <li>{t("googlePermissions.s1item1b")}</li>
              </ul>
            </li>
            <li>
              <strong>{t("googlePermissions.s1item2Title")}</strong>
              <ul>
                <li>{t("googlePermissions.s1item2a")}</li>
                <li>{t("googlePermissions.s1item2b")}</li>
                <li>{t("googlePermissions.s1item2c")}</li>
                <li>{t("googlePermissions.s1item2d")}</li>
                <li>{t("googlePermissions.s1item2e")}</li>
              </ul>
            </li>
            <li>
              <strong>{t("googlePermissions.s1item3Title")}</strong>
              <ul>
                <li>{t("googlePermissions.s1item3a")}</li>
                <li>{t("googlePermissions.s1item3b")}</li>
              </ul>
            </li>
          </ol>
          <p><strong>{t("googlePermissions.s1note")}</strong></p>

          <hr />

          <h2>{t("googlePermissions.s2Title")}</h2>
          <p>{t("googlePermissions.s2p1")}</p>
          <ul>
            <li>{t("googlePermissions.s2item1")}</li>
            <li>{t("googlePermissions.s2item2")}</li>
            <li>{t("googlePermissions.s2item3")}</li>
            <li>{t("googlePermissions.s2item4")}</li>
            <li>{t("googlePermissions.s2item5")}
              <ul>
                <li>{t("googlePermissions.s2item5a")}</li>
                <li>{t("googlePermissions.s2item5b")}</li>
                <li>{t("googlePermissions.s2item5c")}</li>
              </ul>
            </li>
          </ul>
          <p><strong>{t("googlePermissions.s2note")}</strong></p>

          <hr />

          <h2>{t("googlePermissions.s3Title")}</h2>
          <p>{t("googlePermissions.s3p1")}</p>
          <ul>
            <li>{t("googlePermissions.s3store1")}</li>
            <li>{t("googlePermissions.s3store2")}</li>
            <li>{t("googlePermissions.s3store3")}</li>
          </ul>
          <p>{t("googlePermissions.s3p2")}</p>
          <ul>
            <li>{t("googlePermissions.s3protect1")}</li>
            <li>{t("googlePermissions.s3protect2")}</li>
            <li>{t("googlePermissions.s3protect3")}</li>
          </ul>
          <p>{t("googlePermissions.s3p3")} <Link href="/privacy">{t("googlePermissions.s3privacyLink")}</Link>.</p>

          <hr />

          <h2>{t("googlePermissions.s4Title")}</h2>
          <p>{t("googlePermissions.s4p1")}</p>
          <ul>
            <li>{t("googlePermissions.s4item1")}</li>
            <li>{t("googlePermissions.s4item2")}</li>
            <li>{t("googlePermissions.s4item3")}</li>
            <li>{t("googlePermissions.s4item4")}</li>
          </ul>
          <p><strong>{t("googlePermissions.s4note")}</strong></p>

          <hr />

          <h2>{t("googlePermissions.s5Title")}</h2>
          <p><strong>{t("googlePermissions.s5p1")}</strong></p>
          <p>{t("googlePermissions.s5p2")}</p>
          <ul>
            <li>{t("googlePermissions.s5can1")}</li>
            <li>{t("googlePermissions.s5can2")}</li>
          </ul>
          <p>{t("googlePermissions.s5p3")}</p>
          <ul>
            <li>{t("googlePermissions.s5revoke1")}</li>
            <li>{t("googlePermissions.s5revoke2")}</li>
            <li>{t("googlePermissions.s5revoke3")}</li>
          </ul>
          <p>{t("googlePermissions.s5p4")}</p>

          <hr />

          <h2>{t("googlePermissions.s6Title")}</h2>
          <p>{t("googlePermissions.s6p1")}</p>
          <ul>
            <li>{t("googlePermissions.s6item1")}</li>
            <li>{t("googlePermissions.s6item2")}</li>
            <li>{t("googlePermissions.s6item3")} <Link href="/privacy">{t("googlePermissions.s3privacyLink")}</Link></li>
          </ul>
          <p>{t("googlePermissions.s6p2")}</p>

          <hr />

          <h2>{t("googlePermissions.s7Title")}</h2>
          <p>{t("googlePermissions.s7p1")}</p>
          <p><strong>{t("googlePermissions.s7email")}</strong> <a href="mailto:info@holarevi.com">info@holarevi.com</a></p>
        </article>

        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <div className="flex justify-center gap-6">
            <Link href="/privacy" className="hover:underline">{t("googlePermissions.footerPrivacy")}</Link>
            <Link href="/terms" className="hover:underline">{t("googlePermissions.footerTerms")}</Link>
            <Link href="/google-permissions" className="hover:underline">{t("googlePermissions.footerPermissions")}</Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} {t("googlePermissions.footerRights")}</p>
        </footer>
      </div>
    </div>
  );
}
