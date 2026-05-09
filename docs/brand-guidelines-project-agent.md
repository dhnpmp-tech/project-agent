# Project Agent by DCP - Brand Guidelines

**Version:** 1.0
**Date:** 2026-04-12
**Status:** Draft for Review

---

## 1. Brand Overview

### Brand Name
**Project Agent** is the product name. **DCP** is the parent company.

### Name Treatments

| Context | Format |
|---------|--------|
| **Full formal** | Project Agent by DCP |
| **Product only** | Project Agent |
| **Domain/URL** | projectagent.ai / projectagent.io |
| **Short reference** | PA |
| **Arabic** | بروجكت إيجنت من DCP |
| **Tagline (EN)** | "Your Business, Always On" |
| **Tagline (AR)** | "عملك، دائماً متاح" |
| **Alternative taglines** | "AI That Runs Your Business" / "الذكاء الذي يدير أعمالك" |

### Hierarchy
```
DCP (parent brand - minimal presence)
  |
  +-- Project Agent (product brand - hero presence)
        |
        +-- [Client business name] (white-labeled for end customers)
```

The "by DCP" tagline appears in small type beneath or beside "Project Agent" in formal contexts (proposals, contracts, about pages). It does NOT appear in customer-facing touchpoints where the client's brand takes center stage.

---

## 2. Color Palette

### Design Philosophy
Dark-first. The interface and brand materials lead with near-black backgrounds, creating depth and premium feel. Emerald serves as the primary accent -- signaling growth, intelligence, and trust. The palette avoids the sterile blue that dominates most SaaS products, choosing instead a color that resonates with both the tech and hospitality sectors.

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Void** | `#0a0a0a` | 10, 10, 10 | Primary background, hero sections |
| **Emerald** | `#10b981` | 16, 185, 129 | Primary accent, CTAs, active states, links |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Emerald Light** | `#34d399` | 52, 211, 153 | Hover states, highlights, gradients |
| **Emerald Dark** | `#059669` | 5, 150, 105 | Pressed states, secondary buttons |
| **Emerald Subtle** | `#10b98115` | 16, 185, 129, 8% | Background tints, card highlights |
| **Emerald Glow** | `#10b98130` | 16, 185, 129, 19% | Glows, focus rings, ambient effects |

### Neutral Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Charcoal** | `#171717` | 23, 23, 23 | Card backgrounds, elevated surfaces |
| **Graphite** | `#262626` | 38, 38, 38 | Borders, dividers, secondary surfaces |
| **Slate** | `#404040` | 64, 64, 64 | Disabled states, subtle borders |
| **Ash** | `#737373` | 115, 115, 115 | Placeholder text, tertiary content |
| **Silver** | `#a3a3a3` | 163, 163, 163 | Secondary text, captions |
| **Cloud** | `#d4d4d4` | 212, 212, 212 | Body text (on dark) |
| **Snow** | `#fafafa` | 250, 250, 250 | Primary text (on dark), headings |

### Semantic Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Success** | `#10b981` | 16, 185, 129 | Confirmations (same as Emerald) |
| **Error** | `#ef4444` | 239, 68, 68 | Errors, destructive actions |
| **Warning** | `#f59e0b` | 245, 158, 11 | Warnings, attention needed |
| **Info** | `#3b82f6` | 59, 130, 246 | Informational, neutral alerts |

### Gradient

```css
/* Primary gradient - for hero sections, feature cards */
background: linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #0a0a0a 100%);

/* Emerald accent gradient - for CTAs, progress bars */
background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);

/* Glow effect - for cards on hover */
box-shadow: 0 0 60px rgba(16, 185, 129, 0.15);
```

### Light Mode (Secondary)
For printed materials, proposals, and email templates where dark backgrounds are impractical:

| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#ffffff` | Page background |
| **Surface** | `#f5f5f5` | Cards, sections |
| **Text Primary** | `#171717` | Headings |
| **Text Secondary** | `#525252` | Body text |
| **Accent** | `#059669` | Use Emerald Dark (better contrast on white) |

---

## 3. Typography

### Design Philosophy
Clean, geometric, highly legible. The type system must work flawlessly in both English and Arabic, at every size from mobile interfaces to presentation decks.

### English Type Stack

