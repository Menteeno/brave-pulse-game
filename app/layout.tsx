import type { Metadata } from "next"
import "./globals.css"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { getDirection } from "@/lib/rtl"
import NextTopLoader from 'nextjs-toploader';

export const metadata: Metadata = {
  title: "Bravery Game",
  description: "A Next.js app with i18n and shadcn/ui",
}

// Get default language from environment variable
const defaultLanguage = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'en'
const defaultDirection = getDirection(defaultLanguage)

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang={defaultLanguage} dir={defaultDirection} suppressHydrationWarning>
      <body>
        <NextTopLoader />
        <ThemeProvider>
          <I18nProvider>
            <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
              <div className="w-full max-w-md mx-auto flex-1 flex flex-col bg-white dark:bg-gray-900">
                <main className="flex-1">{children}</main>
              </div>
            </div>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

