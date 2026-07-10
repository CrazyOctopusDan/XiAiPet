# XiAiPet Official Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium, single-page XiAiPet brand website that loads real published product images, presents the supplied mini-program QR code, and has graceful Canvas-driven interaction.

**Architecture:** The new `apps/official-website` workspace is a Vite static site written in TypeScript. A small catalog client requests the existing public product-summary endpoint through a same-origin `/api` proxy. Rendering, Canvas behavior, and data mapping remain separate so product failures never block the brand message or QR call to action.

**Tech Stack:** TypeScript 5, Vite 7, Vitest 3, happy-dom, native Canvas 2D, CSS custom properties, Nginx static-file and API reverse proxy.

## Global Constraints

- Keep the website in `apps/official-website/`; do not modify customer mini-program screens, order APIs, or commerce logic.
- Use the customer mini-program core colors: `#F9F1C7`, `#FFFBEA`, `#40535C`, and `#D9A15B`.
- Do not call `/api/v1/customer/orders`; product imagery comes only from `GET /api/v1/customer/catalog/products` and each product's `thumbnail`.
- Render the supplied `assets/miniapp-home-qr.png` in the final call-to-action, with useful alt text.
- Do not invent certification claims, reviews, prices, contact details, operating hours, or product availability.
- Canvas animation is decorative only and must obey `prefers-reduced-motion`.
- No gradient text, generic glass cards, faux statistics, purple glow, or cartoon-pet template styling.

---

### Task 1: Add an isolated website workspace and baseline page shell

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `apps/official-website/package.json`
- Create: `apps/official-website/tsconfig.json`
- Create: `apps/official-website/vite.config.ts`
- Create: `apps/official-website/index.html`
- Create: `apps/official-website/src/main.ts`
- Create: `apps/official-website/src/styles.css`
- Create: `apps/official-website/src/main.test.ts`

**Interfaces:**
- Produces `#app` as the only static mount point and the `pnpm --filter @xiaipet/official-website dev|build|test|typecheck` commands.
- Later tasks mount the page with `renderWebsite(root: HTMLElement): void`.

- [ ] **Step 1: Write the failing shell test.**

```ts
import { beforeEach, expect, test } from 'vitest';
import { renderWebsite } from './main';

beforeEach(() => { document.body.innerHTML = '<main id="app"></main>'; });

test('renders a readable hero and the mini-program QR action', () => {
  renderWebsite(document.querySelector<HTMLElement>('#app')!);
  expect(document.querySelector('h1')?.textContent).toContain('认真准备');
  expect(document.querySelector('img[src$="miniapp-home-qr.png"]')?.getAttribute('alt')).toContain('小程序');
});
```

- [ ] **Step 2: Run the test and confirm it fails because `src/main.ts` does not exist.**

Run: `pnpm --filter @xiaipet/official-website test -- src/main.test.ts`
Expected: FAIL with a missing module or missing workspace error.

- [ ] **Step 3: Create the workspace and minimal renderer.**

```json
// apps/official-website/package.json
{
  "name": "@xiaipet/official-website",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --environment happy-dom"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "happy-dom": "^18.0.0",
    "typescript": "^5.8.3",
    "vite": "^7.3.2",
    "vitest": "^3.2.4"
  }
}
```

```json
// apps/official-website/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src", "vite.config.ts", "vite.config.test.ts"]
}
```

Add `apps/official-website` to `pnpm-workspace.yaml`. Make `renderWebsite` set accessible semantic hero, `<canvas aria-hidden="true">`, page sections, and the QR image at `/assets/miniapp-home-qr.png`; import `styles.css` only from the Vite entry path.

- [ ] **Step 4: Run the focused test and typecheck.**

Run: `pnpm --filter @xiaipet/official-website test -- src/main.test.ts && pnpm --filter @xiaipet/official-website typecheck`
Expected: 1 passing test and zero TypeScript errors.

- [ ] **Step 5: Commit the workspace shell.**

```bash
git add pnpm-workspace.yaml apps/official-website
git commit -m "feat: scaffold XiAiPet official website"
```

### Task 2: Fetch public catalog thumbnails with safe failure handling

**Files:**
- Create: `apps/official-website/src/catalog.ts`
- Create: `apps/official-website/src/catalog.test.ts`
- Modify: `apps/official-website/src/main.ts`

**Interfaces:**
- Consumes `GET /api/v1/customer/catalog/products` with no customer credentials.
- Produces `loadCatalog(fetcher?: typeof fetch): Promise<CatalogProduct[]>` where `CatalogProduct` is `{ id: string; name: string; summary: string; thumbnail: string }`.
- `renderWebsite` consumes `loadCatalog` but renders its primary content before the request settles.

- [ ] **Step 1: Write failing catalog-client tests.**

