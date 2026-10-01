import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Content Removal Policy · DreamForge',
  description: 'Content Removal Policy for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="content-removal-policy" />;
}
