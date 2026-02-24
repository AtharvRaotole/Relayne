# PropOS — Frontend System Specification
## Design System, Tech Stack & Visual Language

---

## Tech Stack

```
Framework:       Next.js 14 (App Router)
Language:        TypeScript (strict)
Styling:         Tailwind CSS + CSS Variables
Components:      shadcn/ui (base primitives)
Charts:          Recharts
Animations:      Framer Motion
Icons:           Lucide React
Fonts:           Geist (display) + DM Sans (body) — via next/font
State:           Zustand (global) + TanStack Query (server state)
Forms:           React Hook Form + Zod
Tables:          TanStack Table
Dates:           date-fns
HTTP Client:     Axios + custom hooks
```

---

## Folder Structure

```
propos-frontend/
├── app/
│   ├── (marketing)/               # Public marketing site
│   │   ├── page.tsx               # Landing page
│   │   ├── pricing/page.tsx
│   │   ├── docs/page.tsx
│   │   └── layout.tsx
│   ├── (auth)/                    # Auth pages (no sidebar)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   └── (dashboard)/               # Protected app
│       ├── layout.tsx             # Shell: sidebar + topbar
│       ├── overview/page.tsx      # Portfolio overview
│       ├── work-orders/
│       │   ├── page.tsx           # Work order list
│       │   └── [id]/page.tsx      # Work order detail
│       ├── tenants/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── vendors/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── properties/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── compliance/page.tsx
│       ├── communications/page.tsx
│       ├── escalations/page.tsx
│       ├── analytics/page.tsx
│       ├── ai-activity/page.tsx   # Agent logs & AI transparency
│       └── settings/page.tsx
├── components/
│   ├── marketing/                 # Landing page components
│   ├── dashboard/                 # Dashboard layout components
│   ├── ui/                        # shadcn/ui primitives
│   ├── charts/                    # Chart wrappers
│   ├── work-orders/               # Feature-specific components
│   ├── tenants/
│   ├── vendors/
│   └── shared/                    # Cross-cutting (empty states, loaders, etc.)
├── lib/
│   ├── api/                       # API client & hooks
│   ├── stores/                    # Zustand stores
│   └── utils/
├── styles/
│   └── globals.css
├── public/
│   └── assets/
├── tailwind.config.ts
└── next.config.ts
```

---

## Design Language

### Aesthetic Direction
**Clean operational intelligence.** Think: precision instrument, not startup fluff. The interface should feel like a Bloomberg Terminal that went to design school — dense with information but never cluttered. Every pixel earns its place. Dark sidebar, light content area. Data-forward. Status-driven.

### Color System (CSS Variables)

```css
/* styles/globals.css */
:root {
  /* ── Brand ───────────────────────────── */
  --brand-50:  #f0f4ff;
  --brand-100: #e0e9ff;
  --brand-200: #c7d7fe;
  --brand-300: #a5b8fc;
  --brand-400: #818cf8;
  --brand-500: #6366f1;   /* Primary */
  --brand-600: #4f46e5;   /* Primary dark */
  --brand-700: #4338ca;
  --brand-800: #3730a3;
  --brand-900: #312e81;

  /* ── Neutrals ────────────────────────── */
  --gray-50:  #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  --gray-950: #030712;

  /* ── Semantic ────────────────────────── */
  --success:      #10b981;
  --success-bg:   #ecfdf5;
  --warning:      #f59e0b;
  --warning-bg:   #fffbeb;
  --danger:       #ef4444;
  --danger-bg:    #fef2f2;
  --info:         #3b82f6;
  --info-bg:      #eff6ff;

  /* ── Priority Colors ─────────────────── */
  --priority-emergency: #dc2626;
  --priority-high:      #f97316;
  --priority-normal:    #3b82f6;
  --priority-low:       #6b7280;

  /* ── Surface ─────────────────────────── */
  --surface-page:   #f8fafc;
  --surface-card:   #ffffff;
  --surface-raised: #f1f5f9;
  --border:         #e2e8f0;
  --border-strong:  #cbd5e1;

  /* ── Sidebar (dark) ──────────────────── */
  --sidebar-bg:        #0f1117;
  --sidebar-surface:   #1a1d2e;
  --sidebar-border:    #2d3048;
  --sidebar-text:      #94a3b8;
  --sidebar-text-active: #f1f5f9;
  --sidebar-accent:    #6366f1;

  /* ── Typography ──────────────────────── */
  --font-display: 'Geist', sans-serif;
  --font-body:    'DM Sans', sans-serif;
  --font-mono:    'Geist Mono', monospace;
}
```

