import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories | MeatCity",
  description: "Browse farm-fresh chicken, mutton, seafood, eggs, and ready-to-cook meat cuts.",
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
