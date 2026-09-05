# TRD — Deploying `libs/ui` Storybook to Vercel

**Status:** implemented
**Scope:** `libs/ui` Storybook only — no app, API or CI behaviour changes

---

## 1. Summary

`libs/ui` Storybook builds and runs fine; nothing was fundamentally broken. Getting it onto
Vercel needed one shape change (the build output has to land inside the Vercel project's Root
Directory) plus a `vercel.json`, and the audit turned up four small runtime defects in the
stories themselves that were worth fixing before putting the site in front of people.

Everything below was verified by running the real build in a clean clone and driving the
resulting static site in headless Chromium: all 620 stories, then the manager UI.

## 2. What the audit found

|                                                               | Result                      |
| ------------------------------------------------------------- | --------------------------- |
| `npx nx run ui:build-storybook` from a clean `npm ci`         | passes, ~50 s, 27 MB output |
| Needs `api-contract:generate:ts` (and therefore Java/Go)?     | **no** — see §3.1           |
| Stories that fail to render                                   | 0 of 620                    |
| Manager UI, sidebar, deep links, theme toggle, viewport addon | all work                    |
| Genuine runtime defects                                       | 4, all fixed here — see §5  |

## 3. Deployment design

### 3.1 The build needs nothing but `npm ci`

`apps/order/vercel.json` has to download a Go toolchain and run `api-contract:generate:go`
because the order app's build reaches into `libs/api-contract`. Storybook does not: no story's
import graph reaches `libs/ui/src/data`, so `@gatherloop-pos/api-contract` is never pulled into
the bundle. This was confirmed empirically — the build succeeds in a clone where
`libs/api-contract/src/__generated__/ts` does not exist at all (it is gitignored, so that is
exactly the state Vercel builds in).

The consequence to remember: the Storybook bundle can only ever contain presentation, domain
and utils code. A story that imports from `libs/ui/src/data` will break the Vercel build, and
the failure will look like an unresolved `@gatherloop-pos/api-contract`.

### 3.2 Output has to land inside `libs/ui`

Vercel resolves `outputDirectory` relative to the project's Root Directory and will not follow
`../..` out of it. With Root Directory set to `libs/ui`, the workspace-level `dist/storybook/ui`
is unreachable.

Rather than move the default output (which would break the Nx convention every other target
follows), `build-storybook` now takes the directory as an argument:

```jsonc
// libs/ui/project.json
"build-storybook": {
  "command": "storybook build -c libs/ui/.storybook -o {args.outputDir}",
  "options": { "outputDir": "dist/storybook/ui" }
}
```

Local behaviour is unchanged — `npx nx run ui:build-storybook` still writes to
`dist/storybook/ui`. Vercel passes `--outputDir=libs/ui/storybook-static`.

That path is ignored in three places, all of which matter:

- `.gitignore` — it is build output.
- `libs/ui/.eslintignore` — `ui:lint` runs `eslint .` with `libs/ui` as its working directory,
  so without this it walks the minified bundles (~13 000 spurious errors).
- `.prettierignore` — same reason.

### 3.3 `.storybook/main.ts` must stay CommonJS

Storybook loads `main.ts` through this, in `@storybook/core`:

```js
if (!require('module')._extensions['.ts']) {
  /* register esbuild-register, format: "cjs" */
}
const config = require(mainFile);
```

So on a Node without native TypeScript support it compiles the file to CommonJS, and on a Node
_with_ it, it does not — Node loads the file itself, decides the format by looking for ESM syntax
after stripping types, and an `import`/`export` statement makes it an ES module. `main.ts` cannot
survive that: it uses `__dirname` and `require.resolve`, neither of which exists in module scope.
Newer Node gave one report of

```
ReferenceError: __dirname is not defined in ES module scope
```

and, on another version, something worse than a crash — a silently wrong `__dirname` pointing at
the process cwd, so every alias resolved to a path that does not exist.

The file is therefore written so no ESM syntax survives type-stripping: `import type` (erased
entirely), `require.resolve` for the mock and package paths, and `module.exports` at the end. That
is the property to preserve — adding a plain `import` or `export` to this file re-breaks it on
exactly the Node versions that have native TypeScript support, and quite possibly not on yours.

### 3.4 `libs/ui/vercel.json`

```json
{
  "installCommand": "cd ../.. && npm ci",
  "buildCommand": "cd ../.. && npx nx run ui:build-storybook --outputDir=libs/ui/storybook-static",
  "outputDirectory": "storybook-static",
  "framework": null
}
```

