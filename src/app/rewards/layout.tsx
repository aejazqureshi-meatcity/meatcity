import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MeatCity Rewards & Loyalty Club",
  description: "Earn points on every fresh cut, collect digital stamps, and unlock exclusive discounts. Meat that matters.",
};

export default function RewardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
