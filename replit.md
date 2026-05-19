# HolaRevi - AI-Powered Google Review Management

## Overview

HolaRevi is a SaaS application designed for Barcelona restaurants to automatically manage and respond to Google reviews. The platform uses AI to generate contextually appropriate, multilingual responses (Spanish, Catalan, English), helping restaurant owners save time and maintain customer engagement. Its core value proposition is automated AI-powered review responses with customizable tone settings and a subscription-based pricing model.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React and TypeScript, using Wouter for routing, TanStack Query for state management, and Shadcn UI for components. Styling is handled with Tailwind CSS, and forms use React Hook Form with Zod validation. The design system follows Shadcn's "New York" style with a custom color palette, Inter font, and responsive spacing, supporting dark mode.

### Backend

The backend uses Express.js with Node.js and TypeScript (ESM modules). API endpoints are RESTful, organized by resource. Authentication is session-based via Replit Auth (OpenID Connect) with Passport.js, storing sessions in PostgreSQL. Security relies on HTTP-only, secure cookies with a 7-day TTL. Plan limits are enforced server-side, covering location creation, monthly reply usage, team members, and tone presets, with corresponding feature-gated frontend pages.

### Data Storage

PostgreSQL (Replit Helium) is the primary database, accessed using Drizzle ORM. Data was migrated from the previous Neon database. The schema includes 19 tables: `users`, `restaurants`, `reviews`, `sessions`, `team_members`, `tone_presets`, `app_config`, `page_views`, `affiliates`, `affiliate_leads`, `affiliate_sales`, `promo_codes`, `review_summaries`, `blogs`, `review_qrs`, `review_qr_events`, `restaurant_access`, `alerts`, and `weekly_email_logs`. Plan limits are enforced through this data, including subscription status, reply usage, and feature access.

### UI/UX Decisions

- **Component Library**: Shadcn UI for accessible, customizable components.
- **Design System**: "New York" style variant, custom CSS variables for theming, Inter font family, Tailwind CSS for responsive spacing, and class-based dark mode.
- **Admin Interfaces**: Dedicated login, contacts management, prelaunch mode toggling, and an extensive analytics dashboard covering traffic, billing, locations, and usage.

### Key Features

- **AI Review Generation**: Uses OpenAI's GPT-5 for multilingual, tone-aware responses and sentiment analysis.
- **Subscription Management**: Integrated with Stripe for a 4-tier pricing model, 7-day free trial for Local plan (€49/month) with anti-abuse measures, yearly discounts, and add-ons. Trial users can cancel immediately during trial with no charge. Webhooks handle trial→active transitions on first successful payment.
- **Google My Business Integration**: Fetches reviews and posts replies, supporting auto-post and manual approval modes.
- **Team Management**: Allows inviting and managing team members with roles.
- **Custom Tone Presets**: Users can define custom AI response tones with custom instructions. Restaurants can select a tone preset, and the custom instructions are injected into AI prompts with high priority, allowing for personalized responses (e.g., "Always mention to follow us on Instagram").
- **Review Summary Dashboard**: AI-powered analysis page that highlights key themes, sentiment trends, and actionable recommendations from recent reviews. Analyzes up to 50 reviews using OpenAI to provide executive summaries, trend detection (improving/declining/consistent aspects), and theme extraction.
- **Prelaunch Mode**: Allows blocking public access to the application, displaying a "launching soon" page while permitting admin access.
- **Contact Form**: Public form for inquiries, storing submissions in Replit Database and accessible via an authenticated admin panel.
- **Affiliate System**: Separate authentication and database for tracking affiliate partners, leads, and sales, with an API for managing leads and sales.

### Security

- **Helmet**: HTTP security headers (X-Frame-Options, CSP, etc.) via Express middleware. CSP disabled in dev, enabled in production with allowances for Stripe JS and Google Fonts.
- **Rate limiting**: 5 login attempts per minute on `/api/auth/login`.
- **Password hashing**: bcrypt with salt factor 10.
- **Session security**: HTTP-only, secure cookies with SameSite: lax.

### SEO

- Dynamic `sitemap.xml` at `/sitemap.xml` with all public pages (es/en) and blog posts.
- `robots.txt` at `/robots.txt` blocking admin/affiliate/API paths.
- React Helmet for per-page meta tags, Open Graph, and JSON-LD structured data.

### Email (Weekly Analytics)

- SMTP via Gmail (info@holarevi.com) using Nodemailer.
- Weekly cron job every Friday at 9:00 AM Europe/Madrid timezone.
- AI-generated personalized email content via OpenAI, with fallback templates.
- Admin trigger endpoint: `POST /admin/trigger-weekly-emails` (requires `x-admin-key` header).

## External Dependencies

-   **OpenAI API**: For AI-powered review reply generation (GPT-4o model).
-   **Stripe**: For subscription billing, payment processing, and webhook handling.
-   **Google My Business API**: For fetching Google reviews and posting replies.
-   **EmbedSocial Partner API**: Alternative integration for Google Reviews data, used if `PARTNER_API_KEY` is configured.
-   **Replit Auth**: For user authentication (OpenID Connect).
-   **Replit Helium (PostgreSQL)**: Primary database (migrated from Neon).
-   **Replit Database**: Key-value store for contact form submissions.
-   **Replit**: Primary deployment platform.