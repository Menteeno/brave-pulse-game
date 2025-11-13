"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

export function PlayButton() {
  const { t } = useTranslation("common")
  const router = useRouter()

  return (
    <div className="flex flex-col items-center">
      <Button
        onClick={() => router.push("/game-intro")}
        className="w-20 h-20 rounded-full bg-blue-500 hover:bg-blue-600 text-white p-0 flex items-center justify-center shadow-lg"
        size="icon"
      >
        <Play className="w-8 h-8 fill-white" />
      </Button>
      <span className="mt-2 text-sm font-semibold">{t("players.start")}</span>
    </div>
  )
}

