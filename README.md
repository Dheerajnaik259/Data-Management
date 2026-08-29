# SMM Ops Tool

A role-based operations dashboard for a social-media marketing and promo-video business. It keeps clients, freelance cameramen, shoots, expenses, payments, and approvals in one place.

## What it does

- Manage client records, contacts, agreements, communication logs, and payment ledgers.
- Schedule shoots, assign cameramen, record call times, availability, check-ins, deliverables, and file links.
- Track incoming client payments, outgoing crew payouts, and other business expenses; overdue items are highlighted.
- Generate invoices and payout vouchers as PDFs, and export list data to CSV.
- Keep changes accountable with role-based approval requests, notifications, and a recycle bin for deleted records.
- View live operational data, upcoming shoots, pending actions, and revenue trends on the dashboard.

## Roles

| Role | Responsibilities |
| --- | --- |
| Admin | Creates and edits operational data, submits changes for approval, and manages deletions and recovery. |
| Founder | Reviews and approves or rejects submitted changes; direct founder edits apply immediately. |

Routine actions such as marking payments as paid and recording a crew check-in apply immediately after confirmation.

## Tech stack

- React 19, TypeScript, Vite, and Tailwind CSS
- Firebase Firestore for real-time operational data
- Supabase for authentication and storage integration
- React Router for navigation
- jsPDF for invoices and vouchers

## Prerequisites

- Node.js 20 or later
- npm
- A Firebase project (Firestore)
- A Supabase project (authentication and storage)

## Run locally

1. Clone the repository and enter the project folder.

   ```bash
   git clone https://github.com/Dheerajnaik259/Data-Management.git
   cd Data-Management
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create a local environment file from the example.

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell, use:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Set the required values in `.env.local`.

   ```env
   VITE_FIREBASE_API_KEY=""
   VITE_FIREBASE_AUTH_DOMAIN=""
   VITE_FIREBASE_PROJECT_ID=""
   VITE_FIREBASE_STORAGE_BUCKET=""
   VITE_FIREBASE_MESSAGING_SENDER_ID=""
   VITE_FIREBASE_APP_ID=""

   VITE_SUPABASE_URL=""
   VITE_SUPABASE_ANON_KEY=""
   ```

   `GEMINI_API_KEY` and `APP_URL` are optional environment variables included for integrations and deployment configuration.

5. Start the development server.

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000`.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server on port 3000. |
| `npm run build` | Creates a production build in `dist/`. |
| `npm run preview` | Serves the production build locally. |
| `npm run lint` | Runs TypeScript type checking. |

## Project documentation

- [Project plan](PROJECT_PLAN.md) — product scope, workflows, and roadmap.
- [Data model](DATA_MODEL.md) — collections, fields, roles, approval flow, and payment rules.
- [Design system](DESIGN_SYSTEM.md) — visual and UI guidelines.

## Security notes

- Never commit `.env.local` or service credentials. The file is already ignored by Git.
- Configure Firebase security rules and Supabase Row Level Security before deploying.
- Create only the intended Admin and Founder accounts, then assign roles in the application data.

## License

This project is private and intended for internal business use.
