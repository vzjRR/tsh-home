# tsh87.com

The personal site of **Talal Al Ghafri** (`vzjRR`) — the work, the capabilities
behind it, a contact form and a newsletter.

> **No source links.** This site never references a repository, a source host,
> or an internal surface such as an admin panel. Only finished, public
> deliverables may appear as a `liveUrl`. `scripts/qa.mjs` asserts this on every
> page, so a regression fails the suite rather than shipping.

---

## Stack, and why

| Choice | Reason |
| --- | --- |
| **Astro** (static output) | The pages are content. Astro ships them as HTML with no framework runtime, and its content model means new work — and later articles or case studies — is data rather than components. |
| **TypeScript** | The content model and the endpoints are typed, so a malformed entry fails the build instead of the page. |
| **Hand-authored CSS** with a token layer | A utility framework would have produced a generic result. The design system is six files, scoped per component by Astro. |
| **Cloudflare Pages Functions + D1** | The forms had to be real. Two endpoints and one small database — no third-party form service, no data leaving the account. |
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

npx wrangler pages dev   # dist/ + functions/ + a local D1: the whole site

npm run check      # astro check — types and template diagnostics
npm run qa         # 35 behaviour, accessibility and form checks (needs the above)
npm run qa:shots   # 20 full-page captures across 10 breakpoints × 2 pages
npm run logo       # re-cut src/assets/brand/logo.webp + icons from the source
npm run og         # regenerate public/og.png (the share card)
```

### QA harnesses

- **`npm run qa`** drives a real browser: the mobile menu (Escape, focus
  movement and return, `inert` behind it), the skip link and focus rings,
  deep links into work rows, heading order, reduced motion, the
  no-JavaScript render, both forms end to end, and the no-source rule.
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

### Deployment (Cloudflare Pages)

- **Build command** `npm run build`
- **Output directory** `dist`
- **Node version** 20 or newer

Then, once:

1. **Bind the database.** Settings → Functions → D1 bindings: variable name
   `DB`, database `tsh87-site`. (`wrangler.toml` already declares it for local
   development. A database id is not a credential — it names the database, it
   does not grant access to it.)
2. **Apply the schema** — `npx wrangler d1 execute tsh87-site --remote --file db/schema.sql`.
   It is idempotent and safe to re-run.
3. **Set the secrets.** `IP_SALT` is the one that matters; set it to any long
   random string. `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are optional —
   set both and every submission also arrives on Telegram.

Nothing is committed but the schema. No key, token or salt is in this repo.

### Reading what comes in

```bash
npx wrangler d1 execute tsh87-site --remote \
  --command "SELECT created_at, name, email, topic, message FROM messages ORDER BY created_at DESC LIMIT 20"

npx wrangler d1 execute tsh87-site --remote \
  --command "SELECT email, created_at FROM subscribers WHERE status='active' ORDER BY created_at DESC"
```

> **Note on the apex domain.** `tsh87.com` currently serves *Al Ghafri Medical
> Solutions* (a separate Next.js Worker with its own database). Pointing this
> site at the apex would replace it. Decide the cutover deliberately — a
> subdomain for one of the two, or a path split — before changing DNS.

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
functions/
  _lib.ts               validation, hashing, rate limits, responses
  api/contact.ts        POST /api/contact
  api/subscribe.ts      POST /api/subscribe · GET unsubscribe
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

## Localisation

Copy is separated from components and the CSS uses logical properties
throughout, so a right-to-left Arabic locale is a `dir` attribute plus a second
data module — not a rewrite. RTL rendering is verified at 390 px and 1440 px
with no layout breakage, and the newsletter's Arabic line already carries its
own `lang`/`dir` on an isolated span.

To add Arabic: duplicate `src/data/site.ts` as an `ar` variant, set
`lang`/`dir` in `Base.astro` from it, and add an Arabic-capable font face
alongside Geist in `src/styles/fonts.css`.

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
