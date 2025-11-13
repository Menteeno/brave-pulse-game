"use client"

import { useTranslation } from "react-i18next"
import { Button } from "./button"

export function Header() {
  const { t } = useTranslation("common")

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="me-4 flex">
          <h1 className="text-lg font-semibold">{t("header.title")}</h1>
        </div>
        <nav className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="sm">
            {t("header.nav.home")}
          </Button>
        </nav>
      </div>
    </header>
  )
}

