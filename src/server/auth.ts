import type { GetServerSidePropsContext } from "next";
import type { Profile } from "next-auth";
import type { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { env } from "../env/server.mjs";
import { prisma } from "./db";
import SpotifyProvider from "next-auth/providers/spotify";

/**
 * Module augmentation for `next-auth` types.
 * Allows us to add custom properties to the `session` object and keep type
 * safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 **/
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks,
 * etc.
 *
 * @see https://next-auth.js.org/configuration/options
 **/
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.accessToken = account.refresh_token;
      }
      if (profile) {
        const typedProfile = profile as Profile & {
          external_urls: {
            spotify: string;
          };
          images: { url: string }[];
        };
        token.profileSrc = typedProfile.external_urls.spotify;
        token.avatar = typedProfile.images[0]?.url;
      }
      return token;
    },
    session({ session, token }) {
      if (session && token) {
        session.user.id = token.id as string;
      }
      return {
        ...session,
        ...token,
      };
    },
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
      authorization:
        "https://accounts.spotify.com/authorize?scope=user-read-email%20user-library-modify%20user-library-read",
    }),
    /**
     * ...add more providers here
     *
     * Most other providers require a bit more work than the Discord provider.
     * For example, the GitHub provider requires you to add the
     * `refresh_token_expires_in` field to the Account model. Refer to the
     * NextAuth.js docs for the provider you want to use. Example:
     * @see https://next-auth.js.org/providers/github
     **/
  ],
  debug: true,
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the
 * `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 **/
export const getServerAuthSession = (ctx: {
  req: GetServerSidePropsContext["req"];
  res: GetServerSidePropsContext["res"];
}) => {
  return getServerSession(ctx.req, ctx.res, authOptions);
};
