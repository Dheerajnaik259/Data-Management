# SMM Ops Tool - Future Feature Roadmap & Role Architecture

This document outlines high-value operational enhancements and the role-permission architecture for scaling Social Media Management (SMM) agencies and video production teams.

---

## 1. Role & Access Matrix (Admin vs. Founder)

| Module / Action | Admin (Operational Lead) | Founder (Business Owner) | Rationale |
|---|---|---|---|
| **Clients / Cameramen / Shoots / Expenses (Create & Edit)** | Submits changes to queue (`canSubmitForApproval: true`) | Reviews & Approves/Rejects (`canApprove: true`); own edits write directly | Founder maintains financial authority over core entity definitions |
| **Deletion & Trash Operations** | Full control — Soft-delete, Restore, Hard-delete | Read-only visibility into Recycle Bin | Admin handles daily cleanup and record housekeeping |
| **Payment Toggles & Crew Check-ins** | Direct write — routine operational action | Direct write (founder bypasses queue everywhere) | Fast-paced daily execution must not be bottlenecked |
| **Invoices & Payout Vouchers** | Full access to view and generate PDFs | Full access to view and generate PDFs | Both roles need immediate access to financial documents |
| **Settings: Dropdown Options** | Full edit permissions | Full edit permissions | Operational option lists used during daily data entry |
| **Settings: Company & Invoice Profile** | Read-Only (`🔒 Founder Only` badge) | Exclusive edit authority | Legal business identity & bank/UPI details belong to founder |
| **Settings: Grace Period & WhatsApp Templates** | Full edit permissions | Full edit permissions | Operational tooling used directly by admin |
| **Settings: My Account** | Self-service password updates | Self-service password updates | Individual credential security |
| **Pending Approvals Desk** | Views own submissions & resubmits rejected requests | Reviews queue, approves/rejects with review notes | Clear governance loop |

---

## 2. High-Impact Operational Features & Role Ownership

### 1. Monthly Retainer & Content Quota Tracker
- **Owner**: Admin (Operational tracking), Founder (Quota approval)
- **Overview**: Track monthly deliverable quotas per client retainer contract (e.g. *12 Reels + 4 Stories per month*).
- **Workflow**:
  - Setting a client's monthly quota requires Founder approval (as it represents contract terms).
  - Admin views and updates deliverable progress daily (`Client X: 8 / 12 Reels Completed`).

---

### 2. Deliverable Production Pipeline (Raw → Edit → Published)
- **Owner**: Admin (Direct-write, routine execution)
- **Overview**: Track the post-production stage of every video/photo asset.
- **Pipeline Stages**:
  - `Raw Footage Uploaded` → `In Post-Production / Editing` → `Client Review` → `Approved & Published`
- **Workflow**:
  - Admin updates deliverable status pills directly without queue approval.
  - Eliminates client WhatsApp pings asking *"Where is the video edit?"*.

---

### 3. Daily Crew Dispatch Desk (1-Click Call Sheets)
- **Owner**: Admin
- **Overview**: A morning dispatch console showing all cameramen scheduled for *Today* or *Tomorrow*.
- **Workflow**:
  - 1-click WhatsApp schedule notifications with prefilled call times and shoot locations.
  - Saves 15–20 minutes every morning during busy production weeks.

---

### 4. Client Profitability & Margin Ranking
- **Owner**: Founder (Primary lens), Admin (Visible)
- **Overview**: Financial intelligence ranking clients by Net Margin % (Revenue minus crew payouts & direct expenses).
- **Workflow**:
  - Displayed prominently on the Founder's Dashboard to highlight high-margin accounts vs low-margin accounts.

---

### 5. Contract Expiry & Retainer Renewal Reminders
- **Owner**: Admin (Date entry), Founder (Renewal action)
- **Overview**: Track retainer contract expiration dates (3, 6, 12 months).
- **Workflow**:
  - Admin inputs agreed contract end-dates.
  - Founder receives banner alerts 14 days before contract expiration to initiate renewal negotiations.

---

## 3. Structural Suggestion: Dual-Role Dashboard Architecture

### Admin Dashboard ("What do I need to do today?")
- **Focus**: Actionable daily operations and execution.
- **Components**:
  - Today's & Tomorrow's scheduled shoots + crew dispatch call-sheets.
  - Pending client payment reminders to chase.
  - Deliverables currently mid-pipeline (`In Editing` / `Client Review`).
  - Status of Admin's pending change requests (Approved / Pending / Rejected).

### Founder Dashboard ("How is the business doing?")
- **Focus**: High-level financial health and governance oversight.
- **Components**:
  - Overall Receivables vs Disbursements Net Cashflow.
  - Client Profitability & Margin Ranking.
  - Pending Approvals Queue badge count requiring review.
  - Upcoming retainer contract renewals (14-day window).
