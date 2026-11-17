/* global framewire */
// Shared by index.html and return.html. Served on :3000 (allowed) and :5100 (foreign).
const params = new URLSearchParams(location.search);
const iframe = document.getElementById('widget');
iframe.src = 'http://localhost:4000/';

const bridge = framewire.createHost({
  iframe,
  origin: 'http://localhost:4000',
  resize: { maxHeight: 600 },
  navigation: params.get('nav') !== '0',
  handshakeTimeout: 3000,
  timeout: 2000,
});
bridge.handle('add', ({ a, b }) => a + b);
window.bridge = bridge;

const status = document.getElementById('status');
bridge.ready.then(
  () => (status.textContent = 'ready'),
  (error) => (status.textContent = `failed:${error.code}`),
);
