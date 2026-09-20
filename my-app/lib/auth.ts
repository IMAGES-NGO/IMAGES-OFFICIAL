import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

const unusablePasswordHash = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.7HqG5QZgP7f3V6yQmJ4r9r7H3Qp7G3K";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? unusablePasswordHash,
        );
        if (!user || !passwordMatches) {
          return null;
        }

        if (!user.verifiedAt || user.role !== parsed.data.role) {
          return null;
        }

        return { id: user.id, name: user.username, email: user.email, role: user.role };
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
