import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Notice · DreamForge',
  description: 'Privacy Notice for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="privacy-policy" />;
}
