import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Terms of Service · DreamForge',
  description: 'Terms of Service for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="terms-of-service" />;
}
