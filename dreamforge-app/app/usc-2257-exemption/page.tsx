import type { Metadata } from 'next';
import PolicyPage from '@/components/PolicyPage';

export const metadata: Metadata = {
  title: '18 U.S.C. 2257 Exemption · DreamForge',
  description: '18 U.S.C. 2257 Exemption for DreamForge.',
};

export default function Page() {
  return <PolicyPage slug="usc-2257-exemption" />;
}
