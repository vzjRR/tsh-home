/**
 * Behaviour. About 3 KB of it, and every piece earns its place:
 * entrance reveals, scroll-spy, the mobile menu, two micro-interactions,
 * and deep-linking into a closed index row.
 *
 * Nothing here is required for the page to be readable or navigable — the
 * document works with this file absent.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

/* ------------------------------------------------------------- reveals -- */

function initReveals(): void {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!targets.length) return;

  if (reduced.matches || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.setAttribute('data-revealed', ''));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-revealed', '');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
  );

  targets.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------ masthead + scroll-spy -- */

function initMasthead(): void {
  const masthead = document.querySelector<HTMLElement>('[data-masthead]');
  if (!masthead) return;

  const onScroll = () => {
    masthead.toggleAttribute('data-scrolled', window.scrollY > 8);
  };

  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initScrollSpy(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-spy]'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  const sections = links
    .map((link) => document.getElementById(link.dataset.spy ?? ''))
    .filter((el): el is HTMLElement => el !== null);

  const visible = new Set<string>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      }

      // The topmost visible section wins, so the marker never flickers
      // between two sections that share the viewport.
      const active = sections.find((section) => visible.has(section.id));
      for (const link of links) {
        if (active && link.dataset.spy === active.id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );

  sections.forEach((section) => observer.observe(section));
}

/* ---------------------------------------------------------- mobile menu -- */

function initMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;

  let open = false;
  let lastFocus: HTMLElement | null = null;

  const setOpen = (next: boolean) => {
    if (next === open) return;
    open = next;
    menu.toggleAttribute('data-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';

    if (open) {
      lastFocus = document.activeElement as HTMLElement | null;
      menu.querySelector<HTMLAnchorElement>('[data-menu-link]')?.focus({ preventScroll: true });
    } else {
      (lastFocus ?? toggle).focus({ preventScroll: true });
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));

  menu.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });

  // A resize past the desktop breakpoint must not leave the page locked.
  window.matchMedia('(min-width: 60rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

/* ------------------------------------------------------------- counters -- */

function initCounters(): void {
  const counters = document.querySelectorAll<HTMLElement>('[data-count]');
  if (!counters.length) return;

  const settle = (el: HTMLElement) => {
    const target = Number(el.dataset.count ?? 0);
    const pad = Number(el.dataset.pad ?? 0);
    const format = (n: number) => String(n).padStart(pad, '0');

    if (reduced.matches) {
      el.textContent = format(target);
      return;
    }

    const duration = 900;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Same settle curve as the CSS easing, so numbers and layout agree.
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = format(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(settle);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        settle(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.6 },
  );

  counters.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------- magnetic -- */

/** A 6px pull toward the cursor. Enough to feel intentional, not enough to
 *  make the control move away from where someone aimed. */
function initMagnetic(): void {
  if (reduced.matches || !finePointer.matches) return;

  const strength = 0.22;
  const max = 6;

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    let frame = 0;

    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) * strength;
        const dy = (event.clientY - (rect.top + rect.height / 2)) * strength;
        const clamp = (n: number) => Math.max(-max, Math.min(max, n));
        el.style.transform = `translate3d(${clamp(dx)}px, ${clamp(dy)}px, 0)`;
      });
    };

    const reset = () => {
      cancelAnimationFrame(frame);
      el.style.transform = '';
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('blur', reset);
  });
}

/* --------------------------------------------------------- deep linking -- */

/** `#work-<slug>` should land on an open row, not a collapsed one. */
function openTargetedRow(hash: string): void {
  if (!hash.startsWith('#work-')) return;
  const row = document.querySelector<HTMLElement>(hash);
  const details = row?.querySelector('details');
  if (details && !details.open) details.open = true;
}

function initDeepLinks(): void {
  openTargetedRow(window.location.hash);
  window.addEventListener('hashchange', () => openTargetedRow(window.location.hash));

  document.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#work-"]');
    if (link) openTargetedRow(new URL(link.href).hash);
  });
}

/* ----------------------------------------------------------------- boot -- */

function boot(): void {
  initReveals();
  initMasthead();
  initScrollSpy();
  initMenu();
  initCounters();
  initMagnetic();
  initDeepLinks();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
