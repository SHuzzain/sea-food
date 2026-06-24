# Seafood Billing

Mobile-first seafood purchase, sale, payment and reporting app built with Next.js App Router, TypeScript, Prisma, PostgreSQL, Tailwind CSS and shadcn-style UI components.

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `AUTH_SECRET`.
2. Run `npm install`.
3. Run `npm run prisma:migrate`.
4. Run `npm run db:seed`.
5. Run `npm run dev`.

Seeded login:

- Email: `admin@seafood.local`
- Password: `admin123`

## Commands

- `npm run dev` starts the local app.
- `npm run build` creates a production build.
- `npm run typecheck` runs TypeScript checks.
- `npm run lint` runs ESLint.
- `npm run prisma:studio` opens Prisma Studio.
