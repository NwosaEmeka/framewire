# framewire

## 0.1.0

### Minor Changes

- First release.

  - `createHost` / `createFrame` with typed `emit`, `on`, `handle` and `request`, sharing one contract type
  - Versioned handshake (protocol v1) that works whichever side loads first
  - Strict origin and source checks; wildcards rejected; nothing sent to `*` after the handshake
  - Request timeouts and typed errors (`TIMEOUT`, `NO_HANDLER`, `REMOTE_ERROR`, …)
  - Auto-resize via `ResizeObserver` with `minHeight` / `maxHeight`
  - `navigateTop`, `returnUrl` and `onResume` for payment and OAuth flows (host opt-in)
  - Script-tag builds: `framewire.global.js` (loader) and `framewire.frame.global.js`
  - Under 3 KB min+gzip per entry
