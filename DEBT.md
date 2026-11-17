# DEBT

Deferred work, known issues and intentional shortcuts. Entries are numbered
`DEBT-NN`, never deleted or renumbered; resolved entries are marked `RESOLVED`.

## DEBT-01: `index` entry has 23 B of size headroom

Status: OPEN
Found in: spec-02
Description: The `index` entry (host + frame together) is 3049 / 3072 B gzipped, even after error messages were shortened in spec 02 to get under budget. The next feature added to the core will push it over, and `pnpm size` fails CI.
Resolution path: Either drop `index` from the budget (consumers import `framewire/host` or `framewire/frame`, both ~2.4 KB), shave `bridge.ts` further, or raise the budget for the combined entry only.

## DEBT-02: Package build script is not portable to Windows

Status: OPEN
Found in: spec-02
Description: `packages/framewire` builds with `rm -rf dist && tsup`. `rm -rf` fails in Windows shells (cmd/PowerShell), so contributors on Windows can't build. CI is Linux-only, so nothing catches it.
Resolution path: Use tsup's `clean: true` on the first config only (ensuring the IIFE config doesn't race it), or replace `rm -rf` with `node -e "fs.rmSync('dist',{recursive:true,force:true})"`.
