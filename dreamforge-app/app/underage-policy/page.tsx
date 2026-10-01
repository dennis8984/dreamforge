import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: 'Underage Policy · DreamForge',
  description: 'Underage Policy for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="underage-policy" />;
}
