import { notFound, redirect } from 'next/navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { MISSION_CONTROL_HOME_PATH, isAdminSection } from '@/lib/admin-routes';

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const { section } = await params;

  if (!isAdminSection(section)) notFound();
  if (section.length === 1 && section[0] === 'mission-control') {
    redirect(MISSION_CONTROL_HOME_PATH);
  }

  return <AdminDashboard />;
}
