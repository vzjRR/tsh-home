/**
 * Capability domains. Each one is a row in the capabilities table, not a card
 * in a grid — the point is that they read as a single instrument panel.
 */

export interface Capability {
  /** Two digits. The index is part of the typography, not decoration. */
  index: string;
  title: string;
  summary: string;
  /** Concrete things built in this domain. Short noun phrases. */
  items: string[];
  /** Slugs from `projects.ts` that evidence this domain. */
  evidence: string[];
}

export const capabilities: Capability[] = [
  {
    index: '01',
    title: 'Discord Systems',
    summary:
      'Community infrastructure: bots that provision their own structure, moderation with an audit trail, and staff tooling that lives outside Discord where it belongs.',
    items: [
      'Ticket and support systems',
      'Moderation, warnings and ban lifecycles',
      'OAuth2 authentication and RBAC',
      'Staff dashboards and admin panels',
      'Role and permission architecture',
      'Server provisioning and structure builders',
      'Logging, auditing and evidence handling',
      'Bilingual (Arabic / English) interfaces',
    ],
    evidence: ['enclave-tickets', 'censorship-platform', 'points-system', 'lspd-suite', 'rp-builder'],
  },
  {
    index: '02',
    title: 'FiveM & GTA V',
    summary:
      'Server-side platforms for roleplay communities — the parts that keep a server accountable, observable and recoverable.',
    items: [
      'FiveM resources in Lua',
      'Server ↔ Discord ↔ web integration',
      'Ban enforcement and escalation engines',
      'Live status, telemetry and heartbeats',
      'txAdmin environments',
      'Administration and moderation tooling',
      'Asset and vehicle resource pipelines',
      'Defensive incident response',
    ],
    evidence: ['serverstats', 'server-status', 'car-copyright-clean', 'fivem-security-agents'],
  },
  {
    index: '03',
    title: 'Web & API',
    summary:
      'Applications that degrade honestly: a document that works before the JavaScript arrives, and an API that is the only thing trusted with the truth.',
    items: [
      'Full-stack applications',
      'REST APIs and service backends',
      'Admin panels and dashboards',
      'Authentication and session management',
      'Relational data modelling and migrations',
      'Progressive enhancement and offline-first',
      'Edge and cloud deployment',
      'Right-to-left interfaces',
    ],
    evidence: ['enclave-home', 'ag-medical', 'censorship-platform'],
  },
  {
    index: '04',
    title: 'Telegram Automation',
    summary:
      'Bots and workflows on the messaging layer: notifications that reach the right person, and operations that run without one.',
    items: [
      'Telegram bots and command surfaces',
      'Notification and alerting pipelines',
      'Bot API integrations',
      'Scheduled and event-driven workflows',
      'Management and operations tooling',
    ],
    evidence: [],
  },
  {
    index: '05',
    title: 'Applications & Media',
    summary:
      'Software people install and open: media playback, streaming, and interfaces built for a device rather than a browser tab.',
    items: [
      'Mobile and desktop applications',
      'IPTV and streaming playback',
      'Media pipelines and distribution',
      'API and cloud service integration',
      'Release engineering and versioning',
    ],
    evidence: ['bariq4k', 'beyond-the-shift'],
  },
  {
    index: '06',
    title: 'Automation & AI',
    summary:
      'AI as an instrument in the workshop. Agents with a defined scope, a review gate before anything destructive, and an honest account of what they actually did.',
    items: [
      'Agentic pipelines with human approval gates',
      'AI-assisted development workflows',
      'Deterministic, offline-capable tooling',
      'Developer tooling and internal CLIs',
      'System and service integrations',
      'Deployment and operations automation',
    ],
    evidence: ['car-copyright-clean', 'fivem-security-agents'],
  },
];