`installCommand` climbs to the workspace root because that is where the lockfile lives; this
mirrors `apps/order/vercel.json`. `framework: null` stops Vercel from guessing Next.js from the
monorepo's dependencies. `github.silent` keeps the bot from commenting on every PR.

### 3.5 Vercel project settings (done in the dashboard, not in this repo)

1. New project from this repository, separate from the order app's project.
2. **Root Directory** → `libs/ui`. Everything else comes from `vercel.json`.
3. **Node.js Version** → 22.x. There is no `engines.node` in the root `package.json`, so Vercel
   picks its own default; pin it so a Vercel-side default change cannot move the build out from
   under us. (Verified on Node 22 and Node 24; CI uses Node 20.)
4. Storybook is a component gallery of unreleased UI — decide deliberately whether it is public
   or behind Vercel Authentication.

Optional: an Ignored Build Step of `git diff --quiet HEAD^ HEAD -- libs/ui` skips deploys for
commits that do not touch the library. Left off by default because it misbehaves on the first
deploy and on shallow clones.

## 4. Things that look like breakage but are not

- **Blocked placeholder images.** 57 stories load `https://picsum.photos` or
  `https://placehold.jp` thumbnails from `.storybook/mocks/mockData.ts`. These fail in a
  sandboxed/offline browser and are fine on a deployed site, since the viewer's own browser
  fetches them. They are still a third-party dependency in a page we host; inlining a data-URI
  placeholder would remove it.
- **`favicon.ico` 404** when serving the output with a bare static server. Storybook ships
  `favicon.svg`; Vercel's own 404 handling covers the rest.
- **Webpack asset-size warnings.** The preview entrypoint is ~1.85 MB. Expected for a Tamagui +
  React Native Web bundle, and not worth chasing for an internal gallery.
- **No Docs pages.** No story sets `tags: ['autodocs']`, so `?path=/docs/...` URLs legitimately
  report "couldn't find story". Enabling autodocs is a separate decision.

## 5. Defects fixed alongside

Both classes were only visible at runtime, which is why the existing Jest suite did not catch
them.

**Indexed access prop types break Storybook's docgen.** `react-docgen` cannot resolve
`Transaction['transactionItems']`; it emits a prop node with no `elements`, and Storybook's
argTypes conversion then throws `Cannot read properties of undefined (reading 'map')`. The
result was a console error on every story of the affected component plus half-rendered Controls
(fields with no value and a red border). Affected 12 stories across `TransactionDetail`,
`TransactionPrintCustomer`, `TransactionPrintEmployee` and `ExpenseListScreen`. Fixed by
spelling the props as the named array types they already are — `TransactionItem[]`,
`TransactionCoupon[]`, `Wallet[]`, `Budget[]`.

An indexed access to a _union of object literals_ (`ExpenseListProps['variant']`, and the same
pattern across ~20 screens) resolves fine and was left alone. Only arrays of object types trip
this.

**`play` functions racing the viewport addon.** Four compact-layout stories set
`parameters.viewport.defaultViewport: 'mobile'` and then click a control that only exists below
800px. Storybook applies that viewport by resizing the preview iframe _after_ `play` starts, so
`canvas.getByText(/View Cart/)` ran at full width and threw. Switching to `findByText` lets the
query retry across the resize. One of the four also had a stale selector (`Add Coupon` for a
button labelled `Apply Coupon`) and queried `canvasElement` for content that Tamagui renders in
a portal outside it — now `screen.findByRole`.

## 6. Verification

From a clean clone (`npm ci`, no codegen):

```bash
npx nx run ui:build-storybook --outputDir=libs/ui/storybook-static  # the Vercel build command
npx nx run ui:lint    # 0 errors
npx nx run ui:test    # 165 suites, 1230 tests
```

The build was run on both Node 22 and Node 24 — the two sides of the `main.ts` loader split in
§3.3 — and produces 620 stories on each.

The built site was then served statically and driven in headless Chromium: every one of the 620
stories rendered with no page error, no Storybook error overlay and no empty root, and the four
`play`-driven stories were re-checked through the manager UI (where the viewport addon actually
applies) and reach their intended state.

Those four are the one case where a bare `iframe.html` check disagrees with the manager: loaded
directly at desktop width, nothing applies their `mobile` viewport, so the control their `play`
clicks genuinely is not on the page and the interaction fails. They pass at 375px and through the
manager. A sweep that opens `iframe.html` directly should either size the viewport to match or
expect those four to fail — and it has to wait past the 1 s `findBy*` timeout before reading the
console, or it will record a pass that has not happened yet.
