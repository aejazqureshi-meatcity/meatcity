import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | MeatCity Navi Mumbai - Quality Halal Meat",
  description:
    "Learn about MeatCity in Turbhe, Navi Mumbai. FSSAI certified retail outlet (Reg No. 21525016001365) providing fresh, hygienic, and 100% halal chicken, mutton, and eggs.",
  alternates: {
    canonical: "https://meatcity.in/about",
  },
  openGraph: {
    title: "About Us | MeatCity Navi Mumbai - Quality Halal Meat",
    description:
      "Learn about MeatCity in Turbhe, Navi Mumbai. FSSAI certified retail outlet (Reg No. 21525016001365) providing fresh, hygienic, and 100% halal chicken, mutton, and eggs.",
    url: "https://meatcity.in/about",
    siteName: "MeatCity",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1920,
        height: 1280,
        alt: "About MeatCity - Fresh Meat in Navi Mumbai",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us | MeatCity Navi Mumbai - Quality Halal Meat",
    description:
      "Learn about MeatCity in Turbhe, Navi Mumbai. FSSAI certified retail outlet (Reg No. 21525016001365) providing fresh, hygienic, and 100% halal chicken, mutton, and eggs.",
    images: ["/og-image.png"],
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": "https://meatcity.in/about#aboutpage",
  "url": "https://meatcity.in/about",
  "name": "About MeatCity",
  "description":
    "MeatCity is committed to delivering fresh, hygienic and premium quality meat products directly to homes and businesses in Navi Mumbai.",
  "mainEntity": {
    "@type": "LocalBusiness",
    "name": "MeatCity",
    "url": "https://meatcity.in",
    "telephone": "+91-7977630912",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "A/2 Room No.126, Shop No.2, Sector 20, Turbhe",
      "addressLocality": "Navi Mumbai",
      "addressRegion": "Maharashtra",
      "postalCode": "400705",
      "addressCountry": "IN",
    },
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      {children}
    </>
  );
}
