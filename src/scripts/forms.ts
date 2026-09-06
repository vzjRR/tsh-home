/**
 * Form behaviour for the contact and newsletter forms.
 *
 * Enhancement only. Both forms are ordinary HTML posts that the endpoints
 * answer with a redirect; this file makes them submit in place, report the
 * outcome in a live region, and mark the field that needs attention.
 */

type Fields = 'name' | 'email' | 'message';

const MESSAGES: Record<string, string> = {
  name: 'Add a name so I know who I am replying to.',
  email: 'That address does not look like it will reach you.',
  message: 'Add a sentence or two about what you need.',
  rate: 'That is a few messages in a short window. Try again in an hour, or reach me on Telegram.',
  unavailable: 'The form is not accepting messages right now. Telegram is the reliable route.',
  store: 'Something went wrong saving that. Try again, or reach me on Telegram.',
  network: 'That did not send — check the connection and try again, or reach me on Telegram.',
};

const SUCCESS = {
  contact: 'Message received. I read everything and reply to what I can take on.',
  subscribe: 'You are on the list. Every update carries an unsubscribe link.',
};

function setStatus(form: HTMLFormElement, state: 'ok' | 'error' | null, text = ''): void {
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  if (!status) return;
  if (!state) {
    status.removeAttribute('data-state');
    status.textContent = '';
    return;
  }
  status.dataset.state = state;
  status.textContent = text;
}

function markField(form: HTMLFormElement, field: string, invalid: boolean): void {
  const control = form.querySelector<HTMLElement>(`[name="${field}"]`);
  const error = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
  if (control) {
    if (invalid) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }
  if (error) {
    if (invalid) error.setAttribute('data-shown', '');
    else error.removeAttribute('data-shown');
  }
}

function clearFields(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((el) => {
    el.removeAttribute('data-shown');
    const name = el.dataset.errorFor;
    if (name) form.querySelector(`[name="${name}"]`)?.removeAttribute('aria-invalid');
  });
}

function validate(form: HTMLFormElement): Fields | null {
  const value = (name: string) =>
    (form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)?.value ?? '').trim();

  if (form.querySelector('[name="name"]') && value('name').length < 2) return 'name';

  const email = value('email');
  const at = email.indexOf('@');
  const domain = email.slice(at + 1);
  if (at < 1 || !domain.includes('.') || /\s/.test(email)) return 'email';

  if (form.querySelector('[name="message"]') && value('message').length < 10) return 'message';

  return null;
}

function busy(form: HTMLFormElement, on: boolean, label: string): void {
  const button = form.querySelector<HTMLElement>('[data-submit]');
  const text = form.querySelector<HTMLElement>('[data-submit-label]');
  if (button) button.setAttribute('aria-disabled', String(on));
  if (text) text.textContent = on ? 'Sending…' : label;
}

function enhance(form: HTMLFormElement, kind: 'contact' | 'subscribe'): void {
  // The time trap: stamped on render, checked by the endpoint.
  form.querySelector<HTMLInputElement>('[data-ts]')?.setAttribute('value', String(Date.now()));

  const label = form.querySelector<HTMLElement>('[data-submit-label]')?.textContent ?? 'Send';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearFields(form);
    setStatus(form, null);

    const invalid = validate(form);
    if (invalid) {
      markField(form, invalid, true);
      setStatus(form, 'error', MESSAGES[invalid]);
      form.querySelector<HTMLElement>(`[name="${invalid}"]`)?.focus();
      return;
    }

    busy(form, true, label);

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (response.ok && result.ok) {
        form.reset();
        form.querySelector<HTMLInputElement>('[data-ts]')?.setAttribute('value', String(Date.now()));
        setStatus(form, 'ok', SUCCESS[kind]);
      } else {
        const code = result.error ?? 'store';
        if (code === 'name' || code === 'email' || code === 'message') markField(form, code, true);
        setStatus(form, 'error', MESSAGES[code] ?? MESSAGES.store);
      }
    } catch {
      setStatus(form, 'error', MESSAGES.network);
    } finally {
      busy(form, false, label);
    }
  });

  // Clearing the error the moment the person fixes it keeps the form quiet.
  form.addEventListener('input', (event) => {
    const target = event.target as HTMLElement;
    const name = target.getAttribute('name');
    if (name && target.getAttribute('aria-invalid')) markField(form, name, false);
  });
}

/** `/contact?ref=<slug>` arrives from a work row: name the piece and preselect
 *  the matching subject, so the person does not retype what we already know. */
function applyWorkReference(form: HTMLFormElement): void {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (!ref) return;

  form.querySelector<HTMLInputElement>('[data-ref]')?.setAttribute('value', ref);

  const topic = form.querySelector<HTMLSelectElement>('[data-topic]');
  if (topic) topic.value = 'work';

  const titles = document.getElementById('work-titles')?.textContent;
  const title = titles ? (JSON.parse(titles) as Record<string, string>)[ref] : undefined;
  const slot = document.querySelector<HTMLElement>('[data-ref-note]');
  if (title && slot) {
    slot.textContent = title;
    slot.closest<HTMLElement>('[data-ref-wrap]')?.removeAttribute('hidden');
  }
}

/** A no-JS submission that failed comes back as `?error=<code>`. */
function showRedirectedError(form: HTMLFormElement): void {
  const code = new URLSearchParams(window.location.search).get('error');
  if (!code) return;
  setStatus(form, 'error', MESSAGES[code] ?? MESSAGES.store);
  if (code === 'name' || code === 'email' || code === 'message') markField(form, code, true);
}

export function initForms(): void {
  const contact = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (contact) {
    enhance(contact, 'contact');
    applyWorkReference(contact);
    showRedirectedError(contact);
  }

  document.querySelectorAll<HTMLFormElement>('[data-subscribe-form]').forEach((form) => {
    enhance(form, 'subscribe');
    showRedirectedError(form);
  });
}
