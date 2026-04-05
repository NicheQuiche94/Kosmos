@AGENTS.md

## Design System

- **Light mode only**
- **Fonts**: Cal Sans (`"Cal Sans", Inter, sans-serif`) for headings, Inter for body
- **Primary gradient**: `linear-gradient(135deg, #2C5F8A 0%, #3B7FAD 50%, #4A9B8E 100%)` -- used on headers and primary action buttons
- **Gradient border cards**: 1.5px gradient wrapper (`borderRadius: 18px`) with white inner div (`borderRadius: 16.5px`)
- **Card backgrounds**: `#fff`, page backgrounds: `#FAFAF8`
- **Inline styles throughout** -- no Tailwind classes in JSX (use `style` props)
- **Icons**: Lucide React only
- **No em-dashes, no emojis** in UI text
- **Shadows**: card `0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)`

## Key Color Tokens

- Primary: `#2C5F8A`, Light: `#3B7AB5`, Dark: `#1E4266`
- Secondary/Health: `#4A8C6F`
- Warning/Finances: `#D97706`
- Danger/Relationships: `#DC2626`
- Personal Dev: `#7C3AED`
- Hobbies: `#0891B2`
- Environment: `#65A30D`
- Text primary: `#1A1A1A`, Text secondary: `#6B7280`

## Architecture

- Supabase client: `@/lib/supabase`
- Data helpers (logHabit, logMetric, etc.): `@/lib/data`
- Profile state: `useProfileStore` from `@/store/profileStore` (Zustand + persist)
- Types: `@/types/index.ts`
- All pages are client components (`"use client"`)
- Auth gated via `(app)` layout group
- New tables: `workout_logs`, `food_logs` (created alongside existing `habit_logs`, `metric_logs`)
