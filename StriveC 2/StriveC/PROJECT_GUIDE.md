# StriveCode Technology — Astro Migration & Project Guide

This document is the engineering reference guide for the converted StriveCode Technology website. It details the Astro architecture, directory layout, core components, routing, form workflows, future backend integration, and deployment instructions.

---

## 1. Project Overview & Architecture

* **Framework:** [Astro](https://astro.build/) (`output: 'static'`)
* **Styling:** Tailwind CSS (v3 with build-time purging via `@astrojs/tailwind`), `@tailwindcss/forms`, and `@tailwindcss/container-queries`. Custom color tokens, font declarations, and spacing are preserved 100% pixel-identical to the original site.
* **Hosting Target:** [Vercel](https://vercel.com/) (configured via `vercel.json` with enterprise security headers and immutable asset caching).
* **Security & Performance:** Strict Content-Security-Policy (CSP), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, zero runtime JS dependencies for static pages.
* **SEO:** Dynamic canonical URLs, Schema.org Organization structured data (JSON-LD), OpenGraph and Twitter card metadata, `robots.txt`, and XML sitemap.

---

## 2. Directory Structure

```
.
├── public/                       # Static public assets (served at root /)
│   ├── _headers                  # Hosting security headers
│   ├── apply-modal.css           # Modal namespaced styling
│   ├── apply-modal.js            # Universal 13-field modal logic & event delegation
│   ├── grid-matrix.js            # Interactive background grid canvas animation
│   ├── logo.jpg                  # StriveCode logo asset
│   ├── main.js                   # Mobile drawer, scroll reveal, and page transitions
│   ├── mentorship-dots.css       # Mentorship hero canvas styles
│   ├── mentorship-dots.js        # Mentorship floating dots canvas script
│   ├── mentorship-logo.css       # Mentorship animated badge styles
│   ├── mentorship-logo.png       # Mentorship badge logo
│   ├── mentorship-nav.css        # Mentorship dual-state navbar styles (sc-mnav-)
│   ├── mentorship-nav.js         # Mentorship dual-state navbar controller (sc-mnav-)
│   ├── nav.css                   # Navigation typography and reset
│   ├── robots.txt                # Search engine crawl directives
│   ├── sitemap.xml               # Canonical XML sitemap
│   └── style.css                 # Base resets and animations
├── src/
│   ├── assets/                   # Bundled project assets
│   ├── components/
│   │   ├── ApplyModal.astro      # Universal 13-field popup modal component
│   │   ├── Footer.astro          # Canonical StriveCode master footer
│   │   └── Navbar.astro          # Sticky responsive header with active link indicators
│   ├── layouts/
│   │   └── BaseLayout.astro      # Master layout: <head>, SEO, Fonts, Canvas, Loader
│   ├── pages/
│   │   ├── 404.astro             # Branded 404 Error page
│   │   ├── aboutus.astro         # /aboutus (About StriveCode)
│   │   ├── careers.astro         # /careers (Career Openings & Culture)
│   │   ├── contact.astro         # /contact (Enterprise Inquiries)
│   │   ├── courses.astro         # /courses (Engineering Tracks & Curriculum)
│   │   ├── index.astro           # / (Homepage with preloader)
│   │   ├── mentorship.astro      # /mentorship (1-on-1 Mentorship & Booking)
│   │   ├── product.astro         # /product (Enterprise Software Ecosystem)
│   │   └── services.astro        # /services (Architecture & Delivery Solutions)
│   └── styles/
│       └── global.css            # Merged Tailwind directives, resets & utility styles
├── astro.config.mjs              # Astro configuration (static output, site URL)
├── package.json                  # Dependencies & npm build scripts
├── tailwind.config.mjs           # Merged Tailwind theme tokens across all pages
├── tsconfig.json                 # TypeScript strict configuration
└── vercel.json                   # Vercel deployment & security header configuration
```

---

## 3. Route Mapping Table

| Source File | Astro Page Path | URL Route | Nav Active Label | Background Grid |
| :--- | :--- | :--- | :--- | :--- |
| `Homepage.html` | `src/pages/index.astro` | `/` | Home | Active (`grid-matrix.js`) |
| `Product.html` | `src/pages/product.astro` | `/product` | Product | Active (`grid-matrix.js`) |
| `Services.html` | `src/pages/services.astro` | `/services` | Services | Active (`grid-matrix.js`) |
| `Courses.html` | `src/pages/courses.astro` | `/courses` | Course | Disabled (custom theme) |
| `Careers.html` | `src/pages/careers.astro` | `/careers` | Careers | Active (`grid-matrix.js`) |
| `Mentorship.html` | `src/pages/mentorship.astro` | `/mentorship` | Mentorship | Disabled (mesh & flowing dots) |
| `Aboutus.html` | `src/pages/aboutus.astro` | `/aboutus` | About us | Active (`grid-matrix.js`) |
| `Contact.html` | `src/pages/contact.astro` | `/contact` | Contact | Active (`grid-matrix.js`) |
| *(New)* | `src/pages/404.astro` | `/404` | — | Active (`grid-matrix.js`) |

---

## 4. Shared Components & Capabilities

### `BaseLayout.astro`
* Controls HTML `<head>`, viewport definitions, Google Fonts preconnect (`Plus Jakarta Sans`, `Inter`, `JetBrains Mono`), Material Symbols Outlined, and SEO schema.
* Manages the Homepage Preloader (`isHome={true}`) inline within `<head>` and `<body>` to guarantee instant first-paint without layout shift or FOUC.
* Mounts `<Navbar />`, `<slot />`, `<Footer />`, and `<ApplyModal />`.
* Dynamically activates `#sc-grid-matrix` on appropriate routes.

### `Navbar.astro`
* Source of truth based directly on `Homepage.html`.
* Detects current route via `Astro.url.pathname` and applies active styling:
  * Desktop: `text-[#041562] font-bold border-b-2 border-[#DA1212] pb-0.5`
  * Mobile: `text-[#041562] font-bold text-sm py-1.5 border-l-2 border-[#DA1212] pl-3`
* Features an accessible mobile slide-out drawer with body scroll lock.

### `Footer.astro`
* Master 4-column executive layout directly ported from `Homepage.html`.
* Links to all internal sections, registered company details, CIN, GSTIN, and direct desk contact information.

### `ApplyModal.astro`
* Fully accessible modal containing all **13 fields**:
  1. Full Name (`#sc-apply-name`)
  2. Email Address (`#sc-apply-email`)
  3. Phone Number with +91 prefix (`#sc-apply-phone`)
  4. Application Category (`#sc-apply-category`)
  5. Program or Role selection (`#sc-apply-program`)
  6. Current Status (`#sc-apply-status`)
  7. College / Company Name (`#sc-apply-org`)
  8. Experience Level (`#sc-apply-experience`)
  9. City / Location (`#sc-apply-location`)
  10. LinkedIn / GitHub / Portfolio (`#sc-apply-portfolio`)
  11. Preferred Start Timeline (`#sc-apply-timeline`)
  12. Goals / Message (`#sc-apply-message`)
  13. Consent Agreement Checkbox (`#sc-apply-agree`)
* Includes `PROGRAM_DATA` with the 4 categories:
  * **Engineering Course**: 6 programs
  * **Career Opportunity**: 6 roles
  * **1-on-1 Mentorship**: 3 tracks
  * **Enterprise Project Inquiry**: 4 services
* Listens to all **28 Apply triggers** across all 8 pages using intelligent event delegation and context detection.

### `InternTestimonials.astro` (Homepage Section)
* **Location:** `src/components/InternTestimonials.astro`
* **Class & ID Prefix:** `sc-testi-` (all styling, IDs, and classes are strictly scoped with this prefix)
* **Runtime Assets:**
  * Styling: `public/intern-testimonials.css` (loaded on Homepage via `<link rel="stylesheet" href="/intern-testimonials.css" />`)
  * Interactivity: `public/intern-testimonials.js` (loaded on Homepage via `<script is:inline src="/intern-testimonials.js"></script>`)
  * Optimized Avatar Assets: `public/assets/testimonials/`
* **Features:**
  * Build-time static markup using `<section>`, `<h2>`, `<figure>`, `<blockquote>`, and `<figcaption>`.
  * Progressive enhancement: Content is 100% visible by default with no JS; JS arms `sc-testi-js` for scroll reveals via `IntersectionObserver`.
  * 3D tilt interaction (clamped to $\pm 4^\circ$) and radial spotlight following pointer on cards via single delegated `pointermove` listener and `requestAnimationFrame`.
  * Top red accent scale bar, circular photo sweep ring, and decorative quote drift.
  * Card focus dimming effect when hovering.
  * Responsive layout: 3 cards on row 1, 2 cards centered on row 2 (desktop); 2 columns with centered 5th card (tablet); 1 column (mobile).
  * Accessible: `prefers-reduced-motion: reduce` disables all motion; touch devices provide subtle `:active` press without tilt.
* **How to Edit or Add a Testimonial:**
  * Open `src/components/InternTestimonials.astro` and edit the `testimonials` array in the component's frontmatter:
    ```typescript
    {
      name: "Student Name",
      role: "Engineering Intern",
      quote: "Exact quote text...",
      photo: "/assets/testimonials/testimonial-name.jpg"
    }
    ```
* **How to Remove the Section:**
  1. In `src/pages/index.astro`, remove `import InternTestimonials from '../components/InternTestimonials.astro';`.
  2. Remove `<link rel="stylesheet" href="/intern-testimonials.css" />` from `<Fragment slot="head">`.
  3. Remove `<InternTestimonials />` from the template.
  4. Remove `<script is:inline src="/intern-testimonials.js"></script>` from `<Fragment slot="scripts">`.

### Mentorship Dual-State Navbar Controller (Option A)
* **Prefix:** `sc-mnav-` (isolated strictly to `/mentorship`).
* **Runtime Assets:**
  * `public/mentorship-nav.css` — Hero state styling, white typography, rounded logo badge, transitions, mobile menu open override, and `prefers-reduced-motion` handling.
  * `public/mentorship-nav.js` — Client-side `IntersectionObserver` observing `#heroSection`, dynamic navbar height adjustment, hysteresis buffer, back/forward cache (`pageshow`), resize observer, and mobile drawer sync.
  * `src/pages/mentorship.astro` — Injects `<link rel="stylesheet" href="/mentorship-nav.css" />`, early inline zero-flash `<script>` in `<head>`, and `<script is:inline src="/mentorship-nav.js"></script>` in `<Fragment slot="scripts">`.
* **Behavior:**
  * **At the top:** The navbar matches the `#041562` hero navy background with zero bottom border or shadow, presenting a continuous seamless surface. Nav links and brand text transition to white ($14.2:1$ contrast ratio), the active "Mentorship" link retains its red underline, and the logo badge displays harmoniously.
  * **On scroll below hero:** The navbar smoothly transitions back to standard `bg-white/95`, `#041562` navy text, and `#e0e0e0` bottom border over $0.6\text{s}$ using `cubic-bezier(0.22, 1, 0.36, 1)`.
  * **Mobile Drawer:** When `#mobile-menu` opens, the navbar switches to white so the header and drawer panel match seamlessly.
  * **No-JS Safe:** If JavaScript is disabled or fails to run, the navbar renders as the default white navbar.
* **How to Remove or Alter:**
  1. In `src/pages/mentorship.astro`, remove `<link rel="stylesheet" href="/mentorship-nav.css" />` and the `<script is:inline>` block from `<Fragment slot="head">`.
  2. In `src/pages/mentorship.astro`, remove `<script is:inline src="/mentorship-nav.js"></script>` from `<Fragment slot="scripts">`.
  3. Delete `public/mentorship-nav.css` and `public/mentorship-nav.js`.

---

## 5. Form Workflows & Future Backend Integration

All forms retain client-side validation, interactive UI feedback states, and a simulated network delay with mailto fallbacks. No external `/api/*` endpoints are called.

### How to Connect a Future Backend API:

1. **Apply Modal Form:**
   * Open `public/apply-modal.js` and locate `function submitApplication(data)`.
   * Find the clearly marked placeholder comment:
   ```javascript
   /* =========================================================================
      PLACEHOLDER: Future Backend API Integration
      When ready to connect backend, replace the mailto fallback block below with:
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      ========================================================================= */
   ```
   * Replace the silent mailto trigger with your `fetch()` call.

2. **Enterprise Contact Form (`/contact`):**
   * Open `src/pages/contact.astro` and locate the form submit listener.
   * Replace the placeholder with your `fetch('/api/contact', { ... })` call.

3. **1-on-1 Mentorship Booking Form (`/mentorship`):**
   * Open `src/pages/mentorship.astro` and locate the booking widget submit handler.
   * Replace the placeholder with your `fetch('/api/mentorship/book', { ... })` call.

---

## 6. Development & Build Commands

```bash
# Run local development server
npm run dev

# Build production static website (outputs to /dist)
npm run build

# Preview production build locally
npm run preview
```

---

## 7. Vercel Deployment

1. Link your Git repository to Vercel.
2. Set the framework preset to **Astro**.
3. Build command: `npm run build`
4. Output directory: `dist`
5. `vercel.json` is pre-configured with immutable caching for assets and strict security headers.

---

## 8. Astro Template Guidelines & Code Integrity

To maintain visual parity and prevent compiler AST parse regressions, adhere to the following rules:

1. **Escaping Curly Braces in Code Snippets:**
   * In `.astro` templates, raw `{` and `}` characters outside `<script>` or `<style>` are parsed as JSX expressions.
   * If showcasing code blocks (e.g., TypeScript interfaces, JSON), always escape them using HTML entities: `&#123;` and `&#125;` (or `{"{"}` and `{"}"}`). Failing to do so causes the Astro compiler to drop following closing tags (e.g. `</section>`), which breaks page layout.

2. **Semantic `<main>` Tag Structure:**
   * `BaseLayout.astro` is the single owner of the top-level `<main class="flex-grow">` container.
   * Page templates slotted into `BaseLayout` should use direct `<section>` elements or container `<div>` elements, never an inner `<main>` tag.

3. **Page-Specific CSS & Scripts:**
   * Page-specific styles and keyframe animations belong inside `<Fragment slot="head"><style is:inline>...</style></Fragment>`.
   * Page-specific scripts belong inside `<Fragment slot="scripts"><script is:inline>...</script></Fragment>`.
   * Shared interactive scripts belong in `public/` and are included centrally via `BaseLayout.astro`.

4. **Navbar Alignment:**
   * Inactive navbar links must retain `border-b-2 border-transparent pb-0.5` to match the exact 25px height of the active link (`border-b-2 border-[#DA1212] pb-0.5`), guaranteeing 0.0px vertical baseline alignment across all navigation links.
