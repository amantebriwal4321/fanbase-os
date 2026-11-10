import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Shell } from "@/components/shell";
import { getCurrentUser } from "@/server/auth";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Fanbase OS",
    template: "%s · Fanbase OS",
  },
  description:
    "Interest based fan communities. Members post ideas, vote, and collaborate. A filter drops spam, similar ideas cluster, and the creator gets a daily letter.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${fraunces.variable} antialiased`}>
        <Shell user={user}>{children}</Shell>
      </body>
    </html>
  );
}
