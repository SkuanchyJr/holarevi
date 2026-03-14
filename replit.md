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

PostgreSQL, managed via Neon serverless, is the primary database, accessed using Drizzle ORM. The schema includes tables for `users` (with Stripe integration), `restaurants` (Google integration, reply settings), `reviews` (metadata, AI replies), `sessions`, `team_members`, and `tone_presets`. Plan limits are enforced through this data, including subscription status, reply usage, and feature access.

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

## External Dependencies

-   **OpenAI API**: For AI-powered review reply generation (GPT-5 model).
-   **Stripe**: For subscription billing, payment processing, and webhook handling.
-   **Google My Business API**: For fetching Google reviews and posting replies.
-   **EmbedSocial Partner API**: Alternative integration for Google Reviews data, supporting OAuth and specific endpoints for locations, reviews, stats, and reply posting, used if `PARTNER_API_KEY` is configured.
-   **Replit Auth**: For user authentication (OpenID Connect).
-   **Neon (PostgreSQL)**: Serverless PostgreSQL database hosting.
-   **Replit Database**: Key-value store for contact form submissions.
-   **Replit**: Primary deployment platform.