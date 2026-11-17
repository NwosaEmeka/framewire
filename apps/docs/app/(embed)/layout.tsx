import '../globals.css';

/** Bare layout for embedded pages: no site chrome, transparent background. */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="embed">{children}</body>
    </html>
  );
}
