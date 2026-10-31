import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delivery Partner Portal",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
