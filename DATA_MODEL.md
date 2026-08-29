# SMM Ops Tool — Data Model & Schema Specification

This document defines the single source of truth for the database schema, role permissions, approval queue workflows, and operational settings in the **SMM Ops Tool**.

---

## 1. Role & Access Control Matrix

The platform supports two primary operational roles: `admin` and `founder`.

| Feature / Action | Admin (`admin`) | Founder (`founder`) | Governance Rule |
|---|---|---|---|
| **Data Creation & Edits** | Submits to pending approval queue (`canSubmitForApproval: true`) | Direct write; reviews and approves/rejects Admin requests (`canApprove: true`) | Prevents unreviewed financial or contractual updates |
| **Deletion Operations** | Direct soft-delete, restore, and permanent hard-delete (`canDelete: true`) | Read-only visibility in Recycle Bin (`canDelete: false`) | Admin handles operational housekeeping |
| **Payment Status Toggles** | Direct write (`clientPaid`, `cameramanPaid`) | Direct write | Routine operational updates do not require approval |
| **Crew Call-Sheet Check-Ins** | Direct write (`checkedInAt`) | Direct write | Real-time shoot coordination |
| **Settings: Company & Invoice Profile** | Read-Only (`🔒 Founder Only` badge) | Exclusive edit authority | Legal business name, email, phone, and Bank/UPI details |
| **Settings: Operational Defaults** | Full Edit permissions | Full Edit permissions | Configurable payment grace period and WhatsApp templates |
| **Settings: Dropdown Option Lists** | Full Edit permissions | Full Edit permissions | Operational categories for daily data entry |
| **Settings: My Account** | Self-service password updates | Self-service password updates | Account credential security |

---

## 2. Database Schema Overview (Supabase PostgreSQL)

### 1. Table: `clients`
Primary client account records.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `name` | `TEXT` | Required — Client brand or company name |
| `phone` | `TEXT` | Required — Prefilled into WhatsApp links |
| `email` | `TEXT` | Required — Billing contact email |
| `notes` | `TEXT` | Optional notes |
| `status` | `TEXT` | Value from `settings_docs.key = 'clientStatus'` |
| `contract_link` | `TEXT` | Optional agreement URL |
| `created_at` | `TIMESTAMPTZ` | Timestamp of record creation |
| `deleted_at` | `TIMESTAMPTZ` | Soft-delete timestamp (`NULL` = active) |
| `deleted_by` | `UUID` | ID of Admin who soft-deleted record |

---

### 2. Table: `cameramen`
Freelance videographers and crew members.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `name` | `TEXT` | Required — Full name |
| `phone` | `TEXT` | Required — Phone number for WhatsApp call-sheets |
| `email` | `TEXT` | Optional contact email |
| `rate` | `NUMERIC` | Default day rate (in ₹), editable per shoot |
| `notes` | `TEXT` | Optional notes |
| `contract_link` | `TEXT` | Optional agreement URL |
| `unavailability` | `JSONB` | Array of blackout dates: `[{ date: "YYYY-MM-DD", reason: "" }]` |
| `created_at` | `TIMESTAMPTZ` | Record creation timestamp |
| `deleted_at` | `TIMESTAMPTZ` | Soft-delete timestamp (`NULL` = active) |
| `deleted_by` | `UUID` | ID of Admin who soft-deleted record |

---

### 3. Table: `shoots`
Shoot jobs, client billings, and crew assignments.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `client_id` | `UUID` | Foreign Key → `clients.id` |
| `date` | `DATE` | Shoot date (`YYYY-MM-DD`) |
| `call_time` | `TEXT` | General shoot start time (e.g. `"09:00 AM"`) |
| `location` | `TEXT` | Shoot venue or address |
| `status` | `TEXT` | Value from `settings_docs.key = 'shootStatus'` |
| `client_amount` | `NUMERIC` | Billed amount to client (in ₹) |
| `client_paid` | `BOOLEAN` | Payment settlement status |
| `client_paid_at` | `TIMESTAMPTZ` | Timestamp when marked paid |
| `client_invoice_number` | `TEXT` | Stable invoice identifier (`INV-YYYYMMDD-XXXX`) |
| `assignments` | `JSONB` | Array of assigned cameramen: `[{ cameramanId, amount, paid, paidAt, callTime, checkedInAt }]` |
| `assigned_cameraman_ids` | `UUID[]` | Array of cameraman IDs for query indexing |
| `deliverables` | `JSONB` | Array of video/photo assets: `[{ type, count, fileLink }]` |
| `created_at` | `TIMESTAMPTZ` | Record creation timestamp |
| `deleted_at` | `TIMESTAMPTZ` | Soft-delete timestamp |
| `deleted_by` | `UUID` | Admin who soft-deleted |

