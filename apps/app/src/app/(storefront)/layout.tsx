import type { Metadata } from "next";

import {
  Geist,
  Geist_Mono,
  Inter,
  Outfit,
  Plus_Jakarta_Sans,
  Roboto,
} from "next/font/google";

import { cn } from "@repo/theme-core/utils";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  description: "Multi-tenant storefront platform for Indonesian SMEs.",
  title: "Omset Digital",
};

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html
    className={cn(
      geistSans.variable,
      geistMono.variable,
      plusJakartaSans.variable,
      inter.variable,
      outfit.variable,
      roboto.variable,
      "h-full antialiased"
    )}
    lang="en"
  >
    <body className="flex min-h-full flex-col">{children}</body>
  </html>
);

export default RootLayout;
