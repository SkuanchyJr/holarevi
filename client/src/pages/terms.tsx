import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function TermsOfService() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("termsPage.backToHome")}
            </Button>
          </Link>
        </div>

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1 data-testid="text-page-title">{t("termsPage.title")}</h1>
          <p className="text-muted-foreground">{t("termsPage.lastUpdated")}</p>

          <p>{t("termsPage.intro1")}</p>
          <p>{t("termsPage.intro2")}</p>

          <hr />

          <h2>{t("termsPage.s1Title")}</h2>
          <p>{t("termsPage.s1p1")}</p>

          <hr />

          <h2>{t("termsPage.s2Title")}</h2>
          <p>{t("termsPage.s2p1")}</p>
          <ul>
            <li>{t("termsPage.s2item1")}</li>
            <li>{t("termsPage.s2item2")}</li>
            <li>{t("termsPage.s2item3")}</li>
          </ul>

          <hr />

          <h2>{t("termsPage.s3Title")}</h2>
          <p>{t("termsPage.s3p1")}</p>
          <ul>
            <li>{t("termsPage.s3item1")}</li>
            <li>{t("termsPage.s3item2")}</li>
            <li>{t("termsPage.s3item3")}</li>
            <li>{t("termsPage.s3item4")}</li>
            <li>{t("termsPage.s3item5")}</li>
          </ul>
          <p>{t("termsPage.s3p2")}</p>

          <hr />

          <h2>{t("termsPage.s4Title")}</h2>
          <p>{t("termsPage.s4p1")}</p>
          <ul>
            <li>{t("termsPage.s4item1")}</li>
            <li>{t("termsPage.s4item2")}</li>
            <li>{t("termsPage.s4item3")}</li>
          </ul>
          <p>{t("termsPage.s4p2")}</p>

          <hr />

          <h2>{t("termsPage.s5Title")}</h2>
          <p>{t("termsPage.s5p1")}</p>
          <ul>
            <li>{t("termsPage.s5item1")}</li>
            <li>{t("termsPage.s5item2")}</li>
            <li>{t("termsPage.s5item3")}</li>
            <li>{t("termsPage.s5item4")}</li>
            <li>{t("termsPage.s5item5")}</li>
          </ul>
          <p><strong>{t("termsPage.s5note")}</strong></p>

          <hr />

          <h2>{t("termsPage.s6Title")}</h2>
          <p>{t("termsPage.s6p1")}</p>
          <ul>
            <li>{t("termsPage.s6item1")}</li>
            <li>{t("termsPage.s6item2")}</li>
            <li>{t("termsPage.s6item3")}</li>
          </ul>
          <p>{t("termsPage.s6p2")}</p>
          <p>{t("termsPage.s6p3")}</p>

          <hr />

          <h2>{t("termsPage.s7Title")}</h2>
          <p>{t("termsPage.s7p1")}</p>
          <ul>
            <li>{t("termsPage.s7item1")}</li>
            <li>{t("termsPage.s7item2")}</li>
          </ul>
          <p>{t("termsPage.s7p2")}</p>

          <hr />

          <h2>{t("termsPage.s8Title")}</h2>
          <p>{t("termsPage.s8p1")}</p>
          <p>{t("termsPage.s8p2")}</p>
          <p>{t("termsPage.s8p3")}</p>
          <ul>
            <li>{t("termsPage.s8item1")}</li>
            <li>{t("termsPage.s8item2")}</li>
            <li>{t("termsPage.s8item3")}</li>
          </ul>

          <hr />

          <h2>{t("termsPage.s9Title")}</h2>
          <p>{t("termsPage.s9p1")}</p>
          <ul>
            <li>{t("termsPage.s9item1")}</li>
            <li>{t("termsPage.s9item2")}</li>
            <li>{t("termsPage.s9item3")}</li>
            <li>{t("termsPage.s9item4")}</li>
          </ul>
          <p>{t("termsPage.s9p2")}</p>

          <hr />

          <h2>{t("termsPage.s10Title")}</h2>
          <p>{t("termsPage.s10p1")}</p>
          <ul>
            <li>{t("termsPage.s10item1")}</li>
            <li>{t("termsPage.s10item2")}</li>
            <li>{t("termsPage.s10item3")}</li>
          </ul>
          <p>{t("termsPage.s10p2")}</p>

          <hr />

          <h2>{t("termsPage.s11Title")}</h2>
          <p>{t("termsPage.s11p1")}</p>
          <ul>
            <li>{t("termsPage.s11item1")}</li>
            <li>{t("termsPage.s11item2")}</li>
          </ul>
          <p>{t("termsPage.s11p2")}</p>
          <ul>
            <li>{t("termsPage.s11item3")}</li>
            <li>{t("termsPage.s11item4")}</li>
            <li>{t("termsPage.s11item5")}</li>
          </ul>

          <hr />

          <h2>{t("termsPage.s12Title")}</h2>
          <p>{t("termsPage.s12p1")}</p>
          <p>{t("termsPage.s12p2")}</p>

          <hr />

          <h2>{t("termsPage.s13Title")}</h2>
          <p>{t("termsPage.s13p1")}</p>
          <ul>
            <li>{t("termsPage.s13item1")}</li>
            <li>{t("termsPage.s13item2")}</li>
            <li>{t("termsPage.s13item3")}</li>
            <li>{t("termsPage.s13item4")}</li>
            <li>{t("termsPage.s13item5")}</li>
            <li>{t("termsPage.s13item6")}</li>
            <li>{t("termsPage.s13item7")}</li>
            <li>{t("termsPage.s13item8")}</li>
            <li>{t("termsPage.s13item9")}</li>
          </ul>
          <p>{t("termsPage.s13p2")}</p>
          <p>{t("termsPage.s13p3")}</p>

          <hr />

          <h2>{t("termsPage.s14Title")}</h2>
          <p>{t("termsPage.s14p1")}</p>
          <ul>
            <li>{t("termsPage.s14item1")}</li>
            <li>{t("termsPage.s14item2")}</li>
            <li>{t("termsPage.s14item3")}</li>
            <li>{t("termsPage.s14item4")}</li>
          </ul>

          <hr />

          <h2>{t("termsPage.s15Title")}</h2>
          <p>{t("termsPage.s15p1")}</p>
          <p>{t("termsPage.s15p2")}</p>
          <ul>
            <li>{t("termsPage.s15item1")}</li>
            <li>{t("termsPage.s15item2")}</li>
            <li>{t("termsPage.s15item3")}</li>
            <li>{t("termsPage.s15item4")}</li>
          </ul>
          <p>{t("termsPage.s15p3")}</p>

          <hr />

          <h2>{t("termsPage.s16Title")}</h2>
          <p>{t("termsPage.s16p1")}</p>
          <p>{t("termsPage.s16p2")}</p>

          <hr />

          <h2>{t("termsPage.s17Title")}</h2>
          <p>{t("termsPage.s17p1")}</p>
          <p>{t("termsPage.s17p2")}</p>

          <hr />

          <h2>{t("termsPage.s18Title")}</h2>
          <p>{t("termsPage.s18p1")}</p>
          <p>{t("termsPage.s18p2")}</p>
          <p>{t("termsPage.s18p3")}</p>

          <hr />

          <h2>{t("termsPage.s19Title")}</h2>
          <p>{t("termsPage.s19p1")}</p>
          <p><strong>{t("termsPage.s19email")}</strong> <a href="mailto:info@holarevi.com">info@holarevi.com</a></p>

          <hr />

          <h2>{t("termsPage.s20Title")}</h2>
          <p>{t("termsPage.s20p1")}</p>
        </article>

        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <div className="flex justify-center gap-6">
            <Link href="/privacy" className="hover:underline">{t("termsPage.footerPrivacy")}</Link>
            <Link href="/terms" className="hover:underline">{t("termsPage.footerTerms")}</Link>
            <Link href="/google-permissions" className="hover:underline">{t("termsPage.footerPermissions")}</Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} {t("termsPage.footerRights")}</p>
        </footer>
      </div>
    </div>
  );
}
