# 🛠️ Task: Dark Mode Implementation (System-Wide)

> **Goal**: Enable full Dark Mode support using Tailwind CSS and Shadcn UI variables.
> **Context**: The `theme` state ('light'|'dark'|'system') is already managed in `useSettingsStore`.

## 1. Infrastructure Setup

### 1.1 Tailwind Config (`tailwind.config.js`)
Ensure the dark mode strategy is set to class-based.

```javascript
module.exports = {
  darkMode: ["class"], // CRITICAL
  // ...
}
```

### 1.2 Global CSS Variables (`src/renderer/src/global.css`)
Update the `@layer base` to include `.dark` variables. This ensures Shadcn components automatically switch colors.

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 10% 3.9%;
  }
 
  .dark {
    --background: 240 10% 3.9%;   /* #09090b (Zinc-950) */
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}
```

## 2. Theme Provider Logic (`src/renderer/src/components/theme-provider.tsx`)

Create a component to listen to the store and toggle the HTML class.

```tsx
import { useEffect } from "react"
import { useSettingsStore } from "../store/use-settings-store"

export function ThemeProvider({ children }) {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  return <>{children}</>
}
```

## 3. Chart Adaptation (Critical)

ECharts does not automatically switch. We must pass the theme explicitly.

**File**: `src/renderer/src/components/report/report-chart.tsx`

```tsx
import { useSettingsStore } from '../../store/use-settings-store'

// Inside component
const { theme } = useSettingsStore()
const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia("(prefers-color-scheme: dark)").matches)

// When init ECharts
const chart = echarts.init(chartRef.current, isDark ? 'dark' : undefined)
```

## 4. Migration Audit

**Action**: Search and Replace hardcoded colors in all components.

*   `bg-white` -> `bg-background` or `bg-card`
*   `bg-zinc-50` / `bg-zinc-100` -> `bg-secondary` or `bg-muted`
*   `text-black` / `text-zinc-900` -> `text-foreground`
*   `text-zinc-500` -> `text-muted-foreground`
*   `border-zinc-200` -> `border-border`

