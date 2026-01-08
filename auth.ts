import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],

  events: {
    async signIn({ user }) {
      // Email might be missing depending on GitHub account privacy.
      if (!user.email) return;

      await prisma.appUser.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          name: user.name,
          image: user.image,
        },
        update: {
          name: user.name,
          image: user.image,
        },
      });
    },
  },

  callbacks: {
    async session({ session }) {
      const email = session.user?.email;
      if (!email) return session;

      const dbUser = await prisma.appUser.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } },
      });

      const roleNames = dbUser?.roles.map((r) => r.role.name) ?? [];
      (session.user as any).roles = roleNames;

      return session;
    },
  },
});
