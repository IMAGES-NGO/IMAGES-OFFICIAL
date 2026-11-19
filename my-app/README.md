This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Founded in 1991, IMAGES is a Non Profit Organization (NPO) and Non Government Organization (NGO) comprising students of PEC, University of Technology, Chandigarh. Our organization's motto is "exploring in you...you!!" which clearly emphasizes that the chief aim of the body is all round development of its members.

The organization aims at multi-faceted development of its members through innovative and enterprising projects and regular meetings.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication setup

Copy `.env.example` to `.env.local`, set `DATABASE_URL` to your Neon connection string, and generate a long random `NEXTAUTH_SECRET`. This project uses Prisma; run `npm run prisma:push` once to create the `users` table in Neon before using signup, then run `npm run prisma:generate` after schema changes.

The app uses NextAuth Credentials with JWT sessions. NextAuth stores the session in an HTTP-only cookie; passwords are stored only as bcrypt hashes and are never sent to the client.

## Admin Dashboard & Events Management

The project includes an Admin Dashboard at `/admin/dashboard` for managing NGO events and media assets:

1. Create a free account at [Cloudinary](https://cloudinary.com).
2. Copy your **Cloud Name**, **API Key**, and **API Secret** from the Cloudinary Dashboard.
3. Add them to your `.env.local`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
4. Run `npm run prisma:push` to sync the `events`, `users`, and `media_images` tables with your PostgreSQL/Neon database.
5. Navigate to `/admin/dashboard` to create, edit, or delete events, upload event images to Cloudinary, and select members for event participant rosters. Public events can be viewed at `/events`.

## User Profiles

Every user has a profile page showing their identity (username, email, role, status, join date), personal details, points stats, events attended and full points history.

| Route | Who can access |
| --- | --- |
| `/profile` | The signed-in user (their own profile) |
| `/profile/[id]` | That user, or any admin |
| `GET` / `PATCH /api/profile` | Signed-in user — read or update their own profile |
| `GET` / `PATCH /api/users/[id]/profile` | That user or an admin; others get `403` |

### Personal details

Users (and admins, on any profile) can edit these optional fields with the **Edit** button on the profile page:

| Field | Column | Rules |
| --- | --- | --- |
| SID | `sid` | Exactly 8 digits, unique across users (`409` if taken) |
| Phone number | `phone` | Indian mobile number; `+91`, spaces and dashes are stripped, stored as 10 digits |
| Date of birth | `date_of_birth` | `YYYY-MM-DD`, age between 10 and 100 |
| Day scholar / hosteller | `residence` | `DAY_SCHOLAR` or `HOSTELLER` |

`PATCH` bodies may contain any subset of `sid`, `phone`, `dateOfBirth`, `residence`. Omitted fields are unchanged and an empty string clears a field. Validation errors come back as `400` with `fieldErrors`. Validation lives in `lib/validations/profile.ts`.

> After pulling this change, run `npm run prisma:push` to add the new columns to your database, then restart the dev server.

Profile data is assembled in `lib/profile.ts` (`getUserProfile`, `updateUserProfile`, `canViewProfile`). The password hash and OTP fields are never returned.

## Admin: Members List

`/admin/members` (linked from the admin dashboard header) lists everyone who has signed up, except unverified sign-ups.

- **Colour coding:** admin rows have an amber left border and tint, plus an amber "Admin" badge. Members show a sky "Member" badge. A legend sits above the table, and the same amber marks admins on profile pages and in Excel exports.
- **Search** by username, email, SID or phone. **Filter** by role, status (approved / pending / rejected) and residence.
- Each row shows SID, phone, residence, points, events attended and join date, with a link to the member's profile.
- **Roles:** every signup is created as a Member, and approving a request always grants Member. Admins promote or demote people with **Make admin / Remove admin** on this page, which calls `POST /api/admin/set-role`. Admins can't change their own role, and only approved members can be promoted.
- Data comes from `GET /api/admin/members` (admin only), built by `lib/members.ts`.

## Admin: Excel Export

Two buttons on `/admin/members` download `.xlsx` files, generated server-side with [ExcelJS](https://github.com/exceljs/exceljs):

| Endpoint | File | Contents |
| --- | --- | --- |
| `GET /api/admin/export?type=members` | `images-members-YYYY-MM-DD.xlsx` | One sheet with every member and their profile details |
| `GET /api/admin/export?type=database` | `images-database-YYYY-MM-DD.xlsx` | One sheet per table: Members, Events (participant names resolved), Points Ledger, Event Types, Media |

Every sheet has a bold frozen header row, auto-filters and real date cells, and admin rows are highlighted. Password and OTP hashes are never exported. All values are written as typed cells, never formulas, so user-entered text cannot run as an Excel formula. The export is admin-only (`403` otherwise). The builder lives in `lib/export.ts`.

## Admin: Analytics

`/admin/analytics` (linked from the admin dashboard header) shows:

- **KPI tiles:** approved members (and admins), pending approvals, events (and upcoming), total points awarded, average points per member, and profile completion (approved members with SID, phone, DOB and residence all filled in).
- **Day scholars vs hostellers:** a share breakdown of approved members.
- **An interactive pivot workspace** powered by [FINOS Perspective](https://perspective.finos.org). It has preset views for members (joins per month, top members by points, residence split, by batch), events (by type, participants per event) and points (awarded per month, by event type), plus full tables. **Customize view** opens Perspective's panel to group, split, filter, sort or change the chart type. **Export CSV** downloads the current view.

Data comes from `GET /api/admin/analytics` (admin only), built in `lib/analytics.ts`. Analytics rows deliberately leave out email, phone and exact date of birth; age and batch are derived instead. Batch is taken from the first two digits of the SID (e.g. `23104012` → `2023`).

Perspective is WebAssembly-based, so it is **not bundled**. `lib/perspective.ts` loads the official ES-module builds (pinned to `3.8.0`) from `cdn.jsdelivr.net` at runtime, and only on the analytics page. The theme stylesheet is loaded with `crossorigin="anonymous"` so Perspective can read its themes. If you add a Content-Security-Policy later, allow `cdn.jsdelivr.net` for `script-src`, `style-src` and `connect-src`, plus whatever `worker-src` Perspective's worker needs. Check the browser console after enabling a CSP. Admins can open a pending user's profile from the "View profile" link on the admin dashboard.


You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
