import type { Metadata } from "next";
import "./globals.css";
import ThemeWrapper from "@/components/ThemeWrapper";

export const metadata: Metadata = {
  title: "Meat City | Meat That Matters",
  description: "Premium Halal Chicken and Mutton Delivery in Turbhe, Navi Mumbai.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#F8F9FA] min-h-screen">
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  );
}
