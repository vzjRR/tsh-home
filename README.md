# tsh87.com

The personal site of **Talal Al Ghafri** (`vzjRR`) — the work, the capabilities
behind it, a contact form and a newsletter.

> **Two standing rules, both enforced by the test suite.**
> **No source links** — the site never references a repository, a source host,
> or an internal surface such as an admin panel; only a finished, public
> deliverable may appear as a `liveUrl`.
> **English only** — no Arabic or other non-Latin script in the pages, the
> markup or the structured data.
> `scripts/qa.mjs` asserts both on every page, so a regression fails the suite
> rather than shipping.

---

## Stack, and why

| Choice | Reason |
| --- | --- |
| **Astro** (static output) | The pages are content. Astro ships them as HTML with no framework runtime, and its content model means new work — and later articles or case studies — is data rather than components. |
| **TypeScript** | The content model and the endpoints are typed, so a malformed entry fails the build instead of the page. |
| **Hand-authored CSS** with a token layer | A utility framework would have produced a generic result. The design system is six files, scoped per component by Astro. |
| **Cloudflare Worker (static assets) + D1** | The forms had to be real. One Worker serves the built `dist/` and answers the two form routes itself against a small D1 database — no third-party form service, no data leaving the account. |
| **No UI framework, no animation library, no icon package** | Behaviour is ~7 KB of TypeScript; icons are inline SVG. |
| **Self-hosted Geist / Geist Mono** | Latin subset, variable, 52 KB for both — no third-party font request on the critical path. |

Two runtime dependencies: `astro` and `@astrojs/sitemap`. Everything else is
dev-only.

Both pages score **100 across every Lighthouse category** — performance,
accessibility, best practices, SEO and agentic browsing — with ~10 KB of
gzipped CSS and a 0.4 s largest contentful paint.

---

## Commands

```bash
npm install
npm run dev        # Astro dev server — pages only, no endpoints
npm run build      # static build to dist/
npm run preview    # serve the build

npx wrangler dev         # dist/ + worker/ + a local D1: the whole site
npm run deploy           # the real thing — see Deployment below first

npm run check      # astro check — types and template diagnostics
npm run qa         # 36 behaviour, accessibility and form checks (needs the above)
npm run qa:shots   # 20 full-page captures across 10 breakpoints × 2 pages
npm run logo       # re-cut src/assets/brand/logo.webp + icons from the source
npm run og         # regenerate public/og.png (the share card)
```

### QA harnesses

- **`npm run qa`** drives a real browser: the mobile menu (Escape, focus
  movement and return, `inert` behind it), the skip link and focus rings,
  deep links into work rows, heading order, reduced motion, the
  no-JavaScript render, both forms end to end, and the two standing rules
  above.
  Form checks skip themselves if the endpoints are not running.
- **`npm run qa:shots`** serves the build, walks 320 → 2560 px on both pages,
  and writes captures plus a `report.json` to `.qa/` (git-ignored). It fails
  on horizontal overflow, broken images, failed requests and console output.

---

## The forms

Both are ordinary HTML forms first. JavaScript upgrades them to submit in
place and report through a live region; with it off they post normally and the
endpoint answers with a redirect to a confirmation page. Both paths are
tested.

| Endpoint | Does |
| --- | --- |
| `POST /api/contact` | Validates, rate-limits, stores in `messages`, optionally notifies Telegram. |
| `POST /api/subscribe` | Validates, rate-limits, upserts into `subscribers` (re-subscribing reactivates). |
| `GET /api/subscribe?email=&token=` | The unsubscribe link. Both parts must match. |

Protections, in order: a honeypot field and a time trap (both answered as
success, so a bot learns nothing), field validation, then a per-sender rate
limit — 3 messages and 5 sign-ups per hour. The sender's IP is never stored;
only a salted hash of it, and only to make that limit possible.

### Deployment — a Cloudflare Worker with static assets

`worker/index.ts` is the entry point. It handles `/api/contact` and
`/api/subscribe` itself (the same logic that used to run as Pages Functions)
and serves everything else from the `ASSETS` binding — the built `dist/`.
`wrangler.toml` declares the D1 binding. The Worker is named `tsh-home`; do not
rename it to `tsh87`, which is a different, older Worker on the account.

`tsh87.com` and `www.tsh87.com` reach this Worker through Workers Custom
Domains, set in the dashboard (Workers & Pages → tsh-home → Settings → Domains
& Routes). This project owns those two hostnames and nothing else on the zone.

#### First-time setup

1. **Authenticate** — `npx wrangler login`, or set `CLOUDFLARE_API_TOKEN`
   (the "Edit Cloudflare Workers" template covers it).
2. **Deploy** — `npm run deploy` (builds `dist/`, then `wrangler deploy`).
3. **Apply the schema** — `npx wrangler d1 execute tsh87-site --remote --file db/schema.sql`.
   Idempotent, safe to re-run.
4. **Set the secret** — `npx wrangler secret put IP_SALT` (any long random
   string). `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are optional — set both
   and every submission also arrives on Telegram.
5. **Bind the custom domains** — add `tsh87.com` and `www.tsh87.com` as Workers
   Custom Domains on the `tsh-home` Worker.
6. **Verify** — the home page, `/contact`, and both forms.

After that, pushes to the deployment branch build and deploy through
`.github/workflows/deploy.yml` (needs the `CF_TOKEN` Actions secret).

### Reading what comes in

```bash
npx wrangler d1 execute tsh87-site --remote \
  --command "SELECT created_at, name, email, topic, message FROM messages ORDER BY created_at DESC LIMIT 20"

npx wrangler d1 execute tsh87-site --remote \
  --command "SELECT email, created_at FROM subscribers WHERE status='active' ORDER BY created_at DESC"
