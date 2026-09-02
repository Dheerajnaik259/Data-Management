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

### 6. ⭐ AI Operational Assistant (Natural Language Chatbot & Scheduling Agent) [IMPORTANT]
- **Priority**: ⭐ **High (Core Productivity Driver)**
- **Owner**: Admin (Quick data entry & queries), Founder (Direct execution & query lens)
- **Overview**: An AI-powered operational chatbot assistant accessible via a liquid glass floating drawer. It enables natural language commands for scheduling shoots, creating/editing clients, assigning crew, and querying business metrics without manual form filling.
- **Key Capabilities**:
  - **Natural Language Command Processing**: Parses conversational instructions such as:
    > *"Schedule a shoot for Client RedBull on 5th Sept at 10:00 AM, assign Cameraman Rahul (₹3,000), and add 2 Reels."*
  - **Automatic Role-Gated Approvals Integration**:
    - When operated by an **Admin**, parsed schedule/edit actions automatically construct and submit a **Pending Change Request** for Founder approval.
    - When operated by a **Founder**, actions execute directly.
  - **Smart Operational Queries**:
    > *"Who is assigned to Shoot #104?"*
    > *"What is our total unpaid client balance for this month?"*
    > *"List all cameramen available on Thursday afternoon."*
- **Safeguards & UX Design**:
  - **Confirmation Card Step**: Before executing any data mutation, the assistant presents a structured preview card with parsed fields and explicit `[Confirm Action]` / `[Cancel]` controls.
  - **Strict Action Scope**: Permanently restricted to Clients, Cameramen, Shoots, and Expenses. System configuration, settings, and auth credentials remain strictly out of scope.

---

### 7. ⭐ Agency Packages & Client Testimonials Showcase (Founder Pitch Mode)
- **Priority**: ⭐ **High (Sales & Growth Driver)**
- **Owner**: Founder (Exclusive edit & pitch lens), Admin (Read-only reference)
- **Overview**: A dedicated showcase module on the Founder page displaying the agency's service packages (monthly retainer tiers) and client testimonials/social proof. Features a 1-click "Client Pitch Mode" toggle for sales meetings.
- **Key Components**:
  - **Agency Service Packages**:
    - Retainer Tiers (e.g., *Starter Socials, Growth Retainer, Enterprise Video Production*).
    - Included Deliverables (*Reels, Stories, Shoot Days, Editing turnaround*).
    - Monthly Pricing & Package Specs.
  - **Client Testimonials & Social Proof Grid**:
    - Client Brand Logo, Name, & Industry.
    - Client Quote / Review & Star Rating.
    - Impact Metrics (e.g., *"1.2M Views in 30 Days"*, *"3x Lead Growth"*).
  - **Founder "Client Pitch Mode"**:
    - A 1-click toggle on the Founder Dashboard that transforms the interface into a sleek, presentation-ready dark liquid glass deck for sales and discovery calls.

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
  - Agency Packages & Client Testimonials Showcase (1-Click Pitch Mode).
