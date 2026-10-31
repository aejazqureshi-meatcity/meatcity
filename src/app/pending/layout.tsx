import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Status",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PendingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
