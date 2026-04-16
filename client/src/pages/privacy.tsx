import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function PrivacyPolicy() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("privacyPage.backToHome")}
            </Button>
          </Link>
        </div>

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1 data-testid="text-page-title">{t("privacyPage.title")}</h1>
          <p className="text-muted-foreground">{t("privacyPage.lastUpdated")}</p>

          <p>{t("privacyPage.intro1")}</p>
          <p>{t("privacyPage.intro2")}</p>
          <p>{t("privacyPage.intro3")} <a href="mailto:info@holarevi.com">info@holarevi.com</a>.</p>

          <hr />

          <h2>{t("privacyPage.s1Title")}</h2>
          <p>{t("privacyPage.s1p1")}</p>
          <p><strong>{t("privacyPage.s1p2")}</strong></p>
          <address className="not-italic">
            HolaRevi<br />
            {t("privacyPage.s1address")}<br />
            {t("common.email")}: <a href="mailto:info@holarevi.com">info@holarevi.com</a>
          </address>

          <hr />

          <h2>{t("privacyPage.s2Title")}</h2>

          <h3>{t("privacyPage.s2_1Title")}</h3>
          <p>{t("privacyPage.s2_1p1")}</p>
          <ul>
            <li>{t("privacyPage.s2_1item1")}</li>
            <li>{t("privacyPage.s2_1item2")}</li>
            <li>{t("privacyPage.s2_1item3")}</li>
            <li>{t("privacyPage.s2_1item4")}</li>
          </ul>

          <hr />

          <h3>{t("privacyPage.s2_2Title")}</h3>
          <p>{t("privacyPage.s2_2p1")}</p>

          <h4>{t("privacyPage.s2_2gaTitle")}</h4>
          <ul>
            <li>{t("privacyPage.s2_2ga1")}</li>
            <li>{t("privacyPage.s2_2ga2")}</li>
            <li>{t("privacyPage.s2_2ga3")}</li>
          </ul>

          <h4>{t("privacyPage.s2_2gbpTitle")}</h4>
          <p>{t("privacyPage.s2_2gbpIntro")}</p>
          <ul>
            <li>{t("privacyPage.s2_2gbp1")}</li>
            <li>{t("privacyPage.s2_2gbp2")}</li>
            <li>{t("privacyPage.s2_2gbp3")}</li>
            <li>{t("privacyPage.s2_2gbp4")}</li>
            <li>{t("privacyPage.s2_2gbp5")}</li>
            <li>{t("privacyPage.s2_2gbp6")}</li>
          </ul>

          <h4>{t("privacyPage.s2_2notTitle")}</h4>
          <p>{t("privacyPage.s2_2notp1")}</p>
          <ul>
            <li>{t("privacyPage.s2_2not1")}</li>
            <li>{t("privacyPage.s2_2not2")}</li>
            <li>{t("privacyPage.s2_2not3")}</li>
            <li>{t("privacyPage.s2_2not4")}</li>
            <li>{t("privacyPage.s2_2not5")}</li>
          </ul>

          <hr />

          <h2>{t("privacyPage.s3Title")}</h2>
          <p>{t("privacyPage.s3p1")}</p>
          <ul>
            <li>{t("privacyPage.s3item1")}</li>
            <li>{t("privacyPage.s3item2")}</li>
            <li>{t("privacyPage.s3item3")}</li>
            <li>{t("privacyPage.s3item4")}</li>
            <li>{t("privacyPage.s3item5")}</li>
            <li>{t("privacyPage.s3item6")}</li>
          </ul>

          <p>{t("privacyPage.s3p2")}</p>
          <ul>
            <li>{t("privacyPage.s3not1")}</li>
            <li>{t("privacyPage.s3not2")}</li>
            <li>{t("privacyPage.s3not3")}</li>
          </ul>

          <p>
            {t("privacyPage.s3compliance")}{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              {t("privacyPage.s3complianceLink")}
            </a>
            {t("privacyPage.s3complianceEnd")}
          </p>

          <hr />

          <h2>{t("privacyPage.s4Title")}</h2>
          <p>{t("privacyPage.s4p1")}</p>
          <ul>
            <li>{t("privacyPage.s4item1")}</li>
            <li>{t("privacyPage.s4item2")}</li>
            <li>{t("privacyPage.s4item3")}</li>
            <li>{t("privacyPage.s4item4")}</li>
            <li>{t("privacyPage.s4item5")}</li>
          </ul>
          <p><strong>{t("privacyPage.s4legal")}</strong></p>

          <hr />

          <h2>{t("privacyPage.s5Title")}</h2>
          <p>{t("privacyPage.s5p1")}</p>
          <ul>
            <li>{t("privacyPage.s5item1")}</li>
            <li>{t("privacyPage.s5item2")}</li>
            <li>{t("privacyPage.s5item3")}</li>
            <li>{t("privacyPage.s5item4")}</li>
            <li>{t("privacyPage.s5item5")}</li>
          </ul>

          <p>{t("privacyPage.s5p2")}</p>

          <p>{t("privacyPage.s5p3")}</p>
          <ul>
            <li>{t("privacyPage.s5never1")}</li>
            <li>{t("privacyPage.s5never2")}</li>
            <li>{t("privacyPage.s5never3")}</li>
          </ul>

          <hr />

          <h2>{t("privacyPage.s6Title")}</h2>
          <p>{t("privacyPage.s6p1")}</p>
          <ul>
            <li>{t("privacyPage.s6item1")}</li>
            <li>{t("privacyPage.s6item2")}</li>
            <li>{t("privacyPage.s6item3")}</li>
            <li>{t("privacyPage.s6item4")}</li>
            <li>{t("privacyPage.s6item5")}</li>
          </ul>
          <p>{t("privacyPage.s6p2")}</p>

          <hr />

          <h2>{t("privacyPage.s7Title")}</h2>

          <h3>{t("privacyPage.s7_1Title")}</h3>
          <p>{t("privacyPage.s7_1p1")}</p>
          <ul>
            <li>{t("privacyPage.s7_1item1")}</li>
            <li>{t("privacyPage.s7_1item2")}</li>
          </ul>

          <h3>{t("privacyPage.s7_2Title")}</h3>
          <p>{t("privacyPage.s7_2p1")} <a href="mailto:info@holarevi.com">info@holarevi.com</a>.</p>
          <p>{t("privacyPage.s7_2p2")}</p>
          <ul>
            <li>{t("privacyPage.s7_2item1")}</li>
            <li>{t("privacyPage.s7_2item2")}</li>
            <li>{t("privacyPage.s7_2item3")}</li>
          </ul>

          <hr />

          <h2>{t("privacyPage.s8Title")}</h2>
          <p>{t("privacyPage.s8p1")}</p>
          <ul>
            <li>{t("privacyPage.s8item1")}</li>
            <li>{t("privacyPage.s8item2")}</li>
            <li>{t("privacyPage.s8item3")}</li>
            <li>{t("privacyPage.s8item4")}</li>
            <li>{t("privacyPage.s8item5")}</li>
            <li>{t("privacyPage.s8item6")}</li>
          </ul>
          <p>{t("privacyPage.s8p2")} <a href="mailto:info@holarevi.com">info@holarevi.com</a>.</p>
          <p>{t("privacyPage.s8p3")}</p>

          <hr />

          <h2>{t("privacyPage.s9Title")}</h2>
          <p>{t("privacyPage.s9p1")}</p>
          <p>{t("privacyPage.s9p2")}</p>
          <ul>
            <li>{t("privacyPage.s9item1")}</li>
            <li>{t("privacyPage.s9item2")}</li>
          </ul>

          <hr />

          <h2>{t("privacyPage.s10Title")}</h2>
          <p>{t("privacyPage.s10p1")}</p>
          <p>{t("privacyPage.s10p2")}</p>

          <hr />

          <h2>{t("privacyPage.s11Title")}</h2>
          <p>
            {t("privacyPage.s11p1")}{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              {t("privacyPage.s11link")}
            </a>
            {t("privacyPage.s11p2")}
          </p>
          <p><em>{t("privacyPage.s11note")}</em></p>

          <hr />

          <h2>{t("privacyPage.s12Title")}</h2>
          <p>{t("privacyPage.s12p1")}</p>
          <p>{t("privacyPage.s12p2")}</p>
          <p>
            {t("privacyPage.s12p3")}{" "}
            <a href="https://holarevi.com/privacy">https://holarevi.com/privacy</a>
          </p>

          <hr />

          <h2>{t("privacyPage.s13Title")}</h2>
          <p>{t("privacyPage.s13p1")}</p>
          <address className="not-italic">
            <strong>HolaRevi</strong><br />
            {t("privacyPage.s1address")}<br />
            {t("common.email")}: <a href="mailto:info@holarevi.com">info@holarevi.com</a>
          </address>
        </article>

        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <div className="flex justify-center gap-6">
            <Link href="/privacy" className="hover:underline">{t("privacyPage.footerPrivacy")}</Link>
            <Link href="/terms" className="hover:underline">{t("privacyPage.footerTerms")}</Link>
            <Link href="/google-permissions" className="hover:underline">{t("privacyPage.footerPermissions")}</Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} {t("privacyPage.footerRights")}</p>
        </footer>
      </div>
    </div>
  );
}
