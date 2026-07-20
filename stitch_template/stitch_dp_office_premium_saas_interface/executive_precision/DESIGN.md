---
name: Executive Precision
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#aec6ff'
  primary: '#aec6ff'
  on-primary: '#002e6b'
  primary-container: '#0564d8'
  on-primary-container: '#e3e9ff'
  inverse-primary: '#005ac4'
  secondary: '#afc6ff'
  on-secondary: '#0d2e64'
  secondary-container: '#29457c'
  on-secondary-container: '#9ab5f3'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#007852'
  on-tertiary-container: '#8fffc9'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004396'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#afc6ff'
  on-secondary-fixed: '#001a43'
  on-secondary-fixed-variant: '#29457c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for high-stakes corporate commission management, where precision meets executive elegance. The brand personality is authoritative yet frictionless, evoking a sense of "quiet luxury" within a high-performance SaaS environment. 

The aesthetic is **Modern Minimalist** with a **Glassmorphic** edge, heavily inspired by the refined utility of developer-centric tools like Vercel and Linear. It prioritizes clarity and focus, using generous whitespace and a strictly governed information hierarchy to reduce cognitive load for users managing complex financial data. The emotional response should be one of total control, reliability, and modern sophistication.

## Colors
The color strategy employs a deep, dark-mode-first hierarchy to provide a premium "command center" feel.

- **Primary Action**: Vibrant Royal Blue (#0564d8) is used exclusively for primary calls-to-action and active states, ensuring high visibility against dark backgrounds.
- **Structural**: Deep Navy (#062a60) is utilized for sidebars and container backgrounds to differentiate navigation from the main workspace.
- **Semantic**: Success states use an Emerald tone (#10b981) to signify completed commissions or positive growth, while Cyan is reserved for secondary data visualizations.
- **Backgrounds**: The canvas uses a near-black slate (#020617), with surfaces elevated using #0f172a and hair-line borders (#1e293b) rather than heavy shadows to maintain a crisp, modern feel.

## Typography
This design system utilizes a dual-font approach to balance character with utility. 

**Outfit** is used for headlines and metrics to provide a contemporary, geometric feel that reflects the brand's premium positioning. **Inter** is the workhorse for all body text, data tables, and interface labels, chosen for its exceptional legibility in high-density data environments.

Maintain a tight tracking (letter-spacing) on larger headlines to ensure a cohesive, "editorial" look. Labels should utilize uppercase styling and increased tracking for clarity when used in small sizes or sidebar headers.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The main content area is capped at 1440px for optimal readability on ultra-wide monitors, while the sidebar remains fixed at 280px. 

A 12-column grid is utilized for dashboard views, allowing metric cards to span 3, 4, or 6 columns. Spacing is strictly based on a 4px baseline grid. Use 24px gutters for data-heavy sections and 32px for marketing-oriented or high-level overview sections to increase the sense of "luxury" through whitespace.

## Elevation & Depth
Depth is created through a combination of **Tonal Layering** and **Glassmorphism**. 

- **Level 0 (Canvas)**: #020617.
- **Level 1 (Cards/Sidebar)**: #0f172a with a 1px solid border (#1e293b).
- **Level 2 (Modals/Dropdowns)**: Backdrop-blur (20px) with 70% opacity fill and a subtle top-down gradient.

Shadows are used sparingly to signify interactivity. When applied, use a deep, diffused shadow: `0 10px 25px rgba(0,0,0,0.4)` to ground floating elements without muddying the dark palette.

## Shapes
The shape language is defined by a consistent **12px (0.75rem)** radius for all primary containers, including cards, input fields, and buttons. This "Rounded" approach softens the technical nature of commission data, making the platform feel more approachable. Smaller elements like chips or badges utilize a fully rounded "Pill" shape to distinguish them from actionable buttons.

## Components

### Sidebar Navigation
The sidebar uses the Deep Navy (#062a60) palette. Active states should feature a subtle vertical gradient (Primary Blue to Transparent) on the left edge and a low-opacity background fill.

### Topbar
The top navigation bar is a "Frosted Glass" element (backdrop-blur: 12px) with a semi-transparent background. It should remain sticky, allowing content to scroll underneath it with a visible blur effect.

### Metric Cards
Metric cards should feature high-contrast Outfit typography for the primary value. Include a subtle SVG sparkline (Success Emerald or Primary Blue) to show trends without overwhelming the card.

### Tables
Tables must be "stylized" with no vertical borders. Use 1px horizontal dividers in #1e293b. Row hover states should use a subtle #1e293b tint. The header row should use the `label-sm` typography style for a technical, organized look.

### Buttons
- **Primary**: Solid Royal Blue with white text. Subtle 2px inner-glow on hover.
- **Secondary**: Ghost style with 1px border (#1e293b).
- **Tertiary**: Text-only with an icon, using Primary Blue for the icon color.

### Input Fields
Fields use the #0f172a background with a 1px #1e293b border. On focus, the border transitions to Primary Blue with a 2px outer glow (ring).