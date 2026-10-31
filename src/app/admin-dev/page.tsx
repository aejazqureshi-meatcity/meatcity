import { notFound } from 'next/navigation';
import AdminDashboard from '../admin/page';

export default function AdminDevPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <AdminDashboard />;
}
