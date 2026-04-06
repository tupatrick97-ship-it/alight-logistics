# Alight RMS — File Structure

## Project layout

```
alight-rms/
├── index.html          ← Entry point (HTML structure only, zero inline scripts)
│
├── css/
│   └── styles.css      ← All visual design: tokens, themes, layout, components,
│                          animations, responsive breakpoints.
│                          Contains new: .report-card, .report-grid, .report-btn-card
│                          and Car Wash ssb[data-sub="car_wash"] accent styles.
│
├── js/
│   └── app.js          ← All UI logic, form handling, chart rendering,
│                          navigation, auth, reports download, etc.
│                          New additions:
│                            • renderReports()       — Reports section
│                            • downloadReport(type)  — CSV export
│                            • Car Wash service form in SERVICE_FORMS.car_wash
│                            • selectServiceSub() handles new sub-type
│
└── db/
    └── database.js     ← Data layer (no DOM). State, localStorage persistence,
                           user/request/notification CRUD, analytics helpers.
                           New exports:
                             • DB.SERVICE_SUB_TYPES  — includes car_wash
                             • DB.canDownloadReports(user) — access guard
                             • DB.generateCSVReport(type)  — CSV generator
```

## What's new vs original

### 1. Car Wash — service sub-type
- Added to `DB.SERVICE_SUB_TYPES` in `db/database.js`
- Added `🫧 Car Wash` button to the service sub-type grid in `index.html`
- `SERVICE_FORMS.car_wash` in `js/app.js` provides a dedicated form:
  - Vehicle plate
  - Wash type (Basic / Full exterior / Full interior+exterior / Engine / Polish+wax)
  - Preferred date + time
  - Special instructions
- Sub-type is stored on the request object (`req.subType`) and shown in all request views + CSV exports.

### 2. Reports — admin + manager only
- **Sidebar**: `Reports` menu item appears **only** in admin and manager nav arrays.
- **`DB.canDownloadReports(user)`**: returns `true` only for `admin` and `manager` roles.
- **`renderReports()`**: hard-gates at render time — shows "Access Restricted" for other roles even if they navigate directly.
- **`downloadReport(type)`**: double-checks `canDownloadReports()` before generating any file, then logs the download to the audit log.
- Three report types available:
  - `requests` — all requests (ref, type, sub-type, requester, date, status, notes)
  - `users`    — all users (name, email, phone, role, status, joined)
  - `audit`    — audit log (time, actor, role, action, module)
- All reports export as `.csv` files with today's date in the filename.

## How to run
Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
No build step required — pure HTML + CSS + vanilla JS.
