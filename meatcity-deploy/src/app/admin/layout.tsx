export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-[#050505] min-h-screen w-full text-white font-primary">
      {children}
    </div>
  );
}

