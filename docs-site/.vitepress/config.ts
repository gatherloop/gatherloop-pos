import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Gatherloop POS',
  description: 'Feature documentation for Gatherloop POS',
  base: '/gatherloop-pos/',

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
  },
});
