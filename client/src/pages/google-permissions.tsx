import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GooglePermissions() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="link-back-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <article className="prose prose-gray dark:prose-invert max-w-none">
          <h1 data-testid="text-page-title">How HolaRevi Uses Your Google Business Profile Data</h1>
          <p className="text-muted-foreground">Last updated: December 2025</p>

          <p>
            HolaRevi connects to your Google Business Profile to help you manage and reply to your reviews quickly and consistently using AI. This page explains what data we access, how we use it, and how you stay in control.
          </p>

          <hr />

          <h2>1. What Permissions We Request</h2>
          <p>When you connect your Google account to HolaRevi, we request specific permissions related to your Google Business Profile.</p>
          <p>We may request permission to:</p>
          <ol>
            <li>
              <strong>View your Google Business Profile information</strong>
              <ul>
                <li>Business name, categories, and public details</li>
                <li>Locations you manage</li>
              </ul>
            </li>
            <li>
              <strong>View your business reviews and existing replies</strong>
              <ul>
                <li>Review text</li>
                <li>Rating</li>
                <li>Date of the review</li>
                <li>Reviewer's display name (as provided by Google)</li>
                <li>Your past owner responses</li>
              </ul>
            </li>
            <li>
              <strong>Create and update replies to reviews on your behalf</strong>
              <ul>
                <li>When you approve a reply inside HolaRevi</li>
                <li>Or when you enable auto-replies (if you choose to do so)</li>
              </ul>
            </li>
          </ol>
          <p><strong>We do not request access to Gmail, Google Drive, Google Calendar, or any other unrelated Google products.</strong></p>

          <hr />

          <h2>2. How We Use Your Google Data</h2>
          <p>HolaRevi uses your Google Business Profile data to:</p>
          <ul>
            <li>Display all your reviews in the HolaRevi dashboard</li>
            <li>Analyze the sentiment and rating of your reviews</li>
            <li>Generate AI-powered reply suggestions in your chosen tone and language</li>
            <li>Post replies to reviews when you approve or when auto-replies are enabled</li>
            <li>Show analytics such as:
              <ul>
                <li>Review volume over time</li>
                <li>Average rating</li>
                <li>Response rate and response time</li>
              </ul>
            </li>
          </ul>
          <p><strong>We only use your Google data to provide the review management features you request. We do not use it for unrelated purposes, and we do not sell your data.</strong></p>

          <hr />

          <h2>3. How We Store and Protect Your Data</h2>
          <p>We may store:</p>
          <ul>
            <li>Your connected locations</li>
            <li>Reviews and replies required to show your history in the dashboard</li>
            <li>Aggregated analytics about reviews and replies</li>
          </ul>
          <p>We protect your data by:</p>
          <ul>
            <li>Using secure, encrypted HTTPS connections</li>
            <li>Limiting access to authorized personnel and systems</li>
            <li>Monitoring access and maintaining logs for security</li>
          </ul>
          <p>We keep your data only for as long as necessary to provide the Service or as required by law. For more detail, see our <Link href="/privacy">Privacy Policy</Link>.</p>

          <hr />

          <h2>4. Sharing of Google Data</h2>
          <p>We may share some data with service providers that help us operate HolaRevi, such as:</p>
          <ul>
            <li>Hosting and database providers</li>
            <li>AI providers for generating reply suggestions</li>
            <li>Payment processors</li>
            <li>Analytics and logging tools</li>
          </ul>
          <p>These providers are only allowed to use the data to provide their services to us and must protect it appropriately. <strong>We do not sell your Google data or share it with advertisers.</strong></p>

          <hr />

          <h2>5. Your Control and How to Disconnect HolaRevi</h2>
          <p><strong>You remain in full control of your Google account and data.</strong></p>
          <p>You can:</p>
          <ul>
            <li>Disconnect HolaRevi from your Google account at any time from your Google Account settings under "Security" → "Third-party access", or</li>
            <li>Contact us at <a href="mailto:info@holarevi.com">info@holarevi.com</a> if you need help disconnecting or deleting stored data</li>
          </ul>
          <p>After you revoke access, HolaRevi will no longer:</p>
          <ul>
            <li>Fetch new reviews</li>
            <li>Post new replies</li>
            <li>Access your Google Business Profile data going forward</li>
          </ul>
          <p>You can also request deletion of your account and associated data from our systems, subject to legal and billing requirements.</p>

          <hr />

          <h2>6. Compliance With Google Policies</h2>
          <p>HolaRevi uses your Google data in line with:</p>
          <ul>
            <li>Google API Services User Data Policy</li>
            <li>Google Business Profile API policies</li>
            <li>Our own <Link href="/privacy">Privacy Policy</Link></li>
          </ul>
          <p>We only request the minimum permissions needed to provide our core features and manage your reviews.</p>

          <hr />

          <h2>7. Contact</h2>
          <p>If you have any questions about how HolaRevi uses your Google data or permissions, please contact us:</p>
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
