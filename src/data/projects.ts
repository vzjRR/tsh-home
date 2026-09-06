/**
 * The work index.
 *
 * Every entry describes work that was actually built and shipped — nothing
 * here is illustrative. To add a project, append an object; the featured
 * blocks and the index table below them both read from this array, so no
 * component needs to change.
 *
 * No source links. Only a finished, public surface may appear as `liveUrl`.
 */

export type ProjectStatus = 'Live' | 'Active' | 'Beta' | 'Complete' | 'Internal' | 'Publishing';

export type ProjectCategory =
  | 'Clinical Platform'
  | 'Web Platform'
  | 'Discord Systems'
  | 'FiveM'
  | 'Developer Tooling'
  | 'Applications'
  | 'Media';

/**
 * A signal-flow schematic of the system, top to bottom. Rendered as real text
 * rather than an image — it is the honest alternative to a screenshot that
 * does not exist, and it survives translation, zoom and a screen reader.
 */
export interface Diagram {
  layers: { label: string; nodes: string[] }[];
  note?: string;
}

export interface Project {
  /** Display name. */
  title: string;
  /** Stable id — used for anchors and as a React-free key. */
  slug: string;
  category: ProjectCategory;
  /** One sentence. It has to work on its own, in a table row. */
  summary: string;
  /** The engineering account. Two or three sentences, specific. */
  detail: string;
  technologies: string[];
  /** What I did on it. Omitted where "everything" is the honest answer. */
  role?: string;
  status: ProjectStatus;
  featured?: boolean;
  /**
   * A public, finished surface only. Repositories, admin panels and anything
   * else internal are deliberately absent — this site does not expose the
   * source of the work it describes.
   */
  liveUrl?: string;
  /**
   * Optional screenshot in `src/assets/work/`. When absent the card renders a
   * typographic plate instead — no stand-in imagery, no invented screenshots.
   */
  image?: string;
  /** Drawn on the featured plate in place of a screenshot. */
  diagram?: Diagram;
}

