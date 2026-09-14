import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";

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
      className="h-full antialiased"
    >
      <body className="min-h-full font-sans bg-[#f8fafc] text-[#0C0C0E]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
