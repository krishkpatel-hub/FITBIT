import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const frontendRequire = createRequire(new URL('../../frontend/package.json', import.meta.url));
const React = frontendRequire('react');
const { renderToStaticMarkup } = frontendRequire('react-dom/server');
const { createServer } = await import(frontendRequire.resolve('vite'));

test('first-time Coach renders a bounded multiline composer and three suggestions', async () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  const vite = await createServer({
    root: new URL('../../frontend/', import.meta.url).pathname,
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
  });
  try {
    const { default: Coach } = await vite.ssrLoadModule('/src/pages/Coach/Coach.jsx');
    const { AuthProvider } = await vite.ssrLoadModule('/src/context/AuthContext.jsx');
    const html = renderToStaticMarkup(React.createElement(AuthProvider, null, React.createElement(Coach)));
    assert.match(html, /What would you like to know about your training\?/);
    assert.match(html, /<textarea[^>]*id="coach-message"/);
    assert.match(html, /aria-label="Suggested questions"/);
    assert.equal((html.match(/class="btn-secondary text-left"/g) || []).length, 3);
    assert.doesNotMatch(html, /Priority Insights|Plateau Warning|Strength Progress/);
  } finally {
    await vite.close();
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
