# HolaRevi Design Guidelines

## Design Approach

**Selected Approach**: Modern SaaS Application Design  
**Primary References**: Linear (clean productivity), Stripe Dashboard (billing clarity), Notion (information hierarchy)  
**Rationale**: HolaRevi is a business productivity tool requiring efficient information display, clear data hierarchy, and trustworthy billing interfaces.

## Core Design Principles

1. **Clarity Over Decoration**: Information-first design with purposeful UI elements
2. **Efficient Workflows**: Minimal clicks from review discovery to reply posting
3. **Trust & Professionalism**: Clean, reliable interface befitting financial transactions
4. **Responsive Data Density**: Comfortable information display across devices

## Typography

**Font Stack**: 
- Primary: Inter (clean, professional SaaS standard) via Google Fonts
- Monospace: JetBrains Mono for API keys, webhooks, timestamps

**Hierarchy**:
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Secondary Text: text-sm text-gray-600
- Labels: text-xs font-medium uppercase tracking-wide

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4, p-6
- Section gaps: gap-4, gap-6
- Page margins: p-6, p-8
- Card spacing: space-y-4

**Grid Structure**:
- Sidebar navigation: Fixed 16rem width (w-64)
- Main content area: Flexible with max-w-7xl container
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Review list: Single column with full-width cards

## Application Structure

**Navigation**: 
- Left sidebar with logo, restaurant switcher dropdown, main nav items (Dashboard, Reviews, Restaurants, Billing, Settings)
- Top bar with search, notifications bell, user profile dropdown
- Mobile: Collapsible hamburger menu

**Dashboard Layout**:
- Stats row: 4 metric cards (Total Reviews, Pending Replies, Auto-Posted, Response Rate)
- Recent activity feed below stats
- Quick action buttons prominently placed

**Review Management Interface**:
- Filter bar: Tabs for All/Pending/Replied, language filter, date range
- Review cards with: Restaurant badge, review text, star rating, timestamp, generated reply preview, action buttons (Approve & Post / Edit / Dismiss)
- Expanded card view: Full review + editable AI reply textarea + post controls

**Restaurant Management**:
- Card-based layout showing connected locations
- Each card: Restaurant name, address, connection status badge, settings gear icon
- "Connect New Location" prominent CTA button

**Billing Page**:
- Clean two-column plan comparison (€50 Starter / €99 Professional)
- Feature checklist for each plan
- Current subscription status card at top
- Payment method section with card details
- Invoice history table below

## Component Library

**Cards**:
- Elevated style with subtle shadow (shadow-sm hover:shadow-md)
- Rounded corners: rounded-lg
- White background with border: border border-gray-200

**Buttons**:
- Primary: Solid fill, font-medium, px-4 py-2, rounded-md
- Secondary: Border style with transparent background
- Danger: For delete/cancel actions
- Icon buttons: Square with icon only, p-2

**Status Badges**:
- Pill-shaped: rounded-full px-3 py-1 text-xs font-medium
- Active: Green background
- Pending: Yellow/amber background
- Canceled: Red background
- Trial: Blue background

**Forms**:
- Input fields: border rounded-md px-3 py-2 with focus ring
- Labels above inputs: text-sm font-medium mb-2
- Form sections grouped with space-y-4
- Helper text: text-xs text-gray-500 below inputs

**Modals**:
- Centered overlay with backdrop blur
- Max width: max-w-2xl
- Header with title and close button
- Content area with p-6
- Footer with action buttons aligned right

**Tables** (for invoice history):
- Clean borders, striped rows optional
- Header: font-medium background-gray-50
- Hover states on rows
- Responsive: Stack on mobile

**Empty States**:
- Centered icon + heading + description + CTA button
- Use for: No reviews yet, no restaurants connected, no billing history

## Key Screens Detail

**Login/Signup**: 
- Centered card on clean background
- Logo at top
- "Continue with Google" prominent OAuth button
- Simple, trustworthy aesthetic

**Dashboard**:
- Stats grid at top (4 cards)
- Two-column layout below: Recent reviews (left 2/3) + Quick actions sidebar (right 1/3)

**Review Details Modal**:
- Full review display with star rating visualization
- AI-generated reply in editable textarea
- Language detection badge
- Sentiment indicator
- Action buttons: "Post Reply" primary, "Edit" secondary, "Dismiss" text button

**Subscription Checkout**:
- Stripe embedded checkout or redirect
- Return to clean success page with confirmation

## Interactions

**Animations**: Minimal - use only for:
- Loading states: Subtle spinner
- Success confirmations: Quick checkmark fade-in
- Toast notifications: Slide in from top-right
- No scroll animations, no complex transitions

**Loading States**:
- Skeleton screens for review cards loading
- Spinner for button actions (posting replies)
- Progress indicator for OAuth connection

## Accessibility

- All interactive elements keyboard navigable
- Focus rings on all inputs and buttons
- ARIA labels for icon-only buttons
- Proper heading hierarchy throughout
- Form validation with clear error messages
- Color contrast meeting WCAG AA standards

## Images

No hero images needed for this application interface. This is a functional dashboard, not a marketing site. Focus entirely on clean UI components and data display.