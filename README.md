# FC Capital — interactive demo

Responsive Next.js website and eight-step onboarding, based on the approved Arctic Cyan direction. Includes the supplied desktop and mobile trading images, GSAP homepage motion, Lenis desktop smooth scrolling, React Hook Form and Zod validation.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Next.js. `npm run build` checks the production build. `npm run typecheck` checks TypeScript.

## Explore

Open an account from the homepage. Choose **Fill sample details**, then review each step. Confirmations must be checked manually. The simulated verification code is **246810**. Document buttons attach fictional metadata; no local file is read. The final submission creates a demo reference and shows simulated notifications.

Sample application progress is stored in browser **sessionStorage** for this tab. Save & exit returns to the homepage; opening the application again in the same tab resumes it. Reset clears the sample values. A completed receipt can be refreshed in the same tab.

## Boundaries

- No MongoDB, Resend, CRM, authentication, document storage, real uploads or real email delivery is connected.
- Use fictional data only. Browser session storage is not a production identity-document store.
- Admin email appears only in the clearly labelled demo notification inspector.
- Entity details, jurisdiction eligibility, product terms, pricing, leverage, supported currencies, tax requirements and legal documents remain unconfirmed.
- Questionnaire answers are collected for demonstration and do not approve or reject eligibility.
- The homepage instrument examples are static; no price feed is represented.
- GSAP and Lenis run only on the homepage and respect reduced-motion preferences. Onboarding uses normal scrolling.

## Next implementation phase

Confirm business and compliance requirements, private document storage, admin authentication and retention policy before connecting real applications. Add server-side validation and gated review access, genuine email verification with expiry/rate limits, durable database submission and idempotency, Resend notifications and verified sender domain, and production monitoring. CRM remains a separate application.

## Homepage motion update

The homepage now includes a short, skippable candlestick introduction, a pausable moving market ribbon, floating hero cards, section reveals, scroll-linked platform photos and rotating learning-card stacks on desktop and mobile. Phones retain native scrolling; short screens use normal card flow. Reduced-motion preferences disable decorative movement and stacking. Desktop and mobile MT5 images are separately framed with preserved aspect ratios.

Verified with a production build and browser checks at 320px, 390px and 1280px, including loaded images, card transforms, ribbon pause/resume and horizontal overflow. Onboarding components were not changed in this update.
