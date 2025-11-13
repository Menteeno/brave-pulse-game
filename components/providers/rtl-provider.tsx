"use client"

import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { getDirection } from "@/lib/rtl"

/**
 * RTL Provider - Updates HTML dir and lang attributes based on current language
 * This component must be used inside I18nProvider
 */
export function RTLProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()

  useEffect(() => {
    const currentLanguage = i18n.language || i18n.languages[0] || 'en'
    const direction = getDirection(currentLanguage)

    // Update HTML attributes
    document.documentElement.setAttribute('dir', direction)
    document.documentElement.setAttribute('lang', currentLanguage)

    // Listen for language changes
    const handleLanguageChanged = (lng: string) => {
      const newDirection = getDirection(lng)
      document.documentElement.setAttribute('dir', newDirection)
      document.documentElement.setAttribute('lang', lng)
    }

    i18n.on('languageChanged', handleLanguageChanged)

    // Cleanup
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [i18n])

  return <>{children}</>
}

