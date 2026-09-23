import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/rate-limit";

const unusablePasswordHash = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7HqG5QZgP7f3V6yQmJ4r9r7H3Qp7G3K";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 }, // 24 hours
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const normalizedEmail = parsed.data.email.toLowerCase();

        // Rate limiting check
        const rateLimitResult = checkRateLimit(normalizedEmail);
        if (!rateLimitResult.success) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        // In development mode, allow dev admin login for local testing
        const isDev = process.env.NODE_ENV === "development";
        if (isDev && normalizedEmail === "admin@imagesngo.org" && parsed.data.role === "ADMIN") {
          const devPassword = process.env.DEV_ADMIN_PASSWORD || "AdminImages2026!";
          if (parsed.data.password === devPassword) {
            return {
              id: "usr-dev-admin",
              name: "Admin Developer",
              email: "admin@imagesngo.org",
              role: "ADMIN" as const,
            };
          }
        }

        try {
          const user = await db.user.findUnique({
            where: { email: normalizedEmail },
          });
          const passwordMatches = await bcrypt.compare(
            parsed.data.password,
            user?.passwordHash ?? unusablePasswordHash,
          );
          if (!user || !passwordMatches) {
            return null;
          }

          if (user.status !== "APPROVED" || user.role !== parsed.data.role) {
            return null;
          }

          return { id: user.id, name: user.username, email: user.email, role: user.role };
        } catch (dbError) {
          console.warn("Database lookup error during authentication:", dbError);
          return null;
        }
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "ADMIN" | "MEMBER";
        session.user.id = (token.id as string) || token.sub || "";
      }
      return session;
    },
  },
};
