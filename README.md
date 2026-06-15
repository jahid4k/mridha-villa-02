# Mridha Villa 2 — Property Management System

Production-grade, mobile-first rent management app for a private rental building in Bangladesh.

## Tech Stack
Next.js 16 App Router · TypeScript · MongoDB Atlas · Mongoose · NextAuth v5 · Cloudinary · Tailwind CSS v4 · Recharts · Vercel

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill in MONGODB_URI, AUTH_SECRET, NEXTAUTH_URL, CLOUDINARY_*

# 3. Run
npm run dev

# 4. Seed (first time only)
# Visit Settings page → click "Seed Database"
# OR: POST http://localhost:3000/api/seed
```

## Default Credentials
| User | Password |
|------|----------|
| jahid | jahid123 |
| jony | jony123 |

**Change these in production.**

## Deploy to Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Add env vars: `MONGODB_URI`, `AUTH_SECRET`, `NEXTAUTH_URL`, `CLOUDINARY_*`
4. Deploy → Seed via Settings page

## Modules
- Dashboard · Units · Tenants · Leases · Rent · Electricity · Gas · Expenses · Reports · Audit Logs · Settings

## Key Business Rules
- Rent split by assigned collector per unit (not 50/50 ownership)
- Advance balance auto-applied when generating rent records
- Water = building expense (not charged to tenants)
- Electricity calculated via sub-meter: `units × rate`
- Archive instead of permanent delete
- Full audit trail on every change