export const projects: Project[] = [
  {
    title: 'Al Ghafri Medical Solutions',
    slug: 'ag-medical',
    category: 'Clinical Platform',
    summary:
      'A clinical assistance suite for nursing practice and education — guided bedside tools, structured communication, and a podcast.',
    detail:
      'Next.js on Cloudflare Workers with a D1 database behind Prisma, shipped as an installable progressive web app so the tools keep working with no connection. Every calculation runs in the browser: nothing typed into a tool reaches a server, and the SBAR composer strips names and identifier-like numbers from its output as a safety net. Guidance is anchored to published Oman Ministry of Health documents, with a standing notice that approved institutional policy takes precedence over anything the platform says.',
    technologies: ['Next.js', 'TypeScript', 'Cloudflare Workers', 'D1', 'Prisma', 'PWA'],
    status: 'Live',
    featured: true,
    liveUrl: 'https://tsh87.com/medical',
    diagram: {
      layers: [
        { label: 'Client', nodes: ['Installable PWA', 'Tools compute locally'] },
        { label: 'Edge', nodes: ['Next.js on Cloudflare Workers'] },
        { label: 'Data', nodes: ['D1 via Prisma'] },
      ],
      note: 'Nothing typed into a tool leaves the device.',
    },
  },
  {
    title: 'Enclave RP — Community Platform',
    slug: 'enclave-home',
    category: 'Web Platform',
    summary:
      'The public homepage of a FiveM community: live server status, news, store highlights and Discord activity — Arabic, right to left.',
    detail:
      'Node.js with zero runtime dependencies. The document renders, reads and links correctly with JavaScript disabled and every upstream API down — the join, Discord and store buttons are server-side redirects rather than values templated into the markup. Four independent client requests then fill in the live sections; each either improves its own section or leaves the served markup alone, so a dead game server costs the status board, not the page. Admin access is TOTP-gated and the server mints a random secret at startup rather than shipping a default. A 74-assertion suite covers identifier leakage, path traversal, CSRF, draft visibility and upstream outage and recovery.',
    technologies: ['Node.js', 'JavaScript', 'Lua', 'HTML', 'CSS'],
    status: 'Live',
    featured: true,
    liveUrl: 'https://enclaverp.cc',
    diagram: {
      layers: [
        { label: 'Served', nodes: ['Complete HTML document', 'Redirect endpoints'] },
        { label: 'Enhanced', nodes: ['Status', 'News', 'Store', 'Discord'] },
        { label: 'Upstream', nodes: ['Cfx.re / txAdmin', 'Store', 'Discord'] },
      ],
      note: 'Four independent requests. None can blank another.',
    },
  },
  {
    title: 'Censorship Platform',
    slug: 'censorship-platform',
    category: 'Discord Systems',
    summary:
      'A Discord OAuth2 staff platform: duty tracking, warnings, bans, evidence and audit logs, with role-based access enforced server-side.',
    detail:
      'Three cooperating pieces over one codebase and one database. A discord.js bot posts fixed-format moderation logs and resolves guild members for the dashboard, holding no moderation state of its own. An Express and TypeScript API owns the OAuth2 flow, sessions, RBAC and a database-driven expiration worker. A React dashboard, served by that same process, is the only way staff touch any of it — and Postgres is the single source of truth for all three.',
    technologies: ['TypeScript', 'React', 'Tailwind CSS', 'Express', 'PostgreSQL', 'discord.js', 'Docker'],
    status: 'Active',
  },
  {
    title: 'Enclave Tickets',
    slug: 'enclave-tickets',
    category: 'Discord Systems',
    summary:
      'A ticket system built on one rule: a support category should not exist until someone needs it.',
    detail:
      'Categories stay invisible while empty and surface only for the people in them, so a server of a dozen support sections reads as one channel until a ticket opens. One command provisions the whole structure — or adopts the channels a server already has. Each member picks a language once and everything the bot sends them afterwards follows it, down to the closing DM hours later, while staff records stay in English. Daily ticket caps reset at midnight Oman time, and a claimed ticket closes itself if the member goes quiet.',
    technologies: ['Node.js', 'discord.js', 'JavaScript'],
    status: 'Live',
  },
  {
    title: 'Points System',
    slug: 'points-system',
    category: 'Discord Systems',
    summary:
      'A Discord bot with no commands at all: it watches one channel and turns every qualifying image post into exactly one point.',
    detail:
      'One point per message that contains an image — never more, however many images are in it — tracked as weekly, monthly and all-time totals that roll over on schedule in Oman time and archive a snapshot to history. Editing a message re-evaluates it. The bot exposes nothing to Discord; everything is read and administered from a separate panel, which is the only surface with write access.',
    technologies: ['TypeScript', 'discord.js', 'Drizzle ORM', 'SQL', 'Docker', 'Vitest'],
    status: 'Live',
  },
  {
    title: 'ServerStats',
    slug: 'serverstats',
    category: 'FiveM',
    summary:
      'One hub moving warnings, bans, kicks, join/leave events and live stats between a FiveM server, its Discord and its website.',
    detail:
      'A Node backend holds the SQLite store, a warning-rule escalation engine and the Discord relay with its moderation commands, and serves the dashboard. In game, a FiveM resource reports events and enforces bans at connect time. The two sides authenticate with a pure-Lua HMAC signer written for the resource and verified byte-for-byte against Node’s own crypto output.',
    technologies: ['Node.js', 'Lua', 'SQLite', 'discord.js'],
    status: 'Complete',
  },
  {
    title: 'Server Status',
    slug: 'server-status',
    category: 'FiveM',
    summary:
      'A live status card for a FiveM server: one Discord message, edited in place every minute, never reposted.',
    detail:
      'It mirrors txAdmin’s own status embed — status, players, connect code, uptime, next restart — reskinned for the community. On boot the bot searches the channel for the message it posted before, recognises it by a footer marker and adopts it, so restarts never litter the channel. Figures come from txAdmin’s host status when it is configured, from an ordinary poll when it is not, and uptime from the relay resource’s real heartbeat when one is running. Nothing pings anyone unless a staff member explicitly announces it.',
    technologies: ['Node.js', 'discord.js', 'Lua'],
    status: 'Live',
  },
  {
    title: 'LSPD Suite',
    slug: 'lspd-suite',
    category: 'Discord Systems',
    summary:
      'Three bots behind one bot identity: welcome imaging, audit logging and tickets for a police-department server.',
    detail:
      'Separate Node processes share a single Discord application and token, so members only ever see one bot while each part can be restarted without touching the others. Log routing is channel-per-type in configuration, with per-deployment environment overrides so a staging server never needs a code change. Ticket sections are bilingual, and the whole thing installs from one script.',
    technologies: ['Node.js', 'discord.js', 'systemd'],
    status: 'Live',
  },
  {
    title: 'Discord RP Builder',
    slug: 'rp-builder',
    category: 'Developer Tooling',
    summary:
      'A build tool that constructs an entire Discord server — roles, categories, channels — from a written architecture document.',
    detail:
      'Every operation checks whether the role, category or channel already exists by name and skips it, so the tool is safe to point at a live server and safe to run twice. It ships beside three independent bots — logs, welcome, points — and an Express admin panel, each with its own package and each deployable on its own.',
    technologies: ['Node.js', 'discord.js', 'Express', 'Railway'],
    status: 'Internal',
  },
  {
    title: 'Car Copyright Clean',
    slug: 'car-copyright-clean',
    category: 'Developer Tooling',
    summary:
      'A multi-agent pipeline that finds manufacturer branding on FiveM vehicle resources — and knows which branding has to stay.',
    detail:
      'Around twenty single-purpose agents under an orchestrator: resource discovery, vehicle identification, brand detection across filenames, metadata, embedded strings and OCR, then classification that separates target-manufacturer marks from the aftermarket, tyre, wheel and brake branding that must survive. Nothing destructive runs before a backup, a written change plan and a human approval gate, and rollback is part of the pipeline rather than a note in the README. Brand knowledge lives in data files, so a manufacturer nobody has catalogued still works from a generated profile. Pure Python, deterministic offline, and it never executes code found inside a resource.',
    technologies: ['Python', 'YAML', 'Lua'],
    status: 'Active',
  },
  {
    title: 'FiveM Security Agents',
    slug: 'fivem-security-agents',
    category: 'Developer Tooling',
    summary:
      'Defensive incident-response agents for compromised FiveM and txAdmin servers.',
    detail:
      'Two agents, written as instructions any AI coding tool can follow straight from a URL. The assessment pass is strictly read-only: it scans, reports and produces a plan. The remediation pass runs only after that assessment or an explicit authorisation, quarantines before it deletes, and re-scans afterwards.',
    technologies: ['Agent specifications', 'FiveM', 'txAdmin'],
    status: 'Active',
  },
  {
    title: 'Bariq4K',
    slug: 'bariq4k',
    category: 'Applications',
    summary: 'An IPTV player application, published as versioned releases.',
    detail:
      'A media player built around live and on-demand IPTV streams, distributed to users as tagged application releases rather than an app-store listing.',
    technologies: ['Media playback', 'Streaming'],
    status: 'Beta',
  },
  {
    title: 'Beyond The Shift Oman',
    slug: 'beyond-the-shift',
    category: 'Media',
    summary:
      'A cinematic healthcare podcast: real hospital experiences, staff reflections, and the conversations every department knows by heart.',
    detail:
      'Written, produced and published as a show, then wired into the clinical platform as a first-class part of it — new episodes appear in the built-in player automatically from the feed, alongside the Spotify, Apple Podcasts and YouTube distributions.',
    technologies: ['Production', 'Audio', 'Distribution'],
    role: 'Writer, producer, publisher',
    status: 'Publishing',
    liveUrl: 'https://podcasters.spotify.com/pod/show/vzjrr',
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const indexedProjects = projects.filter((p) => !p.featured);
