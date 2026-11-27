---
name: Architectural Precision
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#454651'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#767682'
  outline-variant: '#c6c5d2'
  surface-tint: '#4c59a3'
  primary: '#00042a'
  on-primary: '#ffffff'
  primary-container: '#041562'
  on-primary-container: '#7582d0'
  inverse-primary: '#bac3ff'
  secondary: '#bc0007'
  on-secondary: '#ffffff'
  secondary-container: '#e51e19'
  on-secondary-container: '#fffbff'
  tertiary: '#060808'
  on-tertiary: '#ffffff'
  tertiary-container: '#1e2020'
  on-tertiary-container: '#868788'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00105c'
  on-primary-fixed-variant: '#33408a'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4a9'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#930004'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  title-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2.5rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies an architectural, authoritative, and precision-driven ethos. Designed for mission-critical modern technology, enterprise platforms, and technical infrastructure products, the visual language balances solid structural weight with sharp, decisive intent. 

The aesthetic is Modern Corporate Minimalism infused with architectural rhythm:
- **Structural Integrity:** Heavy structural contrast driven by deep anchors and precise light planes.
- **Decisive Directness:** Purposeful utility where high-impact accents command instant action without visual noise.
- **Clarity & Engineering:** Crisp typography, rigorous alignments, clean layered surfaces, and unapologetic hierarchy that instills immediate trust and institutional stability.

## Colors

The palette is engineered around an architectural triad: deep structural navy, razor-sharp crimson, and layered neutral stone planes.

