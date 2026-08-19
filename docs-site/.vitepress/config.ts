import { defineConfig } from 'vitepress';

const title = 'Gatherloop POS';
const description =
  'A complete point of sale for coffee shops — sales, catalog, inventory, finance, and operations, in one product.';
const siteUrl = 'https://gatherloop.github.io/gatherloop-pos/';
const ogImage = `${siteUrl}og-image.png`;

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

    // GitHub Pages only ever falls back to the 404.html at the Pages site
    // root (this docs-site's build) — it does not honor apps/order's own
    // dist/order/404.html for paths under a subdirectory. So a hard nav or
    // refresh on /gatherloop-pos/order/t/{code} lands here instead of in the
    // order app. This script (present on every page via global `head`,
    // including the generated 404 page) detects that case and redirects to
    // the order app's real index.html, preserving the original path in a
    // `redirect` param so apps/order/src/main.tsx can restore it before its
    // router reads window.location. Plain 404s outside /order/ fall through
    // to VitePress's normal not-found page.
    [
      'script',
      {},
      `(function () {
        var prefix = '/gatherloop-pos/order/';
        var path = window.location.pathname;
        if (path.indexOf(prefix) === 0) {
          var suffix = path + window.location.search + window.location.hash;
          window.location.replace(
            prefix + 'index.html?redirect=' + encodeURIComponent(suffix)
          );
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
