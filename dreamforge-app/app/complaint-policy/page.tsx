import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Complaint Policy · DreamForge',
  description: 'Complaint Policy for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="complaint-policy" />;
}
