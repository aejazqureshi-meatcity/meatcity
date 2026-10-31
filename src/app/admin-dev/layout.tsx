import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dev Portal",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminDevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
