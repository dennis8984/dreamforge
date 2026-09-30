import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth } from '@/lib/admin-auth';

const ADMIN_EMAIL = 'mnights@tutanota.com';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bypass auth in development for local testing
  if (process.env.NODE_ENV === 'development') {
    return <>{children}</>;
  }

  const headersList = await headers();
  const session = await adminAuth.api.getSession({
    headers: headersList,
  });

  if (!session?.user || session.user.email !== ADMIN_EMAIL) {
    redirect('/admin-login');
  }

  return <>{children}</>;
}
