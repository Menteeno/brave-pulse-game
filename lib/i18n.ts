import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslations from '@/locales/en/common.json'
import faTranslations from '@/locales/fa/common.json'

const resources = {
  en: {
    common: enTranslations,
  },
  fa: {
    common: faTranslations,
  },
}

// Get default language from environment variable, fallback to 'en'
// Next.js makes NEXT_PUBLIC_* variables available on both server and client
const defaultLanguage = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en'

// Get fallback language from environment variable, fallback to 'en'
const fallbackLanguage = process.env.NEXT_PUBLIC_FALLBACK_LANGUAGE || 'en'

// Validate language is supported
const supportedLanguages = ['en', 'fa']
const validatedLanguage = supportedLanguages.includes(defaultLanguage) 
  ? defaultLanguage 
  : 'en'
const validatedFallback = supportedLanguages.includes(fallbackLanguage) 
  ? fallbackLanguage 
  : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: validatedLanguage,
    fallbackLng: validatedFallback,
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n

