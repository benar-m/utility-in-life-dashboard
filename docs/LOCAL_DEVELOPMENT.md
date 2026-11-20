# Local development

The app is a Vite frontend with a Django API. Local development uses SQLite and does not need Docker or PostgreSQL.

## Windows PowerShell

From the `utillife` folder:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_demo
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

In a second PowerShell window:

```powershell
cd utillife
npm install
npm run dev -- --host 127.0.0.1
```

If `npm` is unavailable, the bundled workspace fallback is:

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" install --lockfile=false
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" run dev -- --host 127.0.0.1
```

Open `http://localhost:5173/` for the public student hub. Staff can sign in at `/login` with the seeded demo account:

- Email: `owner@utilityinlife.local`
- Password: `Demo-password-2026!`

The new **Resources** tab is available in the staff dashboard. Published resources appear in the public hub, where a learner can request access without creating a portal account first. Paid resources carry a price and create a pending access request; payment checkout remains the next integration step for this prototype slice.

## Checks

```powershell
npm run lint
npm run build
cd backend
py -3.12 -m pytest
py -3.12 manage.py check
```
