import Link from 'next/link';
import { site } from '@/lib/site';

const links = [
  { href: '/docs/quick-start', label: 'Quick start' },
  { href: '/docs/api', label: 'API' },
  { href: '/docs/why-iframe', label: 'Why an iframe' },
  { href: '/demo', label: 'Demo' },
];

export function Nav() {
  return (
    <header className="nav">
      <Link href="/" className="brand">
        {site.name}
      </Link>
      <nav>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <a href={site.github}>GitHub</a>
      </nav>
    </header>
  );
}
