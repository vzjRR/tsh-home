/**
 * Identity and site-wide configuration.
 *
 * Everything a human would want to change without touching a component lives
 * here. Copy is written for `en`; the shape is deliberately locale-agnostic so
 * an `ar` sibling can be added later without altering any component.
 */

export type SocialId =
  | 'github'
  | 'telegram'
  | 'instagram'
  | 'snapchat'
  | 'spotify'
  | 'email';

export interface Channel {
  id: SocialId;
  label: string;
  /** What a person reads: a handle, an address, a domain. */
  handle: string;
  href: string;
  /** Surfaced in the contact section as the one-line reason to use it. */
  note?: string;
  /** Shown in the header / footer link rails. */
  compact?: boolean;
}

export const site = {
  lang: 'en',
  dir: 'ltr' as const,
  url: 'https://tsh87.com',
  domain: 'tsh87.com',

  name: 'Talal Al Ghafri',
  /** Arabic form of the name, used for `alternateName` in structured data. */
  nameArabic: 'طلال الغافري',
  handle: 'vzjRR',
  /** Two lines, set as one block in the hero. */
  nameLines: ['Talal', 'Al Ghafri'] as const,

  role: 'Software Developer · Systems Builder',
  disciplines: ['Discord Systems', 'FiveM Platforms', 'Web & API', 'Mobile', 'Automation'],
  location: 'Muscat, Oman',
  timezone: 'GMT+4',

  title: 'Talal Al Ghafri — Software Developer & Systems Builder',
  description:
    'Talal Al Ghafri (vzjRR) builds Discord systems, FiveM platforms, web applications and clinical tooling — from Muscat, Oman.',

  /** One sentence. It is the first thing a stranger reads about the work. */
  statement:
    'I build the systems a community runs on — bots that provision themselves, dashboards with real permissions behind them, and game-server platforms that stay up.',
} as const;

/**
 * Verified channels only. `email` is intentionally absent until a public
 * address is confirmed — add it here and it appears in the contact section
 * and the footer automatically.
 */
export const channels: Channel[] = [
  {
    id: 'github',
    label: 'GitHub',
    handle: 'vzjRR',
    href: 'https://github.com/vzjRR',
    note: 'Source for most of the work below.',
    compact: true,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    handle: '@iTalalinio',
    href: 'https://t.me/iTalalinio',
    note: 'Fastest route to a reply.',
    compact: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@_t4l',
    href: 'https://instagram.com/_t4l',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    handle: 'vzjjr',
    href: 'https://snapchat.com/add/vzjjr',
  },
  {
    id: 'spotify',
    label: 'Podcast',
    handle: 'Beyond The Shift Oman',
    href: 'https://podcasters.spotify.com/pod/show/vzjrr',
    note: 'A show I produce, write and publish.',
  },
];

export interface NavItem {
  label: string;
  href: string;
  /** The section id this item tracks for scroll-spy. */
  watches: string;
}

export const nav: NavItem[] = [
  { label: 'Profile', href: '#profile', watches: 'profile' },
  { label: 'Capabilities', href: '#capabilities', watches: 'capabilities' },
  { label: 'Work', href: '#work', watches: 'work' },
  { label: 'Stack', href: '#stack', watches: 'stack' },
  { label: 'Contact', href: '#contact', watches: 'contact' },
];

export const profile = {
  heading: 'Two disciplines, one way of working.',
  paragraphs: [
    'I work in critical care and I build software. Both jobs reward the same instinct: understand the system before you touch it, make the failure modes visible, and leave something the next person can run without you standing next to them.',
    'Most of what I ship starts as a problem a real group of people has right now — a community that needs moderation it can audit, a game server that needs to report what it is doing, a ward that needs a calculation done the same way every time. I build the thing, deploy it, and keep it running.',
    'The work spans Discord and Telegram automation, FiveM server platforms, web applications and APIs, mobile and media apps, and clinical tooling. AI is part of how I build — an instrument in the workshop, not the product on the shelf.',
  ],
  /** Fact rows in the profile plate. Every value is checkable. */
  facts: [
    { label: 'Based', value: 'Muscat, Oman' },
    { label: 'Handle', value: 'vzjRR' },
    { label: 'Languages', value: 'Arabic · English' },
    { label: 'Writes', value: 'TypeScript · JavaScript · Python · Lua' },
    { label: 'Also', value: 'Critical care nursing' },
  ],
} as const;

export const contact = {
  heading: 'Bring me a system that has to work.',
  body: 'Community infrastructure, a game-server platform, an internal tool, an app that has to survive contact with real users — if it has to run unattended and be maintained afterwards, it is the kind of work I take.',
  availability: 'Open to selected projects',
} as const;
