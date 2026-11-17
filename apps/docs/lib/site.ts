export const site = {
  name: 'framewire',
  tagline: 'Typed, tiny messaging between a host page and the iframe it embeds.',
  github: 'https://github.com/NwosaEmeka/framewire',
  npm: 'https://www.npmjs.com/package/framewire',
  cdn: 'https://cdn.jsdelivr.net/npm/framewire',
};

/** From `pnpm size` (minified + gzip). CI fails any entry over 3 KB. */
export const sizes = [
  { entry: 'framewire/host', kb: '2.38', note: 'host page' },
  { entry: 'framewire/frame', kb: '2.46', note: 'embedded page' },
  { entry: 'framewire', kb: '2.98', note: 'both sides' },
  { entry: 'framewire.global.js', kb: '2.76', note: 'script-tag loader (host)' },
  { entry: 'framewire.frame.global.js', kb: '2.49', note: 'script tag (frame)' },
];
