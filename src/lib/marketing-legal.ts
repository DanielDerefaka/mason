import { CONTACT } from '@/lib/marketing-nav'
import { SITE_URL } from '@/lib/site'

/**
 * Privacy and terms, in the words the product actually keeps.
 *
 * No invented company, jurisdiction or retention figure. Where a number is
 * stated it is the same policy /faq already publishes: fourteen days for a
 * guest session. Contact is the address the footer uses, so the two cannot
 * drift.
 */

export const PRIVACY_DESCRIPTION =
  'What SketchMason collects, what it is used for, and how long guest work is kept.'

export const TERMS_DESCRIPTION =
  'The terms for using SketchMason: the canvas, guest sessions, credits, and what you may do with a generated design.'

export const LEGAL_UPDATED = '1 September 2026'

export const PRIVACY_SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'Who this is for',
    body: [
      `This page describes how SketchMason (${SITE_URL}) handles information. Questions go to ${CONTACT.email}.`,
    ],
  },
  {
    heading: 'What we collect',
    body: [
      'An account is an email address and a password, or whatever the sign-in provider sends us. A guest session is anonymous: it is a cookie in the browser you drew in, not a name.',
      'Downloading a design as a guest asks for an email address, once. That address goes on the launch list and the newsletter. It is not required to draw or to generate.',
      'A project holds the sketches, references, generated screens and history you make. A design you publish to Explore is a copy of one screen and the sketch behind it, offered to the public on purpose.',
      'The site records ordinary request logs and, through DataFast, page views on sketchmason.com. If PostHog is configured, product events go there too. Errors may be sent to Sentry so a crash can be fixed.',
      'If you paste an Anthropic API key into the canvas, it is held in that browser tab only, sent with the generation request, and gone when the tab closes. SketchMason never stores it.',
    ],
  },
  {
    heading: 'What we use it for',
    body: [
      'To run the product: generate a design, save a project, admit a guest, take a payment, send a receipt.',
      'To email people who asked for the launch list or the newsletter, and to reply if you write to us.',
      'To keep the canvas usable: rate limits, the shared guest pool, and the per-network guest cap exist so one visitor cannot empty the product for everyone else.',
    ],
  },
  {
    heading: 'How long we keep it',
    body: [
      'A guest session and the projects made in it are kept for fourteen days in the browser you drew in. After that a guest who never made an account is forgotten.',
      'An account and the projects on it stay until you delete them, or until we have to close the product.',
      'Payment records are kept for as long as the payment provider and the tax rules require.',
    ],
  },
  {
    heading: 'Who else sees it',
    body: [
      'Generation is sent to the model provider (Anthropic, unless you brought your own key). Stock photographs may be fetched from Pexels. Payments go through Polar. Auth, storage and the database run on Convex. Hosting is Vercel. Analytics is DataFast, and PostHog when a project key is set. Error reports may go to Sentry.',
      'We do not sell your information. We do not use a generated design as advertising unless you published it to Explore or shared the link yourself.',
    ],
  },
  {
    heading: 'Cookies',
    body: [
      'The auth cookie is how a session survives a closed tab. It lasts thirty days. Without it a guest would lose the work on every refresh. There is no advertising cookie.',
    ],
  },
]

export const TERMS_SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'The product',
    body: [
      'SketchMason, or Mason for short, is an AI design tool. You sketch a screen, it generates a design against a design system, and you can export that design as HTML or as a written brief. It is not a promise of production software, and it is not legal, medical or financial advice.',
    ],
  },
  {
    heading: 'Accounts and guests',
    body: [
      'You can use /try without an account. A guest session is tied to the browser it was opened in. Guest work is kept for fourteen days. Making an account keeps the work.',
      'You are responsible for the account you create and for anything done with a key you paste into the canvas.',
    ],
  },
  {
    heading: 'Credits and fair use',
    body: [
      'A credit is one generation: a style guide, a screen, a page in a generated flow, or a revision from the design chat. Drawing, moving, resizing, references and history cost nothing.',
      'Guests draw from a pool the whole site shares. We may refuse a new guest session from a network that has opened too many in a day. We may refuse or rate-limit generation that would take the product down for everyone else.',
    ],
  },
  {
    heading: 'What you make',
    body: [
      'You keep the rights in the sketches, references and instructions you provide, and in the designs generated for you, to the extent the model provider and the law allow.',
      'You grant SketchMason a licence to store them, to show them back to you, and, if you publish a design to Explore or share a link, to show that design to other people. You must not upload material you do not have the right to use.',
    ],
  },
  {
    heading: 'Acceptable use',
    body: [
      'Do not use SketchMason to break the law, to attack other systems, to probe the generation routes, or to resell access to the shared guest pool. We may suspend a session or an account that does.',
    ],
  },
  {
    heading: 'The service as it stands',
    body: [
      'The canvas is offered as is. Generation can be wrong, slow, or empty. We are not liable for lost work, lost credits, or a design you shipped. If the law in your country does not allow that limit, it applies only as far as that law allows.',
      `Questions: ${CONTACT.email}.`,
    ],
  },
]
