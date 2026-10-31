import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitKey } from "@/lib/rate-limit-core";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

// Compared against when the email is unknown, so timing doesn't reveal which emails exist.
let dummyHash: string | undefined;
function getDummyHash(): string {
  if (!dummyHash) dummyHash = bcrypt.hashSync("not-a-real-password-placeholder", 12) as string;
  return dummyHash;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 }, // 12 hours
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, req) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const forwarded = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() ?? "unknown";
        // 5 attempts per email+IP per 15 minutes, 30 per IP.
        if (!rateLimitKey(`login:${email}:${ip}`, 5, 15 * 60_000).ok || !rateLimitKey(`login-ip:${ip}`, 30, 15 * 60_000).ok) {
          throw new Error("Too many sign-in attempts. Please wait 15 minutes and try again.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? getDummyHash());
        if (!user || !valid || !user.isActive) return null;

        await prisma.$transaction([
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
          prisma.activityLog.create({
            data: { actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id, summary: "Signed in" },
          }),
        ]);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        session.user.id = token.uid;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
