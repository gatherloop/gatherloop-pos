import { defineConfig } from 'vitepress';

const title = 'Gatherloop POS';
const description =
  'A complete point of sale for coffee shops — sales, catalog, inventory, finance, and operations, in one product.';
const siteUrl = 'https://gatherloop.github.io/gatherloop-pos/';
const ogImage = `${siteUrl}og-image.png`;

// The customer order app moved off this Pages site onto its own Next.js
// host (docs/trd-order-app-nextjs-migration.md, D3/P6). Injected at build
// time (see .github/workflows/deploy-pages.yml) so the destination can move
// without a code change here. No trailing slash.
const orderAppBaseUrl = process.env.ORDER_APP_BASE_URL ?? '';

export default defineConfig({
  title,
  description,
  base: '/gatherloop-pos/',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/gatherloop-pos/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#0f172a' }],

    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: title }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:url', content: siteUrl }],
    ['meta', { property: 'og:image', content: ogImage }],

    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }],
    ['meta', { name: 'twitter:image', content: ogImage }],

    // The order app no longer lives on this Pages site (D3/P6 in
    // docs/trd-order-app-nextjs-migration.md) — it's a real Next.js host now,
    // so any /gatherloop-pos/order/** path is always a miss here and always
    // falls back to this Pages site's generated 404.html (GitHub Pages only
    // ever honors the 404.html at the site root). This script — present on
    // every page via global `head`, including that 404 page — catches that
    // case and redirects to the same path on the order app's own origin, so
    // already-printed QR codes (which still encode this old GitHub Pages
    // URL) keep working. Plain 404s outside /order/ fall through to
    // VitePress's normal not-found page.
    [
      'script',
      {},
      `(function () {
        var prefix = '/gatherloop-pos/order/';
        var target = ${JSON.stringify(orderAppBaseUrl)};
        var path = window.location.pathname;
        if (target && path.indexOf(prefix) === 0) {
          var suffix = path.slice(prefix.length) + window.location.search + window.location.hash;
          window.location.replace(target + '/' + suffix);
        }
      })();`,
    ],
  ],

  themeConfig: {
    nav: [
      { text: 'Overview', link: '/overview/what-is-gatherloop-pos' },
      { text: 'Under the Hood', link: '/under-the-hood/architecture' },
      { text: 'Roadmap', link: '/roadmap' },
    ],

    sidebar: [
      {
        text: 'Overview',
        items: [
          { text: 'What is Gatherloop POS', link: '/overview/what-is-gatherloop-pos' },
          { text: 'The Big Picture', link: '/overview/the-big-picture' },
          { text: "Who It's For", link: '/overview/who-its-for' },
        ],
      },
      {
        text: 'Sales & Checkout',
        items: [
          { text: 'Transactions', link: '/sales/transactions' },
          { text: 'Coupons', link: '/sales/coupons' },
          { text: 'Board-game Rentals', link: '/sales/rentals' },
          { text: 'Table Ordering', link: '/sales/table-ordering' },
        ],
      },
      {
        text: 'Catalog',
        items: [
          { text: 'Categories', link: '/catalog/categories' },
          { text: 'Products', link: '/catalog/products' },
          { text: 'Product Variants', link: '/catalog/variants' },
          { text: 'Materials', link: '/catalog/materials' },
        ],
      },
      {
        text: 'Inventory',
        items: [
          { text: 'Stock Checks', link: '/inventory/stock-checks' },
          { text: 'Purchase Lists', link: '/inventory/purchase-lists' },
          { text: 'Suppliers', link: '/inventory/suppliers' },
        ],
      },
      {
        text: 'Finance',
        items: [
          { text: 'Dashboard & Statistics', link: '/finance/dashboard-statistics' },
          { text: 'Expenses', link: '/finance/expenses' },
          { text: 'Budgets', link: '/finance/budgets' },
          { text: 'Wallets & Transfers', link: '/finance/wallets-transfers' },
          { text: 'Cash Count & Reconciliation', link: '/finance/calculations' },
        ],
      },
      {
        text: 'Operations',
        items: [
          { text: 'Operational Checklists', link: '/operations/checklists' },
          { text: 'Tickets', link: '/operations/tickets' },
        ],
      },
      {
        text: 'Under the Hood',
        items: [
          { text: 'Architecture at a Glance', link: '/under-the-hood/architecture' },
          { text: 'Tech Stack & Why', link: '/under-the-hood/tech-stack' },
          { text: 'Clean Architecture', link: '/under-the-hood/clean-architecture' },
          { text: 'Cross-Platform (Web + Mobile)', link: '/under-the-hood/cross-platform' },
          { text: 'Testing Strategy', link: '/under-the-hood/testing-strategy' },
        ],
      },
      {
        text: 'Roadmap',
        items: [{ text: 'Roadmap', link: '/roadmap' }],
      },
    ],

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/gatherloop/gatherloop-pos' },
    ],

    footer: {
      message: 'Built with VitePress. Content lives in <code>docs-site/</code> — see the README for how to run it locally.',
      copyright: 'Gatherloop POS — a real coffee shop\'s point of sale, open on GitHub.',
    },
  },
});
