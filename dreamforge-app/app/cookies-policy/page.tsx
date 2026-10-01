import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Cookies Notice · DreamForge',
  description: 'Cookies Notice for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="cookies-policy" />;
}
