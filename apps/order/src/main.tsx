import '@tamagui/core/reset.css';
import './styles.css';

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import App from './app/app';

// GitHub Pages 404s a hard nav/refresh on /order/t/{code} (it only serves
// 404.html from the Pages site root, not this app's own dist/order/404.html
// — see docs-site/.vitepress/config.ts), so the root docs-site 404 page
// redirects here with the original path preserved in `redirect`. Restore it
// before the router's first render reads window.location.
const redirect = new URLSearchParams(window.location.search).get('redirect');
if (redirect) {
  window.history.replaceState({}, '', redirect);
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
