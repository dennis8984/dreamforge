import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Community Guidelines · DreamForge',
  description: 'Community Guidelines for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="community-guidelines" />;
}
