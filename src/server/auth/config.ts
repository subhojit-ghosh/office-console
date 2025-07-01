import { PrismaAdapter } from "@auth/prisma-adapter";
import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  type DefaultSession,
  type NextAuthConfig,
  type Session,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      clientId?: string;
      client?: {
        id: string;
        name: string;
        showAssignees: boolean;
      };
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    clientId?: string;
    client?: {
      id: string;
      name: string;
      showAssignees: boolean;
    };
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        const user = await db.user.findUnique({
          where: {
            email,
            isActive: true,
          },
          include: {
            client: true,
          },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        const isPasswordMatched = await bcrypt.compare(password, user.password);

        if (!isPasswordMatched) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clientId: user.clientId ?? undefined,
          client: user.client
            ? {
                id: user.client.id,
                name: user.client.name,
                showAssignees: user.client.showAssignees,
              }
            : undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        if (token.clientId) {
          session.user.clientId = token.clientId as string;
        }
        if (token.client) {
          session.user.client = token.client as Session["user"]["client"];
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role!;
        if (user.clientId) {
          token.clientId = user.clientId;
        }
        if (user.client) {
          token.client = user.client;
        }
      }
      return token;
    },
  },
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
