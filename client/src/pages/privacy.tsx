import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function PrivacyPolicy() {
  const { language } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === "es" ? "Volver al inicio" : "Back to Home"}
            </Button>
          </Link>
        </div>

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1 data-testid="text-page-title">{language === "es" ? "HOLAREVI — POLÍTICA DE PRIVACIDAD" : "HOLAREVI — PRIVACY POLICY"}</h1>
          <p className="text-muted-foreground">{language === "es" ? "Última actualización: 4 de diciembre de 2025" : "Last Updated: December 4, 2025"}</p>

          <p>
            Welcome to HolaRevi ("we", "our", "us"). We provide an AI-powered platform that helps restaurants manage and reply to Google Reviews. This Privacy Policy explains how we collect, use, store, share, and protect personal information — including Google user data obtained through Google APIs.
          </p>
          <p>By using HolaRevi or connecting your Google account, you agree to this Privacy Policy.</p>
          <p>If you have questions, contact us at <a href="mailto:info@holarevi.com">info@holarevi.com</a>.</p>

          <hr />

          <h2>1. Who We Are</h2>
          <p>HolaRevi is a restaurant-focused SaaS platform based in Barcelona, Spain.</p>
          <p><strong>Data Controller:</strong></p>
          <address className="not-italic">
            HolaRevi<br />
            Carrer de Ramon Llull, 495, 08930 Sant Adrià de Besòs, Barcelona, Spain<br />
            Email: <a href="mailto:info@holarevi.com">info@holarevi.com</a>
          </address>

          <hr />

          <h2>2. What Data We Collect</h2>

          <h3>2.1. Data You Provide to Us</h3>
          <p>We collect:</p>
          <ul>
            <li>Your name and email address</li>
            <li>Restaurant/business information</li>
            <li>Subscription and billing details (handled securely by Stripe)</li>
            <li>Any communication you send us (email, chat, support messages)</li>
          </ul>

          <hr />

          <h3>2.2. Data We Collect Through Google APIs</h3>
          <p>When you sign in with Google and grant permission, HolaRevi accesses the following Google user data:</p>

          <h4>Google Account Information</h4>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Profile ID</li>
          </ul>

          <h4>Google Business Profile Data</h4>
          <p>For each location you authorize:</p>
          <ul>
            <li>Business name, address, phone number, categories</li>
            <li>Google Reviews (review text, rating, language, timestamp)</li>
            <li>Reviewer display names (as provided by Google)</li>
            <li>Your existing owner replies</li>
            <li>Location IDs</li>
            <li>OAuth tokens needed to securely access and manage your reviews</li>
          </ul>

          <h4>What We DO NOT Access</h4>
          <p>We do not access:</p>
          <ul>
            <li>Gmail</li>
            <li>Google Drive</li>
            <li>Google Calendar</li>
            <li>Contacts</li>
            <li>Any Google product or data outside the scopes you explicitly grant</li>
          </ul>

          <hr />

          <h2>3. How We Use Google User Data</h2>
          <p>We only use Google user data for the core functionality of HolaRevi. Specifically, we use it to:</p>
          <ul>
            <li>Fetch reviews from your Google Business Profile</li>
            <li>Analyze sentiment and review patterns</li>
            <li>Generate AI-powered reply suggestions</li>
            <li>Publish owner replies (only if auto-posting is enabled)</li>
            <li>Provide analytics in your dashboard</li>
            <li>Support and troubleshoot your account</li>
          </ul>

          <p>We do not:</p>
          <ul>
            <li>Use Google user data for advertising</li>
            <li>Sell or share Google user data</li>
            <li>Use Google user data for unrelated AI training or profiling</li>
          </ul>

          <p>
            Our use of Google user data adheres to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <hr />

          <h2>4. How We Use Other Personal Data</h2>
          <p>We process your non-Google data to:</p>
          <ul>
            <li>Create and manage your HolaRevi account</li>
            <li>Authenticate your login</li>
            <li>Process payments and subscriptions</li>
            <li>Communicate service information, billing updates, and support</li>
            <li>Improve our platform's performance and security</li>
          </ul>
          <p><strong>Legal bases (GDPR):</strong> performance of a contract, legitimate interests, and consent where needed.</p>

          <hr />

          <h2>5. How We Share Data</h2>
          <p>We only share data with service providers who help us operate HolaRevi, including:</p>
          <ul>
            <li>Cloud hosting providers</li>
            <li>AI service providers (for generating reply drafts)</li>
            <li>Payment processors like Stripe</li>
            <li>Email delivery and support tools</li>
            <li>Analytics and error monitoring tools</li>
          </ul>

          <p>All service providers act as data processors, and they may only process data on our behalf under strict confidentiality agreements.</p>

          <p>We never:</p>
          <ul>
            <li>Sell personal data</li>
            <li>Share Google user data for marketing or advertising</li>
            <li>Allow third parties to use your data to train unrelated AI models</li>
          </ul>

          <hr />

          <h2>6. Data Storage & Security</h2>
          <p>We use industry-standard security practices, including:</p>
          <ul>
            <li>Encryption in transit (HTTPS)</li>
            <li>Encrypted storage for sensitive data</li>
            <li>Restricted, role-based access to production systems</li>
            <li>Secure cloud infrastructure</li>
            <li>Monitoring for unauthorized access</li>
          </ul>
          <p>While no method is 100% secure, we take reasonable measures to safeguard your information.</p>

          <hr />

          <h2>7. Data Retention & Deletion</h2>

          <h3>7.1. Retention</h3>
          <p>We retain your data:</p>
          <ul>
            <li>While your HolaRevi account is active</li>
            <li>For a short period after cancellation (typically 30–90 days) for backups and compliance</li>
          </ul>

          <h3>7.2. Deletion</h3>
          <p>You can request data deletion at any time by emailing <a href="mailto:info@holarevi.com">info@holarevi.com</a>.</p>
          <p>Upon deletion request or account closure, we will:</p>
          <ul>
            <li>Revoke Google API tokens</li>
            <li>Remove or anonymize your stored Google review data</li>
            <li>Delete your personal account information (except legally required records such as invoices)</li>
          </ul>

          <hr />

          <h2>8. Your Rights (GDPR)</h2>
          <p>If you are located in the EU/EEA, you may request:</p>
          <ul>
            <li>Access to your data</li>
            <li>Correction of inaccurate data</li>
            <li>Deletion</li>
            <li>Restriction or objection to processing</li>
            <li>Data portability</li>
            <li>Withdrawal of consent</li>
          </ul>
          <p>Send requests to <a href="mailto:info@holarevi.com">info@holarevi.com</a>.</p>
          <p>We may request proof of identity for security reasons.</p>

          <hr />

          <h2>9. International Data Transfers</h2>
          <p>Our service providers may process data outside the EU (e.g., the United States).</p>
          <p>When this happens, we use legal safeguards such as:</p>
          <ul>
            <li>Standard Contractual Clauses (SCCs)</li>
            <li>GDPR-compliant data processing agreements</li>
          </ul>

          <hr />

          <h2>10. Children's Privacy</h2>
          <p>HolaRevi is not intended for children under 16 and does not knowingly collect data from minors.</p>
          <p>If such data is identified, it will be deleted promptly.</p>

          <hr />

          <h2>11. Required Google API Compliance Statement</h2>
          <p>
            Our use of information received from Google APIs will adhere to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p><em>This is required by Google for OAuth verification.</em></p>

          <hr />

          <h2>12. Updates to This Privacy Policy</h2>
          <p>We may modify this Privacy Policy occasionally.</p>
          <p>Significant changes will be communicated through email or in-app notifications.</p>
          <p>
            The most recent version will always be available at:{" "}
            <a href="https://holarevi.com/privacy">https://holarevi.com/privacy</a>
          </p>

          <hr />

          <h2>13. Contact Us</h2>
          <p>If you have questions or privacy-related concerns, contact us:</p>
          <address className="not-italic">
            <strong>HolaRevi</strong><br />
            Carrer de Ramon Llull, 495, 08930 Sant Adrià de Besòs, Barcelona, Spain<br />
            Email: <a href="mailto:info@holarevi.com">info@holarevi.com</a>
          </address>
        </article>

        <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <div className="flex justify-center gap-6">
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/google-permissions" className="hover:underline">Google Permissions</Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} HolaRevi. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