### Typography Scale

```css
/* Headings — Geist */
.text-h1 { font-size: 2.5rem;  line-height: 1.15; font-weight: 700; letter-spacing: -0.03em; }
.text-h2 { font-size: 1.875rem; line-height: 1.2;  font-weight: 700; letter-spacing: -0.025em; }
.text-h3 { font-size: 1.375rem; line-height: 1.3;  font-weight: 600; letter-spacing: -0.02em; }
.text-h4 { font-size: 1.125rem; line-height: 1.4;  font-weight: 600; }

/* Body — DM Sans */
.text-body-lg { font-size: 1.0625rem; line-height: 1.65; }
.text-body    { font-size: 0.9375rem; line-height: 1.6; }
.text-body-sm { font-size: 0.8125rem; line-height: 1.55; }
.text-caption { font-size: 0.75rem;   line-height: 1.5; letter-spacing: 0.01em; }
.text-label   { font-size: 0.6875rem; line-height: 1.4; letter-spacing: 0.07em; text-transform: uppercase; font-weight: 600; }
```

### Spacing System (Tailwind extended)

```js
// tailwind.config.ts
spacing: {
  '4.5': '1.125rem',
  '13': '3.25rem',
  '15': '3.75rem',
  '18': '4.5rem',
  '22': '5.5rem',
}
```

### Shadow System

```css
--shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04);
--shadow-card: 0 0 0 1px var(--border), 0 2px 8px rgb(0 0 0 / 0.06);
--shadow-focus: 0 0 0 3px rgb(99 102 241 / 0.25);
```

---

## Component Conventions

### Status Badges

```tsx
// Priority badges
const PRIORITY_STYLES = {
  EMERGENCY: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  HIGH:      'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  NORMAL:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  LOW:       'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
}

// Work order status badges
const STATUS_STYLES = {
  NEW:            'bg-gray-50 text-gray-600',
  TRIAGED:        'bg-purple-50 text-purple-700',
  DISPATCHED:     'bg-blue-50 text-blue-700',
  IN_PROGRESS:    'bg-amber-50 text-amber-700',
  COMPLETED:      'bg-green-50 text-green-700',
  ESCALATED:      'bg-red-50 text-red-700',
  PENDING_REVIEW: 'bg-yellow-50 text-yellow-700',
}
```

### Card Pattern

```tsx
// Standard card — use everywhere
<div className="bg-white rounded-xl border border-gray-100 shadow-[0_0_0_1px_rgb(0,0,0,0.04),0_2px_8px_rgb(0,0,0,0.06)] p-5">
```

### Empty State Pattern

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
    <Icon className="w-6 h-6 text-gray-400" />
  </div>
  <p className="text-sm font-medium text-gray-900 mb-1">No {entity} yet</p>
  <p className="text-sm text-gray-500 max-w-xs">Description of what will appear here and how to get started.</p>
  <Button variant="outline" size="sm" className="mt-4">Add first {entity}</Button>
</div>
```

---

## Animation Tokens

```tsx
// Framer Motion variants — import and reuse
export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
}

export const stagger = {
  animate: { transition: { staggerChildren: 0.07 } }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
}
```

---

## `tailwind.config.ts`

```ts
import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', ...fontFamily.sans],
        display: ['var(--font-display)', ...fontFamily.sans],
        mono: ['var(--font-mono)', ...fontFamily.mono],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        sidebar: {
          bg: '#0f1117',
          surface: '#1a1d2e',
          border: '#2d3048',
          text: '#94a3b8',
          active: '#f1f5f9',
          accent: '#6366f1',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        }
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }
    }
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}

export default config
```