```ts
import { expect, test, vi } from 'vitest';
import { loadCatalog } from './catalog';

test('keeps published products with a usable thumbnail', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
    ok: true,
    products: [
      { id: 'cake-1', name: '生日蛋糕', summary: '现制', thumbnail: 'https://assets.example/cake.jpg' },
      { id: 'cake-2', name: '无图商品', summary: '', thumbnail: '' }
    ]
  })));
  await expect(loadCatalog(fetcher)).resolves.toEqual([
    { id: 'cake-1', name: '生日蛋糕', summary: '现制', thumbnail: 'https://assets.example/cake.jpg' }
  ]);
  expect(fetcher).toHaveBeenCalledWith('/api/v1/customer/catalog/products', { headers: { Accept: 'application/json' } });
});

test('returns an empty collection when the public catalog request fails', async () => {
  await expect(loadCatalog(vi.fn().mockRejectedValue(new Error('offline')))).resolves.toEqual([]);
});
```

- [ ] **Step 2: Run the tests and confirm they fail because `loadCatalog` is absent.**

Run: `pnpm --filter @xiaipet/official-website test -- src/catalog.test.ts`
Expected: FAIL with a missing `loadCatalog` export.

- [ ] **Step 3: Implement the narrow API mapper and page states.**

```ts
export async function loadCatalog(fetcher: typeof fetch = fetch): Promise<CatalogProduct[]> {
  try {
    const response = await fetcher('/api/v1/customer/catalog/products', { headers: { Accept: 'application/json' } });
    if (!response.ok) return [];
    const payload: unknown = await response.json();
    const products = isRecord(payload) && Array.isArray(payload.products) ? payload.products : [];
    return products.flatMap(toCatalogProduct);
  } catch {
    return [];
  }
}
```

Render a loading status while awaiting the request, a neutral empty message if it returns no image-bearing products, and a product rail only for validated products. Do not render price, stock, member-level, order, or customer data.

- [ ] **Step 4: Run catalog and shell tests.**

Run: `pnpm --filter @xiaipet/official-website test -- src/catalog.test.ts src/main.test.ts`
Expected: all focused tests pass.

- [ ] **Step 5: Commit the public catalog integration.**

```bash
git add apps/official-website/src/catalog.ts apps/official-website/src/catalog.test.ts apps/official-website/src/main.ts
git commit -m "feat: load official website product imagery"
```

### Task 3: Build a responsive, reduced-motion-safe Canvas hero engine

**Files:**
- Create: `apps/official-website/src/hero-canvas.ts`
- Create: `apps/official-website/src/hero-canvas.test.ts`
- Modify: `apps/official-website/src/main.ts`
- Modify: `apps/official-website/src/styles.css`

**Interfaces:**
- Produces `mountHeroCanvas(canvas: HTMLCanvasElement): () => void`.
- The returned cleanup function removes event listeners and cancels the animation frame.
- `renderWebsite` calls `mountHeroCanvas` only when reduced motion is not preferred.

- [ ] **Step 1: Write failing pure-motion tests.**

```ts
import { expect, test } from 'vitest';
import { pointerForce } from './hero-canvas';

test('moves a nearby particle away from the pointer with bounded force', () => {
  expect(pointerForce({ x: 12, y: 10 }, { x: 10, y: 10 })).toEqual({ x: 0.18, y: 0 });
});

test('does not move particles outside the interaction radius', () => {
  expect(pointerForce({ x: 500, y: 500 }, { x: 10, y: 10 })).toEqual({ x: 0, y: 0 });
});
```

- [ ] **Step 2: Run the test and confirm it fails because `pointerForce` is absent.**

Run: `pnpm --filter @xiaipet/official-website test -- src/hero-canvas.test.ts`
Expected: FAIL with a missing `pointerForce` export.

- [ ] **Step 3: Implement a DPR-capped Canvas engine.**

Implement `pointerForce` with a 140px radius and 0.18 maximum force. `mountHeroCanvas` must cap device pixel ratio at 2, use at most 52 particles on desktop and 28 below 640px, animate only Canvas drawing, and make click events create a short-lived ring of warm-gold particles. Use `ResizeObserver`, `requestAnimationFrame`, and the cleanup return contract.

- [ ] **Step 4: Add the CSS fallback.**

Place the canvas behind hero copy, add a static grain texture at opacity `0.025`, and make `@media (prefers-reduced-motion: reduce)` hide the canvas while retaining the hero composition. The hero must remain readable when JavaScript is disabled.

- [ ] **Step 5: Run the Canvas and existing focused tests.**

Run: `pnpm --filter @xiaipet/official-website test -- src/hero-canvas.test.ts src/catalog.test.ts src/main.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Commit the interaction engine.**

```bash
git add apps/official-website/src/hero-canvas.ts apps/official-website/src/hero-canvas.test.ts apps/official-website/src/main.ts apps/official-website/src/styles.css
git commit -m "feat: add interactive official website hero"
```

### Task 4: Compose the premium visual system and page interactions

**Files:**
- Create: `apps/official-website/src/content.ts`
- Create: `apps/official-website/src/interactions.ts`
- Create: `apps/official-website/src/interactions.test.ts`
- Modify: `apps/official-website/src/main.ts`
- Modify: `apps/official-website/src/styles.css`

**Interfaces:**
- `content.ts` exports only factual, non-numeric copy for the three approved themes.
- `wireStoryTabs(root: ParentNode): () => void` controls buttons marked `[data-story-tab]` and panels marked `[data-story-panel]`.
- The product rail uses `CatalogProduct[]` from Task 2.

- [ ] **Step 1: Write failing tab-interaction tests.**

```ts
import { expect, test } from 'vitest';
import { wireStoryTabs } from './interactions';

