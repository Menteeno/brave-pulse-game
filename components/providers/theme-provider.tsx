"use client"

import { useEffect } from "react"

/**
 * Theme Provider - Detects and applies browser/system theme preference
 * This component runs on the client side to detect prefers-color-scheme
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // This effect runs only on the client
    // The theme is automatically handled by CSS media queries when darkMode: "media" is set
    // No JavaScript needed - Tailwind will automatically apply dark: classes based on prefers-color-scheme
  }, [])

  return <>{children}</>
}