---

### 4. Table: `expenses`
Operating expenses and receipts.

| Column | Type | Constraints / Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `description` | `TEXT` | Required — Description of expense |
| `amount` | `NUMERIC` | Required — Cost in ₹ |
| `date` | `DATE` | Expense date (`YYYY-MM-DD`) |
| `shoot_id` | `UUID` | Optional Foreign Key → `shoots.id` |
| `category` | `TEXT` | Value from `settings_docs.key = 'expenseCategories'` |
| `created_at` | `TIMESTAMPTZ` | Record creation timestamp |
| `deleted_at` | `TIMESTAMPTZ` | Soft-delete timestamp |
| `deleted_by` | `UUID` | Admin who soft-deleted |

---

### 5. Table: `settings_docs`
Configurable operational settings and dropdown option lists.

| Column | Type | Description |
|---|---|---|
| `id` | `TEXT` | Primary Key (matches `key`) |
| `key` | `TEXT` | Unique key (`businessProfile`, `operationalSettings`, `clientStatus`, `shootStatus`, `deliverableTypes`, `expenseCategories`) |
| `label` | `TEXT` | Display label in Settings UI |
| `options` | `JSONB` | Array of options: `[{ value, order, archived }]` |

#### Special Settings Docs Payload Structures:

1. **`businessProfile`** (Founder Only Edit):
   ```json
   {
     "businessName": "SMM Ops Media",
     "businessEmail": "operations@smmops.com",
     "businessPhone": "+91 98765 43210",
     "paymentDetails": "UPI ID: smmops@hdfcbank | Bank: HDFC | A/C: 50200012345678 | IFSC: HDFC0001234"
   }
   ```

2. **`operationalSettings`** (Admin & Founder Edit):
   ```json
   {
     "paymentGraceDays": 7,
     "clientReminderTemplate": "Hi {clientName}, hope you are doing great! Friendly reminder regarding pending invoice of {amount} for shoot on {date} at {location}. Thank you!",
     "crewScheduleTemplate": "Hi {cameramanName}, schedule for shoot with {clientName} on {date}. Call time: {callTime}. Location: {location}. Please confirm!"
   }
   ```

---

### 6. Table: `change_requests`
Governance approval queue for Admin submissions.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `target_collection` | `TEXT` | Target table (`clients`, `shoots`, `cameramen`, `expenses`) |
| `target_doc_id` | `TEXT` | Target record ID (`NULL` if create new) |
| `action` | `TEXT` | `create` or `edit` |
| `proposed_data` | `JSONB` | JSON object containing proposed fields |
| `requested_by` | `UUID` | User ID of submitting Admin |
| `requested_at` | `TIMESTAMPTZ` | Submission timestamp |
| `status` | `TEXT` | `pending`, `approved`, `rejected` |
| `reviewed_by` | `UUID` | User ID of Founder who reviewed |
| `reviewed_at` | `TIMESTAMPTZ` | Review timestamp |
| `review_note` | `TEXT` | Founder review notes / rejection reason |
| `revision_count` | `INT` | Number of resubmission revisions |

---

### 7. Table: `app_notifications`
Notifications triggering bell icon alerts for approval workflow events.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `recipient_id` | `UUID` | Target user ID |
| `type` | `TEXT` | `pending_approval`, `approved`, `rejected`, `resubmitted` |
| `related_change_request_id` | `UUID` | Foreign Key → `change_requests.id` |
| `message` | `TEXT` | Notification text |
| `read` | `BOOLEAN` | Unread status boolean |
| `created_at` | `TIMESTAMPTZ` | Timestamp |

---

### 8. Table: `deleted_records`
Audited log of soft-deleted items visible in the Recycle Bin.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary Key |
| `collection_name` | `TEXT` | Origin table name |
| `record_id` | `UUID` | ID of soft-deleted record |
| `record_data` | `JSONB` | Snapshot of record content at soft-deletion time |
| `deleted_by` | `UUID` | User ID of deleting Admin |
| `deleted_at` | `TIMESTAMPTZ` | Timestamp |