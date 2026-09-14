import type { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user?: {
      id?: string;
      color?: string;
      profilePicture?: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "clickup",
      name: "ClickUp",
      type: "oauth",
      authorization: {
        url: "https://app.clickup.com/api",
        params: {
          response_type: "code",
        },
      },
      token: "https://api.clickup.com/api/v2/oauth/token",
      userinfo: {
        url: "https://api.clickup.com/api/v2/user",
        async request({ tokens }) {
          const res = await fetch("https://api.clickup.com/api/v2/user", {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });
          const data = await res.json();
          return data.user;
        },
      },
      profile(profile) {
        return {
          id: String(profile.id),
          name: profile.username || profile.email,
          email: profile.email,
          image: profile.profilePicture || null,
          color: profile.color || null,
        };
      },
      clientId: process.env.CLICKUP_CLIENT_ID || process.env.NEXT_PUBLIC_CLICKUP_CLIENT_ID || "",
      clientSecret: process.env.CLICKUP_CLIENT_SECRET || "",
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }: any) {
      if (account && account.access_token) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.id = profile.id;
        token.color = profile.color;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.color = token.color as string;
      }
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET || "prime-forms-portal-secret-key-placeholder",
};

export const getServerAuthSession = () => getServerSession(authOptions);
