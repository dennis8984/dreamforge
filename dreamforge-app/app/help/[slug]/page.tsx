import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DocFrame from '@/components/DocFrame';
import { getHelpArticle, HELP_ARTICLES } from '@/lib/help-articles';

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  return { title: article ? `${article.title} · DreamForge Help` : 'Help · DreamForge' };
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  return (
    <DocFrame
      title={article.title}
      lede={article.lede}
      sections={article.sections}
      related={HELP_ARTICLES.filter((item) => item.slug !== slug).map((item) => ({
        href: `/help/${item.slug}`,
        label: item.title,
      }))}
    />
  );
}
