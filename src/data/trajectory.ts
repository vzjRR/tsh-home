/**
 * Ideas → Systems → Products.
 *
 * A technical trajectory, not an employment history: what the work was, what
 * it became, and what it turned into. No dates are asserted that cannot be
 * substantiated.
 */

export interface Phase {
  index: string;
  label: string;
  title: string;
  body: string;
  /** Marks the phase the work is currently in. */
  current?: boolean;
}

export const trajectory: Phase[] = [
  {
    index: '01',
    label: 'Ideas',
    title: 'Automating what a community actually needed',
    body: 'It started with the unglamorous jobs inside a roleplay community — tickets nobody could find, moderation nobody could audit, a server structure rebuilt by hand every time. Small scripts, then bots, then bots that could rebuild the whole server from a written architecture without breaking what was already there.',
  },
  {
    index: '02',
    label: 'Systems',
    title: 'Bots stopped being bots',
    body: 'The moderation logic outgrew Discord. Postgres became the source of truth, OAuth2 and role-based access went in front of it, and the bot was demoted to what it is good at: writing logs and resolving members. In game, a FiveM resource started reporting events over a signed channel, and the same data began appearing on the community’s own site.',
  },
  {
    index: '03',
    label: 'Products',
    title: 'Things people use without knowing who built them',
    body: 'A community homepage that stays readable when every upstream API is down. An admin panel that is the only surface with write access. A clinical suite that runs offline in a nurse’s pocket and refuses to send anything they type to a server. A podcast that ships in the same release as the platform it lives on.',
    current: true,
  },
];
