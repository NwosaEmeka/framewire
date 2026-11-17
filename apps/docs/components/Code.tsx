import { codeToHtml } from 'shiki';

/** Syntax-highlighted code, rendered at build time (no client JS). */
export async function Code({ code, lang = 'ts' }: { code: string; lang?: string }) {
  const html = await codeToHtml(code.trim(), {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  });
  return <div className="code" dangerouslySetInnerHTML={{ __html: html }} />;
}
