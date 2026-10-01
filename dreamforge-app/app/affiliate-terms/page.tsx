import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Affiliate Terms · DreamForge',
  description: 'Affiliate Terms for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="affiliate-terms" />;
}
