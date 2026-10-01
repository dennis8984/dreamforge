import Link from 'next/link';

const COLUMNS = [
  {
    heading: 'Features',
    links: [
      { href: '/chat', label: 'Chat' },
      { href: '/characters', label: 'Create Character' },
      { href: '/gallery', label: 'Gallery' },
      { href: '/characters', label: 'My AI' },
    ],
  },
  {
    heading: 'Popular',
    links: [
      { href: '/', label: 'DreamForge' },
      { href: '/ai-girlfriend', label: 'AI Girlfriend' },
      { href: '/ai-anime', label: 'AI Anime' },
      { href: '/ai-boyfriend', label: 'AI Boyfriend' },
    ],
  },
  {
    heading: 'Legal & Support',
    links: [
      { href: '/legal-information', label: 'Terms and Policies' },
      { href: '/help', label: 'Help Center' },
    ],
  },
  {
    heading: 'Company',
    links: [{ href: '/careers', label: "We're hiring" }],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#121214] border-t border-white/5 text-white">
      <div className="max-w-[1200px] mx-auto px-6 py-10 grid gap-10 lg:grid-cols-[1.1fr_1.4fr]">
        <div>
          <Link href="/" className="text-[22px] font-semibold tracking-tight">
            dream<span className="text-[#ff4d8d]">forge</span>
          </Link>
          <p className="mt-3 text-sm text-[#d1d1d1] max-w-sm leading-6">
            English
          </p>
          <p className="mt-4 text-sm text-[#bdbdbd] leading-6 max-w-md">
            DreamForge is a private companion studio for adults 21 and older. Chat, make a still, then turn that still into a five-second clip.
          </p>
          <p className="mt-6 text-sm font-medium text-[#d1d1d1]">Contacts:</p>
          <p className="mt-2 text-sm text-[#bdbdbd] leading-6 max-w-sm">
            Support: support@dreamforge.app. Card payments are processed by Stripe.
          </p>
          <p className="mt-6 text-xs text-[#8d8d8d]">
            © {new Date().getFullYear()} DreamForge. All Rights Reserved
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <p className="text-sm text-[#9a9a9a] mb-3">{column.heading}</p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm font-medium text-white hover:text-[#ff4d8d]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {column.heading === 'Legal & Support' && (
                <div className="mt-8">
                  <p className="text-sm text-[#9a9a9a] mb-3">Social</p>
                  <ul className="space-y-2.5">
                    <li>
                      <Link href="/contact" className="text-sm font-medium text-white hover:text-[#ff4d8d]">
                        Discord
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className="text-sm font-medium text-white hover:text-[#ff4d8d]">
                        X
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
