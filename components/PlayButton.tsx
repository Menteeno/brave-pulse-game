"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

export function PlayButton({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation("common")

  return (
    <div className="flex flex-col items-center">
      {disabled ? (
        <Button
          className="w-20 h-20 rounded-full bg-gray-300 hover:bg-gray-400 text-white p-0 flex items-center justify-center shadow-lg"
          size="icon"
          disabled={disabled}
        >
          <Play className="w-8 h-8 fill-white" />
        </Button>
      ) : (
        <Link href="/game">
          <Button
            className="w-20 h-20 rounded-full bg-blue-500 hover:bg-blue-600 text-white p-0 flex items-center justify-center shadow-lg"
            size="icon"
          >
            <Play className="w-8 h-8 fill-white" />
          </Button>
        </Link>
      )}
      <span className="mt-2 text-sm font-semibold">{t("players.start")}</span>
    </div>
  )
}

