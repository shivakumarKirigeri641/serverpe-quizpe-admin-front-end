/**
 * Plain-English guidance for each WhatsApp template: who to send it to and when.
 * Keyed by send_context (falls back to the template name). `manual: true` means
 * YOU send it from Broadcast; `false` means the app sends it automatically on a
 * trigger (don't broadcast those); `null` means no guidance is set.
 */
const BY_CONTEXT = {
  // ---- manual marketing broadcasts ----
  promo_trial: { manual: true, audience: 'Leads — chatted, never enrolled', note: 'Re-engage them with the daily-revision hook + free trial. Send every 1–2 weeks as leads build up.' },
  winback: { manual: true, audience: 'Lapsed — plan ended, not renewed', note: 'Win them back. Best ~1–2 weeks after their plan expires.' },
  referral: { manual: true, audience: 'Paid — active paying parents', note: 'Ask happy payers to refer friends for bonus days. Send occasionally (about monthly).' },
  offer: { manual: true, audience: 'Leads + Lapsed', note: 'A pricing push during a sale, festival, new school term or exam season.' },

  // ---- automatic (app-triggered) ----
  enrolment: { manual: false, audience: 'Automatic', note: 'App sends this welcome/renewal confirmation the moment a parent enrols.' },
  expiring: { manual: false, audience: 'Automatic', note: 'App sends this as a plan nears its expiry date.' },
  expired: { manual: false, audience: 'Automatic', note: 'App sends this once, after a plan has expired.' },
  thankyou: { manual: false, audience: 'Automatic', note: 'App sends this after a paid enrollment (right after the invoice).' },
  day_missed: { manual: false, audience: 'Automatic', note: 'App sends this after the cutoff to children who missed the day’s quiz.' },
  ticket_resolved: { manual: false, audience: 'Automatic', note: 'App sends this when a support ticket is marked resolved.' },
};

export function templateGuide(t = {}) {
  const ctx = t.send_context || '';
  const name = t.template_name || '';
  if (BY_CONTEXT[ctx]) return BY_CONTEXT[ctx];
  // fall back to name patterns for scheduler/lifecycle templates
  if (/remainder|quizstart|quiz_missed|daymissed/i.test(name))
    return { manual: false, audience: 'Automatic', note: 'App sends this on schedule (reminder / quiz start / missed-quiz nudge).' };
  if (/ticketresolution|ticket_resolved/i.test(name))
    return { manual: false, audience: 'Automatic', note: 'App sends this when a support ticket is resolved.' };
  if (/thankyou/i.test(name))
    return { manual: false, audience: 'Automatic', note: 'App sends this after a paid enrollment.' };
  if (/renewalorwelcome|enroll|expir/i.test(name))
    return { manual: false, audience: 'Automatic', note: 'App sends this automatically (enrolment / expiry lifecycle).' };
  return { manual: null, audience: '—', note: 'No guidance set. Add a send context to describe when to use it.' };
}
