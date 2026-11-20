# Dashboard QA: hands-on test log

Tested by driving the app in a real browser (Playwright + Chrome) as each user type would:
clicking through every page, filling and submitting every form, trying wrong input,
and switching roles. Console errors and failed API calls were captured throughout.

**Setup:** local frontend (Vite) + local Django API running on a *copy* of the dev
database, so test records never touched real data. Payments use the mock gateway, so
no real M-Pesa prompts were sent. Accounts: a QA owner, plus teacher and student
accounts created during testing.

**Status key:** ✅ works · 🐞 bug · 🔧 patched during QA (retested) · 🕳️ missing / placeholder · 💡 polish

---

## 1. Shell: sign-in, navigation, top bar

| # | Area | What I did | Result | Status |
|---|---|---|---|---|
| 1.1 | Sign-in | Opened `/dashboard` signed out | Redirected to sign-in | ✅ |
| 1.2 | Sign-in | Wrong password | "Invalid email or password." | ✅ |
| 1.3 | Sign-in | Correct password | Lands on `/dashboard` | ✅ |
| 1.4 | Session | Reloaded the page | Still signed in (refresh cookie) | ✅ |
| 1.5 | Sidebar | Clicked all 11 links | Every page loads, no API errors | ✅ |
| 1.6 | Top bar search | Typed "Grace", pressed Enter | Nothing happens; it is a decorative input | 🕳️ |
| 1.7 | Notification bell | Clicked | Nothing opens, yet a red "unread" dot was always shown. Fake dot removed; the bell itself is still a placeholder | 🔧 / 🕳️ |
| 1.8 | 404 page | Visited an unknown URL | "Back to dashboard" linked to `/`, which is now the public landing page. Now goes to your dashboard (or home if signed out) | 🔧 |
| 1.9 | `/login` while signed in | Opened it | Showed the sign-in form. Now redirects to your dashboard | 🔧 |
| 1.10 | Wrong-role page | Owner opened `/student` | Clear "You cannot access this area" page with a way back | ✅ |
| 1.11 | Console | Every page | Only React Router v7 "future flag" warnings | 💡 |

## 2. Students, portal invitations, and the student portal

