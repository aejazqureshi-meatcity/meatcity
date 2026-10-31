import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Central Panel",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#050505] min-h-screen w-full text-white font-primary">
      {children}
    </div>
  );
}
