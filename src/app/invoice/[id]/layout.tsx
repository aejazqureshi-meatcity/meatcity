import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Invoice",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function InvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