| # | Area | What I did | Result | Status |
|---|---|---|---|---|
| 2.1 | Add student | Submitted empty, then with a bad email | Browser validation blocks both | ✅ |
| 2.2 | Add student | Valid details | Dialog closes, row appears | ✅ |
| 2.3 | Add student | Submitted the *identical* student + guardian again | Second identical record created, no warning | 🐞 |
| 2.4 | Students list | Looked for a way to view or edit a student | No view/edit; typos (e.g. grade "1" for Brian Doe) can't be corrected, and there's no search on this page | 🕳️ |
| 2.5 | Students list | Looked for the student's classes | Not shown anywhere on the page | 🕳️ |
| 2.6 | Row actions menu | Pressed Escape | Menu stayed open (affects every page's ⋯ menus) | 🔧 |
| 2.7 | Assign to class | Assigned to Form 3 English | Enrolled; KES 1,500 invoice auto-created | ✅ |
| 2.8 | Assign to class | Re-opened | Classes the student is already in are still offered; picking one silently does nothing | 💡 |
| 2.9 | Invite to portal | Used the guardian's email | Clear error shown | ✅ |
| 2.10 | Invite to portal | Fresh email | One-time link with Copy button; row shows "invited" | ✅ |
| 2.11 | Error messages app-wide | Any API error | Prefixed with raw field names ("email: …", "token: …") | 🔧 |
| 2.12 | Accept invitation | Mismatched passwords → then too-short | Both caught, but the old "do not match" message lingered. Now clears as you type | 🔧 |
| 2.13 | Accept invitation | Valid password | "Your account is ready" → sign in | ✅ |
| 2.14 | Accept invitation | Re-opened the used link | Shows the password form again; only fails on submit ("invalid or has expired") | 🐞 |
| 2.15 | Student sign-in | Signed in as the new student | Lands on `/student`; staff pages → "unauthorized" | ✅ |
| 2.16 | Student portal | Dashboard, My classes, Timetable, Payments | All correct for the enrolled class | ✅ |
| 2.17 | Student portal | Looked for notes/past papers | No Resources page in the portal; only reachable via the public site | 🕳️ |
| 2.18 | Student payments | Invoice due date | Raw `2026-11-27` instead of "27 Nov 2026" | 🔧 |
| 2.19 | Pay with M-Pesa | Invalid phone | Showed **"phone number: [object Object]"** | 🔧 |
| 2.20 | Pay with M-Pesa | Valid phone → simulate approval | Invoice → paid, receipt listed, Pay disabled | ✅ |
| 2.21 | Pay with M-Pesa | Success state | Said "Approve the prompt on your phone…" above "Payment succeeded". Now shows only the outcome | 🔧 |
| 2.22 | Pay with M-Pesa | Closed the dialog while a prompt was pending, tried again | **Locked out:** "A payment prompt is already pending" with no pending indicator, no retry/cancel; pending prompts never expire, so a lost gateway callback blocks that invoice permanently | 🐞 |
| 2.23 | Restrict for late payment | Applied, then lifted | Row shows "Class access restricted", then clears | ✅ |
| 2.24 | Archive student | Archived the duplicate | Becomes "inactive", history kept | ✅ |
| 2.25 | Archived students | Tried to restore one; looked for a filter | No restore action, all actions disabled; archived rows stay mixed into the list | 🕳️ |

## 3. Registrations (public quick form → staff follow-up)

| # | Area | What I did | Result | Status |
|---|---|---|---|---|
| 3.1 | Public form | Pre-filled link from the landing page; empty submit; valid submit | Pre-fill works, errors per field, "Registration received" | ✅ |
| 3.2 | Dashboard CTA | "Review registrations" | Opens `/registrations` | ✅ |
| 3.3 | Status | New → Contacted | Saved; moves to the Contacted filter | ✅ |
| 3.4 | Status | Changed status | Row just vanishes from the current filter, no confirmation | 💡 |
| 3.5 | Search | "0722 111" / "+254722111222" | Found nothing (numbers are stored without spaces) | 🔧 |
| 3.6 | Enrolment | Marked "Enrolled" | No student record is created; staff must retype everything in Add student | 🕳️ |

## 4. Teachers and the teacher portal

| # | Area | What I did | Result | Status |
|---|---|---|---|---|
| 4.1 | Invite teacher | Empty submit; valid details | Validation; one-time link with Copy | ✅ |
| 4.2 | Subjects field | Typed "Chemistry, maths" | Created a **new subject "maths"** beside "Mathematics"; free text pollutes subjects used by classes, filters and the catalogue | 🐞 |
| 4.3 | Teachers list | Looked for edit / deactivate / resend invite | No row actions at all | 🕳️ |
| 4.4 | Accept invite | Set password, signed in | Lands on `/teacher`; staff and student pages blocked | ✅ |
| 4.5 | Teacher portal | Dashboard, My classes, Timetable | Correct (empty until a class is assigned, then populated) | ✅ |
| 4.6 | Attendance | Looked for a way to mark attendance | None, although the staff Attendance page says teachers mark it "from their class view" | 🕳️ |
| 4.7 | Resources | Looked for a way to add notes | None for teachers (meeting notes say teachers add resources) | 🕳️ |

## 5. Classes, enrollment links, and applications

| # | Area | What I did | Result | Status |
|---|---|---|---|---|
| 5.1 | Create class wizard | Empty step 1 | Clear message | ✅ |
| 5.2 | Create class wizard | Term ending before it starts | Was allowed past step 2. Now caught on step 2 | 🔧 |
| 5.3 | Create class wizard | Reused the existing term name "Term 2" | **"A term with this name already exists with different dates"**: you must retype the existing term's exact dates, which the form never shows; existing terms aren't offered as a choice; the error appears on step 3 while the fields are on step 2 | 🐞 |
| 5.4 | Create class wizard | Arriving on step 3 | Clicking "Continue" actually **submitted the form**: React reused the button as the "Create class" submit mid-click, which also showed a premature "Select at least one teaching day". Fixed with separate buttons; verified no request fires | 🔧 |
| 5.5 | Create class wizard | http meeting link; end time before start; 3 students into capacity 2 | All rejected with clear messages | ✅ |
| 5.6 | Create class wizard | Valid class | Created with teacher, timetable, 2 students, meeting link | ✅ |
| 5.7 | Class row actions | Looked for edit / pause / archive / roster | Only "Copy enrollment link" and "Set cost"; a class can't be edited, paused, ended, or its roster viewed by admin | 🕳️ |
| 5.8 | Set cost | Negative, then 1,800 | Negative blocked; saved | ✅ |
| 5.9 | Enrollment link | Copy | Dialog shows the link with Copy | ✅ |
| 5.10 | Enrollment link | Opened it for a **full** class | Still accepts applications without saying the class is full (landing page does say "Class full") | 🐞 |
| 5.11 | Accept application | Into the full class | Blocked: "The requested class is at capacity." | ✅ |
| 5.12 | Accept application | Wanted to accept into another class / without a class | Not possible; only Accept or Reject | 🕳️ |
| 5.13 | Reject application | With a reason | Works | ✅ |
| 5.14 | Applications history | After handling all | Panel disappears; no record of past accepted/rejected applications | 💡 |
| 5.15 | Landing "Ask about trips" | Submitted, then viewed as staff | Lands in *Enrollment applications* with "Guardian: Trip Kid" (form never asks for a guardian, so the child's name is copied); "Accept" creates an active student for a trip enquiry | 🐞 |
| 5.16 | Teacher portal with a class | Viewed roster, timetable; updated meeting link | Works; `javascript:` links blocked, HTTPS links saved | ✅ |
| 5.17 | **Joining a lesson** | Student opened My classes for a class with a meeting link | **Students can never get the link**: the column says "Attend not open"/"Link pending" ("Attend opens when dated lesson sessions are implemented"). The backend already computes `can_attend`, but nothing hands the link to the student | 🕳️ |

## 6. Resources

| # | Area | What I did | Result | Status |
|---|---|---|---|---|
| 6.1 | Add resource | `javascript:` link | Rejected by the server, error shown | ✅ |
| 6.2 | Add resource | Plain `http://` link | Accepted (meeting links require HTTPS; resources don't) | 💡 |
| 6.3 | Add resource | Valid | Appears in the staff list and on the public site immediately | ✅ |
| 6.4 | Subject list | Opened the subject dropdown | Includes the stray "maths" subject from 4.2 | 🐞 |
| 6.5 | Resources list | Looked for edit / unpublish / delete | Only "Open link"; a mistake can't be corrected and nothing can be withdrawn | 🕳️ |
| 6.6 | Search | "mole" | Finds it | ✅ |
| 6.7 | Student reading | Free / paid in their subject / paid outside it | Opens / opens / "Request access" form, matching the access rules | ✅ |
| 6.8 | Request access form | Signed in as a student | Had to retype name and email | 🔧 |
| 6.9 | Staff: access requests | Opened the request | Only "Mark contacted"; no way to grant one student access to one resource; handled requests disappear with no history | 🕳️ |

## 7. Payments (staff)

| # | Area | What I did | Result | Status |
|---|---|---|---|---|
| 7.1 | Set class cost | With "apply to active enrollments" | Invoices created for the 2 enrolled students | ✅ |
| 7.2 | Generate class invoices | Clicked twice | "0 created; 2 refreshed": no duplicates | ✅ |
| 7.3 | Create invoice | Amount 0; due date in the past | Both blocked with clear messages | ✅ |
| 7.4 | Create invoice | Student picker | Students with the same name ("Benard Mulwa" ×2) are indistinguishable | 🐞 |
| 7.5 | Record cash payment | Overpay 1,500 on a 1,000 invoice | Blocked | ✅ |
| 7.6 | Record cash payment | 400 | Invoice → partially paid, receipt issued | ✅ |
| 7.7 | Record bank payment | Without a reference | Blocked (reference required) | ✅ |
| 7.8 | Void invoice | On a part-paid invoice | Disabled (correct) | ✅ |
| 7.9 | Cash/bank payment | Tried to reverse/refund a recorded cash payment | "Manual refund not available"; a mis-typed cash payment can never be corrected | 🕳️ |
| 7.10 | M-Pesa refund | More than paid, then 500 | Blocked, then refunded; invoice re-opens with 500 due; totals update | ✅ |
| 7.11 | M-Pesa refund in production | Checked the PayHero path | Button is disabled ("Refund in PayHero"): no refund path in the app in production | 🕳️ |
| 7.12 | Reconciliation | Ran it | "8 records checked, 0 issues" | ✅ |
| 7.13 | Overdue | Invoice past its due date | Still "partially paid" and the summary shows "0 overdue" until an admin clicks "Restrict overdue accounts"; nothing runs on a schedule, and you can't mark overdue without also restricting | 🐞 |
| 7.14 | Restrict overdue accounts | Clicked | Ran instantly with no confirmation. Now asks first | 🔧 |
| 7.15 | ⋯ menus on long pages | Opened a menu while the page was still scrolling | Menu closes on any scroll; feels flaky on trackpads | 💡 |

## 8. Placeholders, phone layout, sign-out

| # | Area | What I did | Result | Status |
|---|---|---|---|---|
| 8.1 | Attendance | Opened | Empty state only; no way to record or view attendance anywhere | 🕳️ |
| 8.2 | Reports | Clicked each "Export" | All three disabled; no reports exist | 🕳️ |
| 8.3 | Settings | Clicked each "Manage" | All four disabled; organisation details, Paybill, roles, notifications can't be configured | 🕳️ |
| 8.4 | Dashboard | "Attendance today" and "Recent activity" | Permanent placeholders ("—", "when the audit stream is added") | 🕳️ |
| 8.5 | Dashboard stats | Compared with the pages | Students, teachers and classes counts match | ✅ |
| 8.6 | Drill-down | Clicked class names, calendar entries, "Missing" link badges | Nothing is clickable; there are no detail pages for a class, student or teacher; admins can't set a class's meeting link (only its teacher can) | 🕳️ |
| 8.7 | Phone (390px) | Students, Classes, Payments | **The whole page scrolled sideways** (the layout let wide tables stretch it). Fixed; tables now scroll inside their box | 🔧 |
| 8.8 | Phone (390px) | Tables | The ⋯ actions column is off-screen with no hint that the table scrolls | 💡 |
| 8.9 | Phone (390px) | Sidebar, dialogs | Sidebar closes after navigating; dialogs fit the screen | ✅ |
| 8.10 | Sign out | Then Back, reload, and a direct staff URL | All land on sign-in; nothing cached is shown | ✅ |

---

## Summary

- **100 logged checks** (47 working as intended) across sign-in, every staff page, every row action and form, the teacher and student portals, the public forms that feed the dashboard, roles/permissions, phone layout and sign-out.
- **Works well:** sign-in and role separation, invitations, the class wizard's server-side validation, the payments ledger (partial payments, refunds, voids, reconciliation, duplicate-safe invoice generation), the student portal and M-Pesa flow.
- **Patched during QA and retested (🔧):** 15 items, including a wizard button that silently submitted the form, "[object Object]" error messages, whole-page sideways scrolling on phones, and Escape not closing menus.
- **Open:** 10 bugs (🐞), 22 missing features (🕳️, one shared with a patch) and 7 polish items (💡), all planned below.

---

## Progress

**P0 and P1 are done** (20 Nov 2026), each verified in the browser against a QA copy of
the database and covered by backend tests (139 passing). The changes:

| # | Status | What changed |
|---|---|---|
| A | ✅ | Students get **Join lesson** (link handed out only to enrolled, unrestricted students). Admins set links from Classes or the class page |
| B | ✅ | Pending M-Pesa prompts expire after 3 minutes (`PAYMENT_PROMPT_TIMEOUT_SECONDS`); invoices show "prompt sent, check your phone"; late success callbacks are still recorded |
| C | ✅ | `mark_overdue_invoices` runs daily via a systemd timer on the server; restricting stays a confirmed admin action |
| D | ✅ | Subject picker everywhere; new subjects are added deliberately and reuse existing names case-insensitively. *The stray "maths" subject exists only in the dev database; remove it in Django admin.* |
| E | ✅ | Class wizard picks an existing term (dates shown) or creates a new one; only teachers of the chosen subject are listed |
| F | ✅ | Student page (`/students/:id`: edit, guardian, classes, invoices, withdraw), class page (`/classes/:id`: edit details, teacher, capacity, status, timetable, roster, meeting link), teacher edit (name, phone, subjects, deactivate) |
| G | ✅ | Active / Archived / All filter, server search (name, guardian name/email/phone), Restore |
| H | ✅ | Same name + guardian is flagged with "Open existing record" / "Add anyway" |
| I | ✅ | "Create student" on a registration pre-fills Add student and marks it Enrolled |
| J | ✅ | Accept into the requested class, another class, or none; a History view of handled applications |
| K | ✅ | Trip requests are labelled *Enquiry* ("Close enquiry" / "Enrol as student…"); the landing form asks for the parent's name |
| L | ✅ | Resources: edit, publish/unpublish, delete (requested ones must be unpublished instead), HTTPS-only links, **Grant access** from a request |
| M | ✅ | Cash/bank payments: **Reverse payment** (ledger entry, invoice re-opens). PayHero: refund in the PayHero portal, then **Record PayHero refund** |
| N | ✅ | Enrollment links say when a class is full; paused/ended classes stop taking applications |
| O | ✅ | Used, expired or invalid invitation links say so on load |
| P | ✅ | Student pickers show grade and guardian |

Also fixed along the way: class "enrolled" counts included withdrawn students (also on the public site's
"places left"); the teacher edit dialog crashed on close; invitation emails now say Shuleni Online.

**P2 is done** (20 Nov 2026), checked in the browser (desktop and 390px mobile) against a QA database
seeded with three weeks of attendance and eight weeks of payments; 151 backend tests passing.

| # | Status | What changed |
|---|---|---|
| Q | ✅ | Teachers take attendance (**Attendance** in the teacher portal: Present / Late / Absent / Excused, "Mark everyone present", corrections allowed, no future dates). Admin **Attendance** page: rate by day, status breakdown, rate by class, students missing the most lessons, CSV export. Dashboard "Attendance today" is real |
| R | ✅ | Teachers add free resources for subjects they teach (**My resources**); students get a **Resources** page (for my subjects / everything, locked ones say which class unlocks them) |
| S | ✅ | **Reports**: collections (net of refunds), outstanding by class, growth (enrollments vs registrations), how parents pay; date presets or custom range; every chart has a table view; CSV exports for payments, invoices, attendance, enrollments, registrations (spreadsheet-formula safe) |
| T | ✅ | **Settings**: organisation details (public phone feeds the website), programs, subjects (rename / retire / merge duplicates), terms |
| U | ✅ | Global search in the top bar (students, teachers, classes, registrations; arrow keys + Enter). Bell shows recent activity with an unread count (routine attendance doesn't ring it) |
| V | ✅ | Dashboard home: key figures with sparklines, collections and attendance charts, a "Needs attention" list, and the recent activity feed |

Charts use one validated colour-blind-safe palette, animate in once when scrolled into view (off
for people who prefer reduced motion), and show a tooltip on hover.
Also fixed: the portal "Dashboard" link stayed highlighted on every teacher/student page.

## Fix plan

Ordered by impact on running the pilot. Sizes are rough: S ≈ under half a day, M ≈ 1–2 days, L ≈ 3+ days.

### P0: blocks the pilot

| # | Fix | Covers | Size |
|---|---|---|---|
| A | **Let students join lessons.** Add a "Join" button in My classes that calls a new signed-in endpoint returning the meeting link when `can_attend` is true (enrolled, link set, not restricted). Optionally only open it 15 minutes before a scheduled lesson. Let admins set or replace a class's meeting link too | 5.17, 8.6 | M |
| B | **Unstick pending M-Pesa prompts.** Expire `PENDING` attempts after ~3 minutes (mark failed on next read or via a periodic job); show "Payment pending… Check status / Try again" on the invoice row so a closed dialog never locks a parent out | 2.22 | S–M |
| C | **Mark overdue invoices automatically.** Daily management command + systemd timer (same pattern as certificate renewal) that sets `OVERDUE`; keep "Restrict overdue accounts" as the separate, confirmed admin step | 7.13 | S |
| D | **Stop subject sprawl.** Replace free-text subjects (teacher invite, class wizard) with a picker of existing subjects plus an explicit "Add new subject" option; merge the stray "maths" into Mathematics | 4.2, 6.4 | S–M |
| E | **Term picker in the class wizard.** Choose an existing term (dates filled in, read-only) or create a new one | 5.3 | S |

### P1: day-to-day admin can't correct mistakes

| # | Fix | Covers | Size |
|---|---|---|---|
| F | **Detail + edit pages** for Student, Class and Teacher (edit details, roster, invoices, restrictions; for classes: edit timetable, teacher, capacity, pause/end) | 2.4, 2.5, 4.3, 5.7, 8.6 | L |
| G | **Restore archived students** and an "Active / Archived" filter on Students; search on Students | 2.25, 2.4 | S |
| H | **Duplicate detection** on Add student (same name + guardian email): warn and offer the existing record | 2.3 | S |
| I | **Convert a registration into a student** from the Registrations page ("Create student" pre-fills Add student; marks it Enrolled) | 3.6 | S |
| J | **Applications:** accept into a chosen class (or none); keep a history tab of accepted/rejected | 5.12, 5.14 | S–M |
| K | **Separate enquiries from applications.** Trip and resource enquiries become leads (shown with Registrations), not student applications; landing request form asks for the parent's name | 5.15 | S–M |
| L | **Resources: edit, unpublish, delete**; require HTTPS links; staff can grant a specific student access from an access request | 6.2, 6.5, 6.9 | M |
| M | **Correct cash/bank payments:** "Reverse payment" with a reason (ledger entry, never a delete); document the PayHero refund process, or add it once PayHero supports it via API | 7.9, 7.11 | M |
| N | **Full-class enrollment links** say the class is full and offer the waiting list / general registration | 5.10 | S |
| O | **Used/expired invitation links** say so on load (validate the token first) instead of showing the password form | 2.14 | S |
| P | **Distinguish same-name students** in pickers (show grade and guardian) | 7.4 | S |

### P2: features shown as placeholders

| # | Fix | Covers | Size |
|---|---|---|---|
| Q | **Attendance:** teachers mark present/absent per lesson from My classes; admin view + dashboard "Attendance today" | 4.6, 8.1, 8.4 | L |
| R | **Teacher resources:** teachers add resources for their subjects; students see their subjects' resources inside the portal | 4.7, 2.17 | M |
| S | **Reports:** CSV exports for payments, attendance and enrollments | 8.2 | M |
| T | **Settings:** organisation details, contact phone and program (currently in `.env` / Django admin), Paybill display | 8.3 | M |
| U | **Global search and notifications:** wire the top-bar search across students/classes/teachers; either build notifications (new registrations, payments) or remove the bell | 1.6, 1.7 | M |
| V | **Recent activity** feed on the dashboard (registrations, payments, enrollments) | 8.4 | M |

### P3: polish

Status-change toast on Registrations (3.4); hide already-joined classes in "Assign to class" (2.8); a scroll hint or pinned actions column on phone tables (8.8); menus that don't close on minor scrolls (7.15); opt into React Router v7 flags to clear console warnings (1.11).

---

*Test harness: Playwright scenarios in the session scratchpad, run against a copy of the dev database (`DATABASE_URL` override) so no real data was touched.*
