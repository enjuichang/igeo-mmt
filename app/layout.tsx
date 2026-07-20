import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: "GeoLens — iGEO MMT Practice Generator",
    description: "Generate source-verified, visual geography practice inspired by the iGEO Multimedia Test.",
    openGraph: {
      title: "GeoLens — Read the world. Question the evidence.",
      description: "A source-aware iGEO MMT practice generator built with Gapminder, Worldmapper and open geographic data.",
      type: "website",
      images: [{ url: socialImage, width: 1731, height: 909, alt: "GeoLens — Read the world. Question the evidence." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "GeoLens — iGEO MMT Practice Generator",
      description: "Source-verified visual geography practice.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
