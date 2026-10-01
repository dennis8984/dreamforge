import type { Metadata } from 'next';
import CastArticle from '@/components/CastArticle';
import { getCastPage } from '@/lib/cast-pages';

const page = getCastPage('ai-boyfriend')!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description,
};

export default function AiBoyfriendPage() {
  return <CastArticle page={page} />;
}
