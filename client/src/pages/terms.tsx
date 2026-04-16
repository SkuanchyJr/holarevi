import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

export default function TermsOfService() {
  const { t, language } = useLanguage();
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

          <p>
            Welcome to HolaRevi. These Terms of Service ("Terms") govern your use of our website, dashboard, and services (collectively, the "Service"). By accessing or using HolaRevi, you agree to be bound by these Terms.
          </p>
          <p>If you do not agree to these Terms, please do not use the Service.</p>

          <hr />

          <h2>1. Who We Are</h2>
          <p>
            HolaRevi is a software-as-a-service (SaaS) platform that helps businesses manage and reply to their Google Reviews using AI-generated suggestions.
          </p>

          <hr />

          <h2>2. Eligibility</h2>
          <p>To use HolaRevi, you must:</p>
          <ul>
            <li>Be at least 18 years old (or the age of majority in your jurisdiction)</li>
            <li>Have the authority to act on behalf of the business you connect</li>
            <li>Agree to these Terms and our Privacy Policy</li>
          </ul>

          <hr />

          <h2>3. Description of the Service</h2>
          <p>Through HolaRevi, you can:</p>
          <ul>
            <li>Connect one or more Google Business Profiles you manage</li>
            <li>View your Google Reviews inside the HolaRevi dashboard</li>
            <li>Generate AI-powered reply suggestions in multiple tones and languages</li>
            <li>Post replies manually, or enable auto-posting of replies (if you choose)</li>
            <li>View analytics related to your reviews, replies, and ratings</li>
          </ul>
          <p>We may add, modify, or remove features from time to time.</p>

          <hr />

          <h2>4. Your Account</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your login credentials</li>
            <li>All activity that occurs under your account</li>
            <li>Ensuring that your account information is accurate and up to date</li>
          </ul>
          <p>If you suspect unauthorized access to your account, you must notify us as soon as possible.</p>

          <hr />

          <h2>5. Your Responsibilities</h2>
          <p>When using HolaRevi, you agree to:</p>
          <ul>
            <li>Only connect Google Business Profiles you are authorized to manage</li>
            <li>Use the Service in compliance with applicable laws and Google policies</li>
            <li>Not use HolaRevi to post content that is illegal, abusive, hateful, misleading, or discriminatory</li>
            <li>Not attempt to reverse engineer, hack, or interfere with the Service</li>
            <li>Review replies (especially for sensitive or negative reviews), as you are ultimately responsible for what is posted under your business name</li>
          </ul>
          <p>
            <strong>You remain fully responsible for the content and legal compliance of any replies posted through your account, whether written by you or suggested by AI.</strong>
          </p>

          <hr />

          <h2>6. Subscription, Billing, and Payment</h2>
          <p>HolaRevi is offered as a paid subscription service.</p>
          <ul>
            <li>Standard plan: e.g. €49/month per location (or as listed on our pricing page)</li>
            <li>Payments are processed securely by our payment provider (such as Stripe)</li>
            <li>By subscribing, you authorize HolaRevi and our payment provider to charge your chosen payment method on a recurring basis until you cancel</li>
          </ul>
          <p>Unless otherwise stated, subscription fees are non-refundable.</p>
          <p>You can cancel your subscription at any time via the billing portal or by contacting us. Your access will continue until the end of the current billing period.</p>

          <hr />

          <h2>7. Trials and Promotions</h2>
          <p>We may offer free trials or promotional offers. We reserve the right to:</p>
          <ul>
            <li>Modify or terminate trial offers</li>
            <li>Determine eligibility for trials or promotions</li>
          </ul>
          <p>If you do not cancel before the end of a trial, your trial may convert into a paid subscription as described on the pricing page.</p>

          <hr />

          <h2>8. Intellectual Property</h2>
          <p>
            HolaRevi, including all software, code, designs, logos, trademarks, and content (excluding your own content and the content fetched from Google), is owned by HolaRevi or its licensors.
          </p>
          <p>We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for your internal business purposes and in accordance with these Terms.</p>
          <p>You may not:</p>
          <ul>
            <li>Copy, modify, or create derivative works based on HolaRevi</li>
            <li>Distribute, sell, or resell any part of the Service</li>
            <li>Remove or alter any copyright, trademark, or other proprietary notices</li>
          </ul>

          <hr />

          <h2>9. Third-Party Services and Integrations</h2>
          <p>HolaRevi relies on and integrates with third-party services, including:</p>
          <ul>
            <li>Google (Google Business Profile API)</li>
            <li>AI providers (for generating reply suggestions)</li>
            <li>Payment processors (e.g. Stripe)</li>
            <li>Hosting, analytics, and logging services</li>
          </ul>
          <p>Your use of Google and other third-party services is subject to their own terms and privacy policies, which you are responsible for reviewing and complying with.</p>

          <hr />

          <h2>10. No Guarantee of Results</h2>
          <p>We aim to keep HolaRevi useful, reliable, and available, but we do not guarantee:</p>
          <ul>
            <li>That the Service will be uninterrupted, error-free, or secure at all times</li>
            <li>That every AI-generated reply will be accurate, appropriate, or free from mistakes</li>
            <li>Any specific improvement in your ratings, reviews, or revenue</li>
          </ul>
          <p>The Service is provided on an "as is" and "as available" basis.</p>

          <hr />

          <h2>11. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law:</p>
          <ul>
            <li>HolaRevi shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenue arising from your use of the Service.</li>
            <li>Our total liability for any claim relating to the Service is limited to the amount you paid us in the three (3) months immediately preceding the event giving rise to the claim.</li>
          </ul>
          <p>Some jurisdictions do not allow certain limitations of liability, so some of the above limitations may not apply to you.</p>

          <hr />

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless HolaRevi, its affiliates, and their respective directors, officers, employees, and agents from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising out of or related to:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Any content or replies posted through your account</li>
          </ul>

          <hr />

          <h2>13. Termination</h2>
          <p>You may stop using HolaRevi at any time.</p>
          <p>We may suspend or terminate your access to the Service if:</p>
          <ul>
            <li>You materially breach these Terms</li>
            <li>You fail to pay subscription fees</li>
            <li>We are required to do so by law or by a third-party service provider</li>
            <li>We discontinue or materially modify the Service</li>
          </ul>
          <p>Upon termination, your access to your account and data within the Service may be disabled, subject to our data retention obligations and policies.</p>

          <hr />

          <h2>14. Changes to the Service or These Terms</h2>
          <p>We may update or change the Service and these Terms from time to time. When we make material changes to the Terms, we will notify you by email and/or via the Service.</p>
          <p>By continuing to use HolaRevi after changes become effective, you agree to be bound by the updated Terms.</p>

          <hr />

          <h2>15. Governing Law and Jurisdiction</h2>
          <p>These Terms are governed by the laws of Spain, without regard to its conflict of laws principles.</p>
          <p>Any disputes arising out of or relating to these Terms or the Service will be subject to the exclusive jurisdiction of the courts located in Barcelona, Spain, unless otherwise required by law.</p>

          <hr />

          <h2>16. Contact</h2>
          <p>If you have any questions about these Terms, please contact us at:</p>
          <p><strong>Email:</strong> <a href="mailto:info@holarevi.com">info@holarevi.com</a></p>
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