| Role | Font | Weight | Size Range | Fallback |
|------|------|--------|------------|----------|
| **Headings** | Inter | 600 (SemiBold), 700 (Bold) | 24-64px | system-ui, sans-serif |
| **Body** | Inter | 400 (Regular), 500 (Medium) | 14-18px | system-ui, sans-serif |
| **Code / Data** | JetBrains Mono | 400, 500 | 13-15px | monospace |
| **Display (Marketing)** | Inter | 800 (ExtraBold) | 48-96px | system-ui, sans-serif |

**Why Inter?** Free, open source (SIL license), variable font, excellent at small sizes, wide language support, used by Linear, Vercel, and Raycast -- brands that align with our aesthetic.

### Arabic Type Stack

| Role | Font | Weight | Size Range | Fallback |
|------|------|--------|------------|----------|
| **Headings** | IBM Plex Arabic | 600, 700 | 26-68px | Noto Sans Arabic, sans-serif |
| **Body** | IBM Plex Arabic | 400, 500 | 15-19px | Noto Sans Arabic, sans-serif |
| **Alternative** | Cairo | 400, 600, 700 | 14-64px | Noto Sans Arabic, sans-serif |

**Why IBM Plex Arabic?** Designed to harmonize with Latin Plex (and by extension, with geometric sans-serifs like Inter). Excellent legibility in UI contexts. Free and open source.

**Why Cairo as alternative?** Google Fonts hosted, extremely popular in MENA region, versatile sans-serif that works for both headings and body.

### Print Type Stack

| Role | Font | Fallback |
|------|------|----------|
| **Headings (EN)** | Inter or Söhne | Helvetica Neue |
| **Body (EN)** | Inter | Helvetica Neue |
| **Headings (AR)** | IBM Plex Arabic | Noto Sans Arabic |
| **Body (AR)** | IBM Plex Arabic | Noto Sans Arabic |

### Type Scale

```
xs:    12px / 1.5 line-height  -- Captions, labels
sm:    14px / 1.5              -- Secondary text, metadata
base:  16px / 1.6              -- Body text
lg:    18px / 1.6              -- Lead paragraphs
xl:    20px / 1.4              -- Section titles (small)
2xl:   24px / 1.3              -- Section titles
3xl:   30px / 1.2              -- Page titles
4xl:   36px / 1.1              -- Hero subtitles
5xl:   48px / 1.0              -- Hero titles
6xl:   64px / 1.0              -- Display (marketing)
```

### Bilingual Layout Rules
- Arabic text size should be 105-110% of the English equivalent for equal optical weight
- Arabic line-height should be 1.6-1.8 for body text (slightly more generous than English)
- Never mix Arabic and English in the same line unless it is a proper noun or brand name
- Right-to-left (RTL) layouts mirror the entire interface, not just text direction

---

## 4. Logo Concepts

Five concepts for generation with MiniMax or a design tool. All concepts share the same design principles: geometric, minimal, works at 16px favicon size, no mascots, no gradients in the mark itself.

### Concept 1: "The Node"
A single hexagonal node with three connection lines extending outward, forming a subtle "A" shape (for Agent). Represents the AI agent as the central hub connecting business operations.
- **Mark:** Hexagon with 3 extending lines at 120-degree intervals
- **Style:** Stroke-based, 2px weight, emerald on dark
- **Wordmark:** "Project Agent" in Inter SemiBold, "by DCP" in Inter Regular at 60% size below
- **Favicon:** Hexagon only

### Concept 2: "The Pulse"
Two overlapping circles (representing conversation/dialogue) with a horizontal pulse line running through them (representing always-on intelligence). Evokes both a chat bubble and a heartbeat monitor.
- **Mark:** Two intersecting circles with a sine wave through the intersection
- **Style:** Filled circles in emerald at different opacities (100% and 40%)
- **Wordmark:** "Project Agent" in Inter Bold
- **Favicon:** Circles + pulse simplified

### Concept 3: "The Stack"
Three horizontal bars of decreasing width, stacked vertically with small gaps. The top bar has a small square "cursor" at its right end, suggesting both a command line and a layered architecture. Minimal and technical.
- **Mark:** Three bars (widths: 100%, 75%, 50%) with cursor block
- **Style:** Solid emerald bars on void background
- **Wordmark:** "Project Agent" in Inter Medium, letterspaced +2%
- **Favicon:** Three bars only

