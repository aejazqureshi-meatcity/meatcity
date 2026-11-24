import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Details | MeatCity",
  description: "Fresh cuts, 100% Halal meat delivered fresh. Meat that matters.",
};

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
