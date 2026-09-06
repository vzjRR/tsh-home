/**
 * The instruments. Only what is present in shipped work — this list is an
 * inventory, not an aspiration.
 */

export interface StackGroup {
  index: string;
  label: string;
  items: string[];
}

export const stack: StackGroup[] = [
  {
    index: '01',
    label: 'Languages',
    items: ['TypeScript', 'JavaScript', 'Python', 'Lua', 'SQL', 'HTML', 'CSS'],
  },
  {
    index: '02',
    label: 'Runtime & Frameworks',
    items: ['Node.js', 'Next.js', 'React', 'Astro', 'Express', 'Tailwind CSS', 'discord.js'],
  },
  {
    index: '03',
    label: 'Data',
    items: ['PostgreSQL', 'SQLite', 'Cloudflare D1', 'Prisma', 'Drizzle ORM'],
  },
  {
    index: '04',
    label: 'Platforms & Infrastructure',
    items: [
      'Cloudflare Workers',
      'Docker',
      'Railway',
      'systemd',
      'Caddy',
      'FiveM / txAdmin',
      'Discord',
      'Telegram',
      'GitHub',
    ],
  },
  {
    index: '05',
    label: 'Practice',
    items: ['Vitest', 'ESLint', 'Prettier', 'Git', 'OAuth2', 'TOTP', 'HMAC', 'PWA'],
  },
  {
    index: '06',
    label: 'AI Tooling',
    items: ['Claude Code', 'Codex', 'Agent pipelines'],
  },
];
