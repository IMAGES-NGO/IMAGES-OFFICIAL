This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