test('selects the requested story tab and hides the other panels', () => {
  document.body.innerHTML = `
    <button data-story-tab="celebrate" aria-selected="false">生日庆祝</button>
    <section data-story-panel="celebrate" hidden>为重要日子准备</section>
    <section data-story-panel="care">看得见的配料</section>`;
  wireStoryTabs(document);
  document.querySelector<HTMLButtonElement>('[data-story-tab="celebrate"]')!.click();
  expect(document.querySelector('[data-story-panel="celebrate"]')?.hasAttribute('hidden')).toBe(false);
  expect(document.querySelector('[data-story-tab="celebrate"]')?.getAttribute('aria-selected')).toBe('true');
});
```

- [ ] **Step 2: Run the test and confirm it fails because `wireStoryTabs` is absent.**

Run: `pnpm --filter @xiaipet/official-website test -- src/interactions.test.ts`
Expected: FAIL with a missing `wireStoryTabs` export.

- [ ] **Step 3: Implement the composition.**

Render seven visual families: compact nav, photographic hero, asymmetric trust grid, three-theme story tabs, real product rail, an explicit three-step service sequence, and QR finale. Use an 1180px content width, generous asymmetric sections, 1px translucent slate borders, `clamp()` headings with tight tracking, and no repeated six-card grid. Add hover and focus elevation only through `transform` and `box-shadow`.

- [ ] **Step 4: Implement accessible tabs and product focus.**

Make story controls native buttons with `aria-selected`, arrow-key switching, and focus transfer. Product cards must be keyboard-focusable and never use hover as the only way to reveal product names. The mobile rail must scroll horizontally with `scroll-snap-type: x mandatory` and 44px targets.

- [ ] **Step 5: Run all website tests and build.**

Run: `pnpm --filter @xiaipet/official-website test && pnpm --filter @xiaipet/official-website build`
Expected: all tests pass and `apps/official-website/dist/` is emitted.

- [ ] **Step 6: Commit the complete visual page.**

```bash
git add apps/official-website/src
git commit -m "feat: build XiAiPet premium brand page"
```

### Task 5: Make local development and same-origin deployment reproducible

**Files:**
- Create: `apps/official-website/deploy/nginx.conf.example`
- Create: `apps/official-website/.env.example`
- Modify: `apps/official-website/vite.config.ts`
- Create: `apps/official-website/vite.config.test.ts`
- Modify: `apps/official-website/README.md`

**Interfaces:**
- Local `vite` development proxies `/api` through `VITE_API_PROXY_TARGET`.
- Production Nginx serves `dist/` and proxies `/api/` to the API's existing host listener at `127.0.0.1:3000`.

- [ ] **Step 1: Write a failing configuration test.**

```ts
import { expect, test } from 'vitest';
import config from '../vite.config';

test('keeps catalog calls on the same-origin api prefix', () => {
  const resolved = config({ command: 'serve', mode: 'development' });
  expect(resolved.server?.proxy?.['/api']).toBeDefined();
});
```

- [ ] **Step 2: Run it and confirm it fails before proxy configuration exists.**

Run: `pnpm --filter @xiaipet/official-website test -- vite.config.test.ts`
Expected: FAIL because the Vite config or `/api` proxy is missing.

- [ ] **Step 3: Add proxy and Nginx configuration.**

```ts
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return { server: { proxy: { '/api': { target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000', changeOrigin: true } } } };
});
```

Set the Nginx `root` to the built `dist` directory, use `try_files $uri $uri/ /index.html`, and proxy `/api/` to `http://127.0.0.1:3000`. Document `pnpm install`, local API target setup, `pnpm --filter @xiaipet/official-website dev`, `build`, and `dist` upload steps. Do not add server credentials or private domains to tracked files.

- [ ] **Step 4: Run configuration test, full tests, typecheck, and production build.**

Run: `pnpm --filter @xiaipet/official-website test && pnpm --filter @xiaipet/official-website typecheck && pnpm --filter @xiaipet/official-website build`
Expected: all tests pass, no type errors, and an upload-ready `dist/` directory.

- [ ] **Step 5: Commit the deployment handoff.**

```bash
git add apps/official-website
git commit -m "docs: add official website deployment handoff"
```

## Plan Self-Review

- Spec coverage: Tasks 1 and 4 cover the premium one-page composition and QR CTA; Task 2 covers only public product thumbnails; Task 3 covers Canvas and reduced motion; Task 5 covers same-origin deployment.
- Privacy boundary: no task reads or exposes the authenticated customer order endpoint.
- Accessibility: tasks require semantic content, keyboard interactions, focus states, mobile targets, and motion reduction.
- Placeholder scan: no unresolved product, API, deployment, or visual decision remains in this plan.
