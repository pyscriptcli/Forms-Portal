import type { Metadata } from "next";
import { Cormorant_Garamond, Bebas_Neue, Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Forms Portal",
  description: "Official Forms Portal & Request Tracker",
  openGraph: {
    title: "Forms Portal",
    description: "Official Forms Portal & Request Tracker",
    siteName: "Forms Portal",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forms Portal",
    description: "Official Forms Portal & Request Tracker",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${bebas.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans bg-[#f8fafc] text-[#0C0C0E]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
