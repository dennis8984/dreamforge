import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'DMCA Policy · DreamForge',
  description: 'DMCA Policy for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="dmca-policy" />;
}
