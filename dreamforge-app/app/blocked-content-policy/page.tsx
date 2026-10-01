import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Blocked Content Policy · DreamForge',
  description: 'Blocked Content Policy for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="blocked-content-policy" />;
}