### Concept 4: "The Shield"
A rounded square (like an app icon shape) with a subtle "PA" monogram inside. The "P" and "A" share a vertical stroke, creating an efficient ligature. Conveys protection, reliability, and professionalism.
- **Mark:** Rounded square container with PA ligature
- **Style:** Emerald outline container, snow-white monogram
- **Wordmark:** "Project Agent" in Inter SemiBold beside the mark
- **Favicon:** PA monogram without container

### Concept 5: "The Arrow"
An abstract arrow or chevron pointing right (forward motion) constructed from two geometric shapes that also read as a chat bracket ">". Combines the ideas of progress, command-line precision, and conversation.
- **Mark:** Chevron/arrow formed by two parallelograms
- **Style:** Solid emerald, sharp geometry
- **Wordmark:** "Project Agent" in Inter Bold, tightly kerned
- **Favicon:** Chevron only

### Logo Usage Rules
- Minimum size: 24px height for mark, 80px width for full lockup
- Clear space: 1x the height of the mark on all sides
- Never rotate, stretch, or recolor the mark outside the defined palette
- On dark backgrounds: emerald mark + snow text
- On light backgrounds: emerald-dark mark + charcoal text
- Never place the mark on a busy photograph without a background overlay

---

## 5. Voice & Tone

### Brand Personality Spectrum

```
Technical --------[===X===]-------- Casual
Premium   --------[====X==]-------- Accessible
Confident --------[===X===]-------- Humble
Global    --------[=====X=]-------- Local
Futuristic -------[===X===]-------- Grounded
```

**We sit slightly toward:** Technical, Premium, Confident -- but never cold, exclusive, or arrogant.

### Writing Principles

| Principle | Do | Don't |
|-----------|-----|--------|
| **Be direct** | "Your agent handled 847 conversations last month." | "We're thrilled to report that your AI-powered conversational agent successfully managed..." |
| **Be specific** | "Reduces response time from 4 hours to 4 seconds." | "Dramatically improves response times." |
| **Be human** | "Your customers won't know it's AI. That's the point." | "Leveraging state-of-the-art NLP models for enhanced CX." |
| **Show, don't tell** | Show a WhatsApp conversation screenshot | "Our AI provides seamless conversational experiences." |
| **Respect intelligence** | "Here's what changed and why." | "Don't worry about the technical details!" |
| **Bilingual naturally** | Mix English and Arabic where natural for the audience | Force everything into one language |

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| **Marketing site** | Confident, aspirational | "Your business never sleeps. Neither does your agent." |
| **Onboarding** | Warm, guiding | "Let's set up your first agent. It takes about 10 minutes." |
| **Dashboard** | Factual, efficient | "23 conversations today. 96% resolved. 3 need attention." |
| **Error messages** | Calm, helpful | "We couldn't connect to WhatsApp. Check your API key in Settings." |
| **Sales proposals** | Professional, outcome-focused | "Projected ROI: 340% in the first 6 months based on current call volume." |
| **Support** | Patient, thorough | "This usually happens when the webhook URL has a trailing slash. Try removing it." |

### Arabic Voice Notes
- Use Modern Standard Arabic (MSA) for formal materials (proposals, contracts)
- Use Gulf dialect hints sparingly in marketing copy to feel local
- Never transliterate English tech terms that have established Arabic equivalents
- Brand name "Project Agent" stays in English even in Arabic contexts
- Numbers use Eastern Arabic numerals (٠١٢٣٤٥٦٧٨٩) in Arabic-first layouts, Western numerals in bilingual layouts

---

## 6. Visual Style

### Photography
- **Style:** Dark, moody, high-contrast. Think "late night at a successful restaurant" not "stock photo of people smiling at laptops."
- **Subject matter:** Real business environments (restaurant kitchens, salon interiors, retail counters, clinic reception desks), real WhatsApp conversations on phone screens, UAE/KSA cityscapes at night.
- **Treatment:** Desaturated slightly, with emerald color overlay or tint on one element. Dark vignette on edges.
- **Never:** Generic stock photos, overly bright/flat lighting, people pointing at screens, handshake photos, globe/network visualizations.