```

`src/data/site.ts` holds the canonical `url`; update it if the site lands
anywhere other than `https://tsh87.com` and the canonical link, Open Graph
tags, structured data and sitemap all follow.

---

## Structure

```
public/                 served as-is
  fonts/                the two self-hosted woff2 files + their licence
  og.png                share card, generated by npm run og
  favicon-mark.png, apple-touch-icon.png, robots.txt, llms.txt
db/schema.sql           the D1 tables
worker/index.ts         the Worker entry point — routes /api/*, else serves ASSETS
functions/
  _lib.ts               validation, hashing, rate limits, responses
  api/contact.ts        the /api/contact logic, called from worker/index.ts
  api/subscribe.ts      the /api/subscribe logic, called from worker/index.ts
wrangler.toml           Worker config — name, D1 binding, the commented Route
src/
  assets/brand/         logo.webp (in use), logo-source.jpg (the original)
  components/           one file per section, plus Logo, Nav, Footer, Plate, forms
  data/                 all content: site, projects, capabilities, stack, trajectory
  layouts/Base.astro    document shell
  pages/
    index.astro         home — section order is declared here and nowhere else
    contact.astro       the contact page
    contact/sent.astro, newsletter/*.astro, 404.astro
  scripts/              main.ts (page behaviour), forms.ts (form behaviour)
  styles/               tokens → fonts → base → components → forms
scripts/                build-logo.mjs, build-og.mjs, screenshots.mjs, qa.mjs
```

---

## The logo

The brand mark is in place: `src/assets/brand/logo.webp`, used in the masthead,
the footer, the share card, the browser tab and the home-screen icon. Because
the mark already carries the wordmark and the handle, `Logo.astro` suppresses
the `vzjRR` line beside it rather than printing it twice.

**Replacing it.** Drop a new file at `src/assets/brand/logo.svg` (`.png`,
`.webp`, `.avif` and `.jpg` also work; SVG wins when several are present) and
rebuild. `Logo.astro` resolves it at build time and it appears everywhere with
**no code change**. With no file at all, a temporary geometric mark stands in.

**If the new file has an opaque background** — a photographic export, as the
current one was — put it at `src/assets/brand/logo-source.<ext>` and run:

```bash
npm run logo
```

`scripts/build-logo.mjs` lifts the artwork off its background with a soft
matte, trims the margins, and writes `logo.webp` (256 px, transparent) plus
the favicon and the Apple touch icon. It never recolours or redraws the
artwork — only mattes and scales it. The original stays in the repository
untouched, so the step can always be re-run with different thresholds.

Then `npm run og` to refresh the share card with the new mark.

---

## Adding a project

Append an entry to the array in `src/data/projects.ts`:

```ts
{
  title: 'Project name',
  slug: 'project-name',        // also its anchor: #work-project-name
  category: 'Discord Systems', // one of the ProjectCategory union
  summary: 'One sentence that works on its own, in a table row.',
  detail: 'The engineering account. Two or three specific sentences.',
  technologies: ['TypeScript', 'PostgreSQL'],
  status: 'Live',
  liveUrl: 'https://...',      // optional — a public, finished surface only
  featured: true,              // optional — promotes it to a block
}
```

The featured blocks, the index table, the hero's counter, the capability
evidence columns and the contact form's "Regarding" note all read from that one
array. Nothing else needs editing.

There is no `github` field, by design. If a project has no public surface it
simply carries no link — every row still offers **Ask about this**, which opens
the contact form with that project named.

**Featured entries** can carry a `diagram` — a signal-flow schematic of the
system, drawn as text on the plate. It exists so a project without a screenshot
still has a real visual instead of a stand-in image. Add screenshots only when
they are genuine: put the file in `src/assets/work/` and set `image`.

**Linking a capability to its evidence:** add the project's slug to the
`evidence` array of the matching entry in `src/data/capabilities.ts`.

---

## Updating personal information

Everything a person would want to change lives in `src/data/site.ts`:

- `site` — name, handle, role, disciplines, location, statement, title and meta
  description
- `channels` — the contact list, in display order. Adding `{ id: 'email', … }`
  makes an email row appear on the contact page and in the footer automatically
- `profile` — the About copy and the fact rows
- `contact` — the closing heading, body and availability line
- `nav` — the section index

`src/data/capabilities.ts`, `stack.ts` and `trajectory.ts` hold the capability
domains, the stack inventory and the Ideas → Systems → Products progression.

---

## Language

**The site is English only.** No Arabic — or any other non-Latin — text appears
in the rendered pages, the markup, or the structured data, and `scripts/qa.mjs`
asserts that on every page alongside the no-sources rule, so a regression fails
the suite rather than shipping. The only `lang` attribute on any page is `en`.

The architecture stays locale-capable without any of it being used: copy is
separated from components in `src/data/`, and the CSS uses logical properties
throughout, so the layout mirrors correctly under `dir="rtl"` (verified at
390 px and 1440 px). That is latent capacity, not a plan — adding a second
locale would mean a second data module and a font that covers its script.

---

## Accessibility and motion

Semantic landmarks, one `h1` per page, no skipped heading levels, a skip link,
visible gold focus rings, a keyboard-operable menu (Escape closes, focus moves
in and returns, the rest of the page goes `inert`), form errors announced in a
live region and tied to their fields with `aria-invalid` and
`aria-describedby`, and text that meets WCAG AA contrast — the two dimmest
tokens are pinned at 4.7:1 and 6.3:1 and are commented as such in `tokens.css`.

`prefers-reduced-motion: reduce` disables every entrance, the counters settle
instantly, and the magnetic cursor effect never initialises.
