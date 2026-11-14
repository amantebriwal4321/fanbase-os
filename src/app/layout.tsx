import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteNav } from "@/components/nav";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Fanbase OS",
    template: "%s · Fanbase OS",
  },
  description: "Rhea Kapoor's link in bio. Join a community, pitch an idea, and see it land on her desk.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${fraunces.variable} antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteNav />
        <main id="main">{children}</main>
        <footer className="mx-auto max-w-5xl px-5 pb-12 text-sm leading-6 text-muted">
          <p>Fanbase OS is a working demo for Persist Startupathon.</p>
          <p>
            Repo:{" "}
            <a className="underline decoration-line underline-offset-4" href="https://github.com/amantebriwal4321/fanbase-os">
              github.com/amantebriwal4321/fanbase-os
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
