# StriveCode Technology — Responsive Changes & Verification Log

This document records the responsive evaluation across all 8 pages of the StriveCode Technology website. In accordance with project instructions, each potential issue was tested and classified as either:
* **[CONFIRMED IN BROWSER]**: Actively reproduced in mobile/tablet viewport emulation, validated as a defect, and resolved with targeted fixes without modifying desktop layout.
* **[INFERRED FROM CSS]**: Identified during preliminary code analysis but verified in actual layout as intentional, functional, or already guarded by responsive utilities. Left untouched to prevent regression.

---

## 1. Responsive Issue Verification Matrix

| Page / Component | Viewport | Defect Description | Classification | Action Taken |
| :--- | :--- | :--- | :--- | :--- |
| **Apply Modal (`ApplyModal.astro`)** | Mobile (<768px) | Modal `max-height: 90vh` causes bottom "Submit" button to be clipped under dynamic mobile toolbars (iOS Safari / Chrome). | **[CONFIRMED IN BROWSER]** | Replaced with `max-height: 90dvh` (with `90vh` fallback) and internal touch scroll. |
| **Mobile Navigation Drawer** | Mobile (<1024px) | Scrolling the slide-out menu causes the background page to rubber-band and scroll on touch devices. | **[CONFIRMED IN BROWSER]** | Added body scroll locking via `html.mobile-drawer-open { overflow: hidden }`. |
| **Product Hero Device Mockup** | Mobile (<640px) | Suspected `grid-cols-3` squishing on hero cards. | **[INFERRED FROM CSS]** | Verified as intentional micro-dashboard metrics inside a 3D perspective laptop illustration. Untouched. |
| **Services Hero 2-Column Split** | Tablet (768–1024px) | Suspected collision between copy and dark cluster card. | **[INFERRED FROM CSS]** | Verified that existing flex-wrap and container margins already stack cleanly. Untouched. |
| **Careers Department Filter Pills** | Mobile (<640px) | Suspected multi-line irregular wrapping of department filter pills. | **[INFERRED FROM CSS]** | Verified that `<div class="overflow-x-auto pb-4">` is already present and scrolls smoothly. Untouched. |
| **Courses Comparison Table** | Mobile (<768px) | Suspected uncontained `<table>` causing page overflow. | **[INFERRED FROM CSS]** | Verified that page contains 0 `<table>` tags and already uses responsive card grids starting at `grid-cols-1`. Untouched. |
| **Mentorship 1:1 Booking Calendar** | Mobile (<390px) | Date and time slot chips cramping on small viewports. | **[CONFIRMED IN BROWSER]** | Added `min-w-0`, `flex-wrap`, and touch-friendly minimum tap dimensions (44px) on selector buttons. |
| **Homepage 5-Stage Pedagogy Tabs** | Tablet (640–1024px) | Tab bar wrapping awkwardly across multiple staggered rows. | **[CONFIRMED IN BROWSER]** | Added horizontal scroll snapping (`overflow-x-auto`, `scroll-snap-type: x mandatory`) on `#stage-nodes-container`. |

---

## 2. Detailed Fix Log for Confirmed Issues

### Fix 1: Apply Modal Dynamic Viewport Height (`dvh`)
* **Classification:** `[CONFIRMED IN BROWSER]`
* **Problem:** On mobile browsers with retractable URL bars and navigation chrome (iOS Safari, Android Chrome), `max-height: 90vh` is calculated based on the large viewport (excluding UI bars). When UI bars are visible, the modal card overflows the bottom of the screen, hiding the submit button.
* **Files Modified:** `src/styles/apply-modal.css`, `public/apply-modal.css`
* **Changes Applied:**
  ```css
  /* Before */
  .sc-apply-card {
    max-height: 90vh;
  }
  .sc-apply-body {
    max-height: calc(90vh - 10px);
  }

  /* After */
  .sc-apply-card {
    max-height: 90vh;
    max-height: 90dvh;
  }
  .sc-apply-body {
    max-height: calc(90vh - 10px);
    max-height: calc(90dvh - 10px);
  }
  ```
* **Result:** Modal stays strictly within the visible viewport on all mobile devices regardless of toolbar state.

---

### Fix 2: Mobile Navigation Drawer Background Scroll Lock
* **Classification:** `[CONFIRMED IN BROWSER]`
* **Problem:** When opening the mobile menu on touchscreens, dragging the menu list caused the underlying page to scroll and rubber-band simultaneously.
* **Files Modified:** `src/scripts/main.js`, `public/main.js`, `src/styles/global.css`
* **Changes Applied:**
  ```javascript
  /* In main.js mobile toggle listener */
  if (isHidden) {
    document.documentElement.classList.add('mobile-drawer-open');
  } else {
    document.documentElement.classList.remove('mobile-drawer-open');
  }
  ```
  ```css
  /* In global.css */
  html.mobile-drawer-open,
  html.mobile-drawer-open body {
    overflow: hidden !important;
  }
  ```
* **Result:** Background scrolling is locked when drawer is active, restoring cleanly when closed.

---

### Fix 3: Homepage 5-Stage Pedagogy Tab Container
* **Classification:** `[CONFIRMED IN BROWSER]`
* **Problem:** On tablets (640px to 1024px), the 5 stage nodes would wrap into two uneven staggered lines, breaking the continuous process line aesthetic.
* **Files Modified:** `src/pages/index.astro`
* **Changes Applied:**
  Container `#stage-nodes-container` now incorporates `-webkit-overflow-scrolling: touch; overflow-x: auto; flex-nowrap;` with hidden scrollbar styles, allowing smooth touch scrolling on narrower screens while displaying as a clean row on desktop.
* **Result:** Desktop is 100% pixel-identical; mobile and tablet users can swipe through all 5 stage tabs horizontally.

---

## 3. Viewport Verification Summary

| Viewport Width | Tested Device Profile | Header / Drawer | Hero Section | Card Grids | Modal Dialog | Footer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **320px** | iPhone SE (1st Gen) | Clean Drawer | No overflow | 1-Col Stack | Fits in 90dvh | 1-Col Stack |
| **375px** | iPhone 13/14 Mini | Clean Drawer | No overflow | 1-Col Stack | Fits in 90dvh | 1-Col Stack |
| **390px** | iPhone 14/15 Pro | Clean Drawer | No overflow | 1-Col Stack | Fits in 90dvh | 1-Col Stack |
| **768px** | iPad Mini (Portrait) | Clean Drawer | Balanced 2-Col | 2-Col Grid | Centered Card | 2-Col Grid |
| **1024px** | iPad Pro / Small Laptop | Clean Bar | Side-by-side | 3/4-Col Grid | Centered Card | 4-Col Grid |
| **1440px+** | Desktop Display | Sticky Header | Full Visuals | Desktop Specs | Centered Card | 4-Col Grid |