### Illustrations
- **Style:** Geometric line illustrations, single-weight strokes (1.5-2px), emerald on dark.
- **Subjects:** Abstract representations of workflows, connection nodes, data flows, conversation threads.
- **Inspired by:** Linear's feature illustrations, Vercel's technical diagrams, Stripe's documentation visuals.
- **Never:** Cartoon characters, mascots, 3D renders, isometric office scenes, clip art.

### Icons
- **Style:** Outline icons, 1.5px stroke, 24px base size, rounded joins and caps.
- **Source:** Lucide (open source, consistent with Inter's geometry) or custom drawn.
- **Colors:** Silver on dark backgrounds, Ash on light backgrounds, Emerald for active/selected states.
- **Never:** Filled icons in body content (only in navigation active states), colored icon sets, emoji as icons.

### Data Visualization
- **Primary chart color:** Emerald (#10b981)
- **Secondary:** Emerald Light (#34d399) at 60% opacity
- **Tertiary:** Slate (#404040)
- **Background grid:** Graphite (#262626) at 50% opacity
- **Style:** Clean, minimal axes. No 3D effects. No decorative elements. Labels in Inter 12px Silver.

### Motion & Animation
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out for entrances, ease-in for exits)
- **Duration:** 150ms for micro-interactions, 300ms for transitions, 500ms for page-level animations
- **Style:** Subtle, purposeful. Elements fade up (not bounce). Emerald glow pulses gently on loading states.
- **Never:** Bouncing, spinning, or attention-seeking animations. No particle effects. No loading spinners with faces.

---

## 7. Layout & Spacing

### Grid System
- **Web:** 12-column grid, 1280px max-width, 24px gutters
- **Mobile:** 4-column grid, 16px gutters
- **Tablet:** 8-column grid, 20px gutters

### Spacing Scale (based on 4px)
```
4px   (1)   -- Tight grouping
8px   (2)   -- Related elements
12px  (3)   -- Component padding (small)
16px  (4)   -- Component padding (default)
24px  (6)   -- Section padding (small)
32px  (8)   -- Section padding (default)
48px  (12)  -- Section separation
64px  (16)  -- Major section separation
96px  (24)  -- Hero padding
128px (32)  -- Page-level spacing
```

### Border Radius
```
sm:   4px   -- Inputs, small buttons
md:   8px   -- Cards, containers
lg:   12px  -- Modals, large cards
xl:   16px  -- Feature cards, hero elements
full: 9999px -- Pills, avatars, toggles
```

---

## 8. Use Cases & Templates

### Business Card
- **Size:** 85mm x 55mm (standard)
- **Front:** Void background, logo mark (top-left), name in Snow/Inter SemiBold 10pt, title in Silver/Inter Regular 8pt, emerald thin line separator, contact details in Cloud/Inter Regular 7.5pt
- **Back:** Void background, full logo lockup centered, tagline in Silver/Inter Regular 8pt below
- **Arabic variant:** Same layout mirrored RTL, IBM Plex Arabic

### Email Signature
```
--
[Name] | [Title]
Project Agent by DCP

[phone] | [email]
projectagent.ai
```
- Name in bold, rest in regular weight
- No images in signature (deliverability)
- Emerald color on "Project Agent" if HTML email client supports it

### Social Media Templates

**LinkedIn / Twitter Post:**
- 1200x675px
- Void background with subtle gradient
- Large stat or quote in Snow/Inter Bold 48px
- Context line in Silver/Inter Regular 18px
- Logo lockup bottom-left
- Emerald accent line (2px) above the text block

**Instagram Story:**
- 1080x1920px
- Full-bleed dark photograph with emerald overlay
- Text overlay in Snow/Inter Bold
- Swipe-up CTA in Emerald pill button

**Instagram Post:**
- 1080x1080px
- Void background
- Centered text composition
- Logo at bottom center

### Proposal / Deck Header
- **First slide / cover page:**
  - Void background
  - Logo lockup centered vertically, 30% from top
  - Client name in Silver/Inter Regular below logo
  - Date in Ash/Inter Regular, bottom-right
  - Emerald thin line (1px) across full width at 75% from top
- **Section divider slides:**
  - Void background
  - Section title in Snow/Inter Bold 48px, centered
  - Section number in Emerald/Inter Bold 96px, 20% opacity, behind the title

### WhatsApp Business Profile
- **Profile picture:** Logo mark (The Node or chosen concept) on Void background, emerald mark
- **Business description (EN):** "AI-powered business assistant. Always available, always learning."
- **Business description (AR):** "مساعد أعمال ذكي. متاح دائماً، يتعلم باستمرار."

### Invoice Template (for Invoice Ninja)
- **Header:** Client business logo (left), "INVOICE" in Inter Bold 24px (right)
- **Colors:** Light mode (white background for printability)
- **Accent:** Emerald Dark (#059669) for headers, totals
- **Body:** Inter Regular 10pt
- **Arabic variant:** RTL layout, IBM Plex Arabic, same color treatment
- **Footer:** "Powered by Project Agent" in 7pt Silver (only if our brand should appear)

---

## 9. Competitor Brand Reference

Understanding where we sit relative to competitors:

| Brand | Primary Color | Feel | Personality |
|-------|--------------|------|-------------|
| **Intercom** | Electric Mint (Teal) | Friendly, approachable | "We're the cool kid in customer support" |
| **Drift (Salesloft)** | Blue (#0176D3) | Corporate, sales-driven | "Enterprise revenue acceleration" |
| **Tidio** | Blue (#1D57D8) | Simple, accessible | "Easy chat for small businesses" |
| **HubSpot** | Orange (#FF7A59) | Warm, educational | "Grow better, together" |
| **Linear** | Purple/Violet (#5E6AD2) | Technical, precise | "Built for builders" |
| **Vercel** | Black + White | Minimal, developer-centric | "Ship faster" |
| **Project Agent** | Emerald (#10b981) on Void | Premium, technical, human | "Your business, always on" |

**Our differentiation:**
- We are darker and more premium than Intercom/Tidio (they feel like tools; we feel like infrastructure)
- We are warmer and more human than Linear/Vercel (they speak to developers; we speak to business owners)
- We are more technical and credible than HubSpot (they feel mass-market; we feel curated)
- We serve MENA first, not as an afterthought (bilingual from day one, AED/SAR native)

---

## 10. Brand Do's and Don'ts

### Do
- Lead with dark backgrounds in digital contexts
- Use emerald sparingly -- it's the accent, not the base
- Show real WhatsApp conversations as social proof
- Speak in outcomes ("847 conversations handled") not features ("AI-powered chatbot")
- Respect Arabic typography (proper fonts, proper sizing, proper RTL)
- Keep layouts clean with generous whitespace
- Use photography that reflects UAE/KSA business culture

### Don't
- Use bright, flat, "startup" color schemes
- Add mascots, cartoon characters, or illustrated humans
- Use generic stock photography
- Over-explain technical concepts to business audiences
- Use Comic Sans, Papyrus, or decorative fonts anywhere
- Mix more than 2 colors in a single composition (beyond neutrals)
- Put English and Arabic on the same line (except brand names)
- Use the emerald accent on more than 10-15% of any given surface

---

## Sources

- [CallAI Brand Case Study](https://www.wavespace.agency/case-studies/callai)
- [Intercom Brand Refresh](https://www.intercom.com/blog/how-and-why-we-refreshed-our-brand/)
- [Intercom Brand Identity System (TechCrunch)](https://techcrunch.com/2019/03/21/how-to-develop-a-brand-identity-system-like-intercom/)
- [Intercom AI Summit Branding (Figma)](https://www.figma.com/blog/intercom-pioneer-ai-summit-branding/)
- [SaaS Color Systems (Merveilleux)](https://www.merveilleux.design/en/blog/article/color-systems-for-saas)
- [B2B SaaS Brand Colors (Kalungi)](https://www.kalungi.com/blog/choosing-branding-colors-for-your-b2b-saas-company)
- [SaaS Color Palette Impact (Ester Digital)](https://ester.co/blog/saas-color-palette)
- [Arabic Fonts for UX Designers](https://ahmedelramlawy.com/10-arabic-fonts-every-ux-designer-should-know-in-2025/)
- [Modern Arabic & Bilingual Fonts (Boutros)](https://www.boutrosfonts.com/+-Modern-Arabic-Bilingual-Fonts-+.html)
- [Color Palettes for Web Design 2026](https://www.elegantthemes.com/blog/design/color-palettes-for-balanced-web-design)
- [Deloitte: SaaS meets AI Agents](https://www.deloitte.com/us/en/insights/industry/technology/technology-media-and-telecom-predictions/2026/saas-ai-agents.html)
