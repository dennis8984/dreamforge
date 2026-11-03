import { redirect } from 'next/navigation';
import { ADMIN_HOME_PATH } from '@/lib/admin-routes';

export default function AdminPage() {
  redirect(ADMIN_HOME_PATH);
}
