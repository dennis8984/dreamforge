import { notFound } from 'next/navigation';
import DocFrame from './DocFrame';
import { getPolicy, POLICIES } from '@/lib/policies';

export default function PolicyPage({ slug }: { slug: string }) {
  const policy = getPolicy(slug);
  if (!policy) notFound();

  return (
    <DocFrame
      title={policy.title}
      lede={policy.lede}
      sections={policy.sections}
      related={POLICIES.filter((item) => item.slug !== slug).map((item) => ({
        href: `/${item.slug}`,
        label: item.title,
      }))}
    />
  );
}
