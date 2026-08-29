# SMM Ops Tool — Project Plan & Architecture Roadmap

Internal role-gated operational platform for managing social media management (SMM) clients, freelance camera crews, shoots, expenses, financial ledgers, and governance approvals.

---

## 1. Executive Summary & Goals

The tool replaces manual spreadsheet tracking with a live, role-gated Web Application. It enforces strict separation between:
1. **Daily Operational Execution (Admin Role)**: Scheduling shoots, dispatching cameramen via WhatsApp call-sheets, logging expenses, toggling routine payment statuses, and soft-deleting/restoring records.
2. **Business Governance & Financial Health (Founder Role)**: Managing company/bank profile details, reviewing and approving/rejecting Admin data submissions, monitoring executive cashflow, and tracking client profitability margins.

---

## 2. Implementation Milestones & Status

| Phase / Feature | Description | Status |
|---|---|---|
| **Phase 1: Core Web App** | Client management, cameraman availability tracking, shoot scheduling, deliverables, payments, and expenses ledgers | ✅ Completed |
| **Phase 2: Database Migration** | Migrated backend to Supabase (PostgreSQL, Realtime Subscriptions, Row Level Security) | ✅ Completed |
| **Phase 3: Change Approvals** | Governance approval queue for Admin adds/edits with Founder review notes and resubmission flows | ✅ Completed |
| **Phase 4: Invoices & PDF Engine** | `jsPDF` integration for client invoices (`INV-YYYYMMDD-XXXX`) and crew payout vouchers (`RCP-YYYYMMDD-XXXX`) | ✅ Completed |
| **Phase 5: Operational Hardening** | Role-Gated Settings (Founder-only Business Profile, Admin Operational Defaults for Payment Grace Days and dynamic WhatsApp templates), My Account password security | ✅ Completed |
| **Phase 6: Dual-Role Dashboard** | Admin Daily Dispatch Console with WhatsApp call-sheets + Founder Executive Cashflow & Client Profitability Ranking | ✅ Completed |
| **Phase 7: Production Rollout** | Continuous integration and deployment on GitHub (`origin/main`) | ✅ Completed / Live |

---

## 3. Key Operational Workflows

### A. Dual-Role Dashboard Architecture
- **Admin Dashboard**:
  - **Daily Crew Dispatch Desk**: Focuses on shoots for *Today* and *Tomorrow*, offering **1-click WhatsApp Call Sheet** buttons prefilled with call times and locations.
  - **My Submissions Queue**: Real-time status cards showing submitted change requests (*Pending*, *Approved*, *Rejected* with review notes).
  - **Receivables & Payout Action Desks**: Flags overdue client invoices and pending crew disbursements.
- **Founder Dashboard**:
  - **Governance Action Callout**: Direct banner alerting Founder to pending submissions requiring approval.
  - **Client Profitability & Margin Ranking**: Ranks clients by Revenue, Production Cost, Net Margin (₹), and Margin % badges.
  - **Net Operating Cashflow**: Real-time business financial health metric.

---

### B. Change Approval Governance Workflow
1. When an **Admin** creates or edits a record (client, cameraman, shoot, or expense), a `change_requests` record is submitted instead of writing directly to the live table.
2. The record enters a `pending` state and triggers an `app_notifications` alert for the **Founder**.
3. The **Founder** reviews the request on `/approvals`:
   - **Approve**: Applies `proposed_data` to the live table, updating `status: approved`.
   - **Reject**: Leaves live data untouched, sets `status: rejected`, and records a `review_note`.
4. **Admin** receives a notification and can edit the rejected request and click **Resubmit**, resetting the status back to `pending`.

---

### C. Direct Action Exceptions (Routine Operations)
To eliminate friction in daily operations, the following actions bypass the approval queue and apply immediately for both Admin and Founder:
- **Payment Status Toggles**: Marking client invoices or cameraman payouts as paid (`clientPaid`, `cameramanPaid`).
- **Crew Check-Ins**: Recording videographer arrival time on set (`checkedInAt`).
- **Deletions**: Moving records to the Recycle Bin (`softDelete`) or purging them (Admin only).

---

## 4. Technology Stack & Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Database & Auth**: Supabase (PostgreSQL, Realtime Subscriptions, RLS Policies, Auth)
- **PDF & Exports**: `jsPDF` with `jsPDF-AutoTable`, Client-side CSV Exporter
- **Icons & UI**: Lucide React, Custom Dark/Light Glassmorphism Theme

---

## 5. Security & Deployment

- **Environment Variables**: `.env.local` configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Database Rules**: Row Level Security (RLS) configured in `supabase/schema.sql`.
- **Repository**: Hosted on GitHub (`Dheerajnaik259/Data-Management`).