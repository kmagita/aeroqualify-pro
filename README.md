# AeroQualify Pro v3.0

Full aviation QMS with CARs, CAPs, CAPA Verification, Flight School Documents, Contractors, Audit Scheduling, PDF reports and real-time team sync.

---

## Setup Steps

### 1. Supabase Database
1. Go to supabase.com → your project → SQL Editor → New Query
2. Paste the entire contents of `supabase/schema.sql`
3. Click Run

### 2. Add Credentials
Open `src/supabase.js` and replace:
```js
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_PUBLIC_KEY';
```

### 3. Deploy to Vercel
Upload this folder to GitHub then connect to Vercel.

### 4. Set Your Role
In Supabase → Table Editor → profiles → set your role to `admin`

### 5. Set Up Managers
In the app → Managers section → click Edit on each role → enter the person's name and email.

---

## Roles

| Role             | Can Do |
|------------------|--------|
| admin            | Everything |
| quality_manager  | Raise CARs, verify CAPAs, manage docs/audits |
| quality_auditor  | Raise CARs, view all |
| manager          | Complete CAP forms, view |
| viewer           | View only |

---

## CAR Workflow

1. **Quality Manager / Auditor** raises a CAR with finding description and QMS clause
2. **Responsible Manager** is notified by email → opens app → status changes to In Progress
3. **Responsible Manager** completes the CAP form (immediate action, root cause, corrective action, preventive action, evidence upload)
4. When all CAP fields are complete → status changes to **Pending Verification** → Quality Manager notified
5. **Quality Manager** opens Verification form → completes checklist → sets effectiveness and final status
6. If **Closed** → CAPA report PDF auto-generated → Responsible Manager notified
7. Status report PDF available at any time from the CARs view

---

## Email Notifications (Optional)
See previous README for Resend setup instructions.
Set these Supabase secrets:
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `TEAM_EMAILS`

Then deploy: `supabase functions deploy send-notification`
