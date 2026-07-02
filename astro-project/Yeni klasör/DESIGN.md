---
name: Lumina Career Systems
colors:
  surface: '#fdf8f5'
  surface-dim: '#ded9d6'
  surface-bright: '#fdf8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ef'
  surface-container: '#f2ede9'
  surface-container-high: '#ece7e4'
  surface-container-highest: '#e6e2de'
  on-surface: '#1c1b19'
  on-surface-variant: '#414943'
  inverse-surface: '#32302e'
  inverse-on-surface: '#f5f0ec'
  outline: '#717973'
  outline-variant: '#c0c9c2'
  surface-tint: '#3a6751'
  primary: '#14422f'
  on-primary: '#ffffff'
  primary-container: '#2d5a45'
  on-primary-container: '#9fcfb5'
  inverse-primary: '#a1d1b7'
  secondary: '#8c4f10'
  on-secondary: '#ffffff'
  secondary-container: '#fdad67'
  on-secondary-container: '#763f00'
  tertiary: '#5b2d2e'
  on-tertiary: '#ffffff'
  tertiary-container: '#764344'
  on-tertiary-container: '#f8b3b3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceed2'
  primary-fixed-dim: '#a1d1b7'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#224f3b'
  secondary-fixed: '#ffdcc2'
  secondary-fixed-dim: '#ffb77b'
  on-secondary-fixed: '#2e1500'
  on-secondary-fixed-variant: '#6d3a00'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#fab5b5'
  on-tertiary-fixed: '#350f11'
  on-tertiary-fixed-variant: '#6a393a'
  background: '#fdf8f5'
  on-background: '#1c1b19'
  surface-variant: '#e6e2de'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
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
  button:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  split-sidebar: 400px
---

## Brand & Style

The design system is engineered for a professional career platform that balances high-utility functionality with a sophisticated, editorial aesthetic. The target audience includes ambitious professionals and enterprise recruiters who require a focused, distraction-free environment. 

The style is **Modern Corporate** with a heavy emphasis on **Minimalism** and **Structured Grid Layouts**. By utilizing a split-screen architectural motif, the interface separates navigation and high-level context from active workspaces. The visual language avoids decorative fluff, relying instead on precise alignment, generous whitespace, and subtle geometric patterns that evoke a sense of progress and architectural stability. The emotional response is intended to be one of clarity, reliability, and executive-level quality.

## Colors

The palette is grounded in an earthy, professional spectrum that avoids the typical "tech blue." 

- **Canvas (#F5F4F0):** Used for the primary background to reduce eye strain and provide a sophisticated, paper-like warmth.
- **Surface (#FFFFFF):** Reserved for interactive cards, input areas, and content containers to create clear separation from the canvas.
- **Accent (#2D5A45):** A deep forest green used for brand presence, success states, and primary navigation indicators.
- **CTA (#B87333):** A copper-tone metallic used exclusively for high-priority actions to ensure immediate visual recognition without relying on traditional "alert" colors.
- **Borders (#DDD9D3):** Used for structural definition. High-contrast enough to define space but muted enough to remain unobtrusive.

## Typography

This design system employs a tri-font strategy to differentiate information hierarchy:
- **Manrope** is used for all headlines and display text, providing a modern, geometric, and authoritative voice. Bold weights are preferred for impact.
- **Inter** handles the bulk of body copy and interface text. It was chosen for its exceptional legibility and neutral character in dense data environments.
- **IBM Plex Sans** is used for utility text—buttons, labels, and small metadata. Its technical, slightly more condensed structure provides a clear "functional" signal to the user, distinguishing interactive elements from static content.

## Layout & Spacing

The layout utilizes a **Split-Screen Logic**. On desktop, the left or right 33% of the screen is often locked as a high-contrast context panel (Canvas color), while the remaining 66% serves as the fluid workspace (Surface color).

- **Grid:** A 12-column system is used for the primary workspace.
- **Gutter:** 24px fixed gutters to maintain high "air" between content blocks.
- **Rhythm:** An 8px linear scale governs all padding and margins.
- **Mobile Adaption:** The split-screen collapses into a stacked vertical view. The "Context Panel" becomes a dismissible top-drawer or a header section.

## Elevation & Depth

This design system avoids heavy shadows, favoring **Tonal Layers** and **Low-Contrast Outlines** to define hierarchy.

- **Level 0 (Canvas):** The base layer (#F5F4F0). Used for the overall page background.
- **Level 1 (Surface):** Content containers and cards (#FFFFFF). These are defined by a 1px solid border (#DDD9D3) rather than shadows.
- **Level 2 (Active/Hover):** When an element is engaged, use a very soft, high-diffusion ambient shadow (4% opacity, 12px blur) to indicate lift, but keep the border visible.
- **Patterns:** Subtle geometric dot-grids or hairline patterns in the Border color may be used in the background of Level 0 areas to add professional texture.

## Shapes

The shape language is **Soft** but disciplined. 

A 4px (`0.25rem`) base radius is applied to most UI components like inputs, small buttons, and tags. Large cards and containers may use up to 8px (`0.5rem`). This slight rounding softens the "Brutalist" tendencies of the grid-heavy layout, making the professional environment feel more approachable and modern without losing its architectural integrity.

## Components

- **Buttons:** 
    - *Primary:* CTA color (#B87333) background, white text. IBM Plex Sans Bold, Uppercase.
    - *Secondary:* Accent color (#2D5A45) outline, 1px. 
    - *Ghost:* No background, Text Muted color, 4px roundedness.
- **Input Fields:** Surface color (#FFFFFF) background with a 1px border (#DDD9D3). On focus, the border shifts to the Accent color (#2D5A45). Labels use `label-caps`.
- **Cards:** White background, 1px border (#DDD9D3), 8px corner radius. No shadow in resting state.
- **Chips/Tags:** Small 2px radius, neutral background (#F5F4F0), `body-sm` typography. Used for skills and job categories.
- **Split-Screen Panel:** A persistent container on the left or right, utilizing the Canvas color. It should house the primary page headline (`display-lg`) and secondary navigation or summary stats.
- **Lists:** Clean rows separated by 1px horizontal rules (#DDD9D3). No alternating row colors; use hover states (5% tint of Canvas color) for interactivity.