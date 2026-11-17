import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';
import { site } from '@/lib/site';
import '../globals.css';

export const metadata: Metadata = {
  title: { default: `${site.name}: typed iframe messaging`, template: `%s · ${site.name}` },
  description: site.tagline,
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="main">{children}</main>
        <footer className="footer">
          MIT · <a href={site.github}>GitHub</a> · <a href={site.npm}>npm</a>
        </footer>
      </body>
    </html>
  );
}
