# Antigravity Rules — SMM Ops Tool

These rules apply to every task in this workspace. Follow them exactly.
When something isn't covered, ask a clarifying question instead of guessing.

## 1. Grounding & Single Sources of Truth
- `PROJECT_PLAN.md` is the source of truth for scope, screens, and features.
- `DATA_MODEL.md` is the source of truth for every Supabase table, field name, data type, and permission logic. Never invent, rename, or guess a field name.
- `DESIGN_SYSTEM.md` is the source of truth for visual styling. Match color tokens, fonts, spacing, hover transitions, and component patterns.

---

## 2. Dynamic Option Lists & Settings
- Dropdown options (`clientStatus`, `shootStatus`, `deliverableTypes`, `expenseCategories`) must be read dynamically from `settings_docs`, never hardcoded in component code.
- Operational Settings (`paymentGraceDays`, `clientReminderTemplate`, `crewScheduleTemplate`) are stored in `settings_docs.key = 'operationalSettings'` and parsed via `parseOperationalSettings()`.
- Company Profile (`businessName`, `businessEmail`, `businessPhone`, `paymentDetails`) is gated to Founder edits (`🔒 Founder Only`).

---

## 3. Database Architecture & Realtime Sync
- Backend data lives in **Supabase PostgreSQL**. Access is authenticated via Supabase Auth and governed by Row Level Security (RLS) policies in `supabase/schema.sql`.
- State synchronization uses `DataContext` backed by Supabase Realtime subscriptions.

---

## 4. Role Permissions & Approval Queue
- **Admin (`admin`)**: Day-to-day data entry (clients, cameramen, shoots, expenses) submits to `change_requests` with `status: pending`. Direct soft-delete, restore, permanent hard-delete, routine payment status toggles (`clientPaid`, `cameramanPaid`), and crew call-sheet check-ins apply immediately.
- **Founder (`founder`)**: Holds exclusive authority to edit `businessProfile`. Reviews and approves/rejects Admin change requests with review notes. Owns high-level cashflow and client profitability rankings.
- **Direct Action Exceptions**: Toggling payment statuses (`clientPaid`, `cameramanPaid`) and logging check-in times (`checkedInAt`) apply immediately without approval.

---

## 5. WhatsApp & Document Generation
- **WhatsApp Call Sheets & Reminders**: Built dynamically using `buildCameramanScheduleWhatsAppUrl()` and `buildClientPaymentReminderWhatsAppUrl()` from `src/utils/whatsapp.ts`.
- **PDF Generation**: Invoices (`INV-YYYYMMDD-XXXX`) and Crew Vouchers (`RCP-YYYYMMDD-XXXX`) are rendered on-demand using `jsPDF` (`src/utils/pdfGenerator.ts`).

---

## 6. Development & Verification
- After UI modifications, run `npx tsc --noEmit` to verify 0 TypeScript compilation errors.
- Ensure all commits are pushed to the main remote branch (`git push origin main`).