- **Primary Structural Brand (#041562):** Serves as the primary brand tone, dark headings, primary navigation bars, active states, and grounding structural outlines. It delivers maximum stability and replaces conventional carbon blacks.
- **High-Impact Accent (#DA1212):** Reserved strictly for primary calls-to-action, key conversion paths, critical badges, focus indicators, and high-priority metrics. It must never be diluted with casual usage; its power relies on selective, high-contrast emergence.
- **Canvas Base (#EEEEEE):** Acts as the foundational page background canvas, establishing a calm, tactile plane that eliminates glare while providing clear separation against pure white components.
- **Elevated Surfaces (#FFFFFF):** Used for elevated cards, modal sheets, floating containers, data grid bodies, and active surface segments.

### Functional Roles
- **Canvas Background:** `#EEEEEE`
- **Surface / Card Background:** `#FFFFFF`
- **Headings & Body Copy (Primary):** `#041562`
- **Secondary / Supporting Text:** `rgba(4, 21, 98, 0.68)`
- **Structural Dividers & Outlines:** `rgba(4, 21, 98, 0.12)`
- **Interactive Accent / CTA:** `#DA1212`
- **Accent Hover:** `#B80E0E`

## Typography

The typography is built around Plus Jakarta Sans, combining humanist approachability with a clean, geometric structural backbone.

- **Weight Discipline:** Restrict font weight usage to 400 (regular body text), 600 (structural labels, subheadings, and interactive components), 700 (standard headers), and 800 (display impact).
- **Proportional Tracking:** Large headlines and display styles carry tight negative letter-spacing to emphasize density and architectural solidity. Uppercase labels and data meta-tags carry explicit positive tracking for scannability.
- **Hierarchy Separation:** All primary headings must render strictly in Deep Navy (`#041562`). Secondary content uses Deep Navy at 68% opacity, sustaining consistent tonal warmth rather than falling back to detached slate greys.

## Layout & Spacing

The layout philosophy follows a strict 12-column responsive fluid grid with an architectural, block-aligned hierarchy. 

### Breakpoints & Adaptive Rules
- **Desktop (≥ 1280px):** 12-column layout, 2.5rem (`margin`) canvas gutters, 1.5rem (`gutter`) interior column spacing. Content surfaces are framed with generous breathing room.
- **Tablet (768px – 1279px):** 8-column layout, 1.5rem margins, 1rem gutters. Sidebars collapse to rail navigation or top bars.
- **Mobile (< 768px):** 4-column layout, 1rem (`margin-sm`) canvas edges, 1rem (`gutter-sm`) inter-column spacing. Multi-column cards stack vertically into a single cohesive column.

### Grid Alignment
Cards and data containers align strictly to the vertical rhythm. Section vertical padding uses `space-xl` (2.5rem), creating distinct functional horizontal terraces across the pale grey canvas.

## Elevation & Depth

Visual hierarchy leverages crisp surface tonal shifts reinforced with ultra-subtle, deep-navy ambient shadows rather than generic fuzzy drop shadows.

- **Level 0 (Canvas Base):** Background floor set to `#EEEEEE`. Flat, static, uncast.
- **Level 1 (Surface Cards & Panels):** Solid `#FFFFFF` surfaces perched over the `#EEEEEE` plane. Framed with a 1px structural outline (`rgba(4, 21, 98, 0.08)`) and an ambient anchor shadow: `0 4px 16px -2px rgba(4, 21, 98, 0.05)`.
- **Level 2 (Dropdowns, Floating Toolbars, Active Cards):** Lifted `#FFFFFF` surface with an outline of `1px solid rgba(4, 21, 98, 0.12)` and shadow `0 10px 24px -4px rgba(4, 21, 98, 0.08)`.
- **Level 3 (Modals, Overlays, Dialogs):** Centered `#FFFFFF` geometry elevated with a 40% Deep Navy backdrop blur wash (`rgba(4, 21, 98, 0.40)` with `backdrop-filter: blur(4px)`) and a deep dispersion shadow: `0 24px 48px -12px rgba(4, 21, 98, 0.16)`.

## Shapes

The shape system adopts a balanced architectural contour using roundedness level 2:
- **Base UI Elements:** Inputs, secondary buttons, badges, chips, and small controls utilize a consistent `0.5rem` (8px) radius.
- **Structural Containers (`rounded-lg`):** Cards, modal dialogs, dashboard widgets, and main content panels utilize a `1rem` (16px) radius, providing a refined, contemporary bevel that softens dense technical layouts without appearing toy-like.
- **Large Panels (`rounded-xl`):** Hero containers and oversized modal sheets scale up to `1.5rem` (24px).
- **Proportional Cohesion:** Nested elements inside cards must scale down their radii (e.g., an 8px element inside a 16px card with 16px padding) to maintain geometric concentricity.

## Components

### Buttons
- **Primary CTA:** Background `#DA1212`, text `#FFFFFF`, border none, border-radius `0.5rem`, typography `label-md`. Hover state shifts to `#B80E0E`. Active state applies `transform: scale(0.99)`. Focus ring: 2px offset with 2px solid `#DA1212`.
- **Secondary (Structural):** Background `#041562`, text `#FFFFFF`, border-radius `0.5rem`. Hover state: `rgba(4, 21, 98, 0.92)`.
- **Outline / Ghost:** Background transparent, border `1.5px solid #041562`, text `#041562`. Hover state: background `rgba(4, 21, 98, 0.05)`.

### Cards
- **Construction:** Background `#FFFFFF`, border-radius `1rem` (`rounded-lg`), border `1px solid rgba(4, 21, 98, 0.08)`, shadow `0 4px 16px -2px rgba(4, 21, 98, 0.05)`.
- **Internal Padding:** `1.5rem` (`space-lg`).
- **Interactive State:** Hover elevates to Level 2 shadow with border darkening to `rgba(4, 21, 98, 0.18)` and an optional 2px `#DA1212` top accent trim on hero metrics.

### Input Fields
- **Container:** Background `#FFFFFF`, height 44px, border `1.5px solid rgba(4, 21, 98, 0.18)`, border-radius `0.5rem`, padding `0 1rem`.
- **Text:** Deep Navy `#041562`, placeholder `rgba(4, 21, 98, 0.40)`.
- **States:** Focus produces `border-color: #041562` with a `0 0 0 3px rgba(4, 21, 98, 0.10)` glow ring. Error state switches border to `#DA1212` with `rgba(218, 18, 18, 0.10)` glow ring.

### Chips & Badges
- **Status / Critical Badges:** Background `rgba(218, 18, 18, 0.10)`, text `#DA1212`, border `1px solid rgba(218, 18, 18, 0.20)`, border-radius `0.5rem`, typography `label-sm` uppercase.
- **Structural Tags:** Background `#EEEEEE`, text `#041562`, border `1px solid rgba(4, 21, 98, 0.08)`, border-radius `0.5rem`.

### Checkboxes & Radio Buttons
- **Unchecked:** Border `1.5px solid rgba(4, 21, 98, 0.35)`, background `#FFFFFF`, border-radius `4px` (checkbox) or circular (radio).
- **Checked:** Background `#041562`, checkmark icon `#FFFFFF`, border `1.5px solid #041562`. Accent toggle variants use `#DA1212` where high visibility is mandated.

### Lists & Data Tables
- **Rows:** Alternating rows leverage `#FFFFFF` and subtle `#F8F8F8`, separated by `1px solid rgba(4, 21, 98, 0.06)`.
- **Header:** `#EEEEEE` background, text `#041562`, typography `label-sm` uppercase tracking, padding `0.75rem 1rem`.
- **Hover:** Active row hover surfaces with `rgba(4, 21, 98, 0.03)` tint.