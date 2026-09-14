import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";

const displayFont = localFont({
  src: [
    { path: "../../public/fonts/CormorantGaramond-Variable.ttf", weight: "300 700", style: "normal" },
    { path: "../../public/fonts/CormorantGaramond-Italic-Variable.ttf", weight: "300 700", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});
const uiFont = localFont({
  src: [
    { path: "../../public/fonts/Montserrat-Variable.ttf", weight: "100 900", style: "normal" },
    { path: "../../public/fonts/Montserrat-Italic-Variable.ttf", weight: "100 900", style: "italic" },
  ],
  variable: "--font-montserrat",
  display: "swap",
});
const impactFont = localFont({
  src: "../../public/fonts/BebasNeue-Regular.ttf",
  weight: "400",
  variable: "--font-bebas-neue",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Forms Portal | PRIME Philippines",
  icons: { icon: "/prime-icon.png", apple: "/prime-icon.png" },
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
      className={`${displayFont.variable} ${uiFont.variable} ${impactFont.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
