import path from 'node:path';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // Monorepo: let Turbopack see the workspace root (pnpm symlinks, root lockfile).
  turbopack: { root: path.resolve(process.cwd(), '../..') },
};

export default config;
