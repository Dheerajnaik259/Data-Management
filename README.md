# SMM Ops Tool

A production-grade, role-gated operational platform built for Social Media Management (SMM) agencies and video production teams. It centralizes client accounts, freelance cameramen, shoot scheduling, operating expenses, financial disbursements, dynamic WhatsApp communication, and governance approvals in a unified dashboard.

---

## Key Features

### 1. Role-Based Access Control (RBAC)
- **Admin Role (Operator)**: Enters day-to-day operational data (clients, cameramen, shoots, expenses), which are submitted to the Founder approval queue. Holds direct authority over soft-deletions, restores, permanent hard-deletions, routine payment status toggles, and daily crew dispatches.
- **Founder Role (Business Owner)**: Final authority on financial identity and legal business profiles. Reviews and approves/rejects submitted change requests with review notes. Owns high-level cashflow oversight and client profitability intelligence.

---

### 2. Dual-Role Dashboard Architecture

#### Admin Operations Dashboard (`/`)
- **Daily Crew Dispatch Console**: Isolates shoots scheduled for *Today* and *Tomorrow*, displaying assigned videographers with **1-click WhatsApp Call Sheets** prefilled with shoot details and call times.
- **My Submissions Queue Widget**: Displays live status of submitted change requests (*Pending*, *Approved*, *Rejected*), complete with Founder review notes and 1-click resubmit links.
- **Receivables & Payout Action Desks**: Highlights overdue client invoices and pending crew disbursements for immediate resolution.

#### Founder Executive Dashboard (`/`)
- **Governance Action Callout**: Top-priority banner alerting the Founder to pending change requests awaiting approval.
- **Client Profitability & Margin Ranking Table**: Ranks client accounts by *Invoiced Revenue*, *Total Production Cost* (Crew Payouts + Direct Expenses), *Net Margin (₹)*, and *Margin %* badges.
- **Net Operating Cashflow**: Real-time summary of receivables minus payouts and operating overhead.

---

### 3. Operational Settings & Security
- **My Account & Security**: Allows users to manage credentials and update their login password directly from the UI.
- **Configurable Payment Grace Period**: Customize the payment grace period (default: 7 days) before unpaid client invoices are automatically flagged as overdue across the system.
- **Dynamic WhatsApp Message Templates**: Editable templates for client payment reminders and crew schedule dispatch notifications with placeholder injection (`{clientName}`, `{amount}`, `{date}`, `{location}`, `{cameramanName}`, `{callTime}`).
- **Founder-Only Legal Profile**: Gated inputs (`🔒 Founder Only`) protecting business name, legal email, phone, and Bank/UPI payment details.
- **Customizable Option Lists**: Editable categories for client status, shoot status, deliverable types, and expense categories.

---

### 4. Financial & Administrative Desks
- **Payments Desk (`/payments`)**: Tracks incoming client receivables and outgoing crew payouts, featuring overdue calculations and 1-click WhatsApp reminders.
- **Invoices & Vouchers (`/invoices`)**: On-demand generation and preview of branded PDF client invoices (`INV-YYYYMMDD-XXXX`) and cameraman payout vouchers (`RCP-YYYYMMDD-XXXX`) via `jsPDF`.
- **Operating Expenses (`/expenses`)**: Tracks non-crew operating costs (travel, gear rental, studio bookings, software) categorized and linked to specific shoots or general overhead.
- **Recycle Bin (`/trash`)**: Admin-only soft-delete recovery desk supporting soft-delete, restore, and permanent purge.

---

## Tech Stack

- **Frontend Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Vanilla CSS Design System (`index.css`)
- **Backend & Database**: Supabase (PostgreSQL, Realtime Subscriptions, Row Level Security, Auth)
- **Document Generation**: jsPDF & jsPDF-AutoTable
- **Icons**: Lucide React

---

## Getting Started

### Prerequisites
- Node.js 20 or later
- npm (or bun / yarn)
- A Supabase Project

### Installation & Local Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Dheerajnaik259/Data-Management.git
   cd Data-Management
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

4. **Initialize Supabase Schema**
   Apply the Database SQL schema located in `supabase/schema.sql` via your Supabase SQL Editor. This sets up tables (`clients`, `cameramen`, `shoots`, `expenses`, `settings_docs`, `change_requests`, `app_notifications`, `deleted_records`), RLS policies, and seed data.

5. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Project Documentation

- [Project Plan](PROJECT_PLAN.md) — Feature roadmap and implementation milestones.
- [Data Model](DATA_MODEL.md) — Complete database schema, relationships, and role permission rules.
- [Design System](DESIGN_SYSTEM.md) — Visual styling, color tokens, typography, and component specs.
- [Future Scope](FUTURE_SCOPE.md) — Architecture matrix and roadmap for future expansions.

---

## License

Private and proprietary software. Intended exclusively for internal agency operations.
