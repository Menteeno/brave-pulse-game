"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { loadInitialStages, getCheckpoint, getGameState } from "@/lib/dataService"

export default function LoadingPage() {
  const { t } = useTranslation("common")
  const router = useRouter()
  const [loadingText, setLoadingText] = useState(t("game.loading"))

  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Load initial game stages
        setLoadingText(t("game.loadingStages"))
        await loadInitialStages()

        // Check for checkpoint (last page user was on)
        const checkpoint = await getCheckpoint()
        if (checkpoint) {
          // Check if game state exists
          const gameState = await getGameState()
          if (gameState) {
            // Redirect to checkpoint
            router.push(checkpoint)
            return
          }
        }

        // Add a small delay for better UX
        // await new Promise((resolve) => setTimeout(resolve, 500))

        // Redirect to players page if no checkpoint
        router.push("/players")
      } catch (error) {
        console.error("Failed to initialize game:", error)
        // Still redirect even if there's an error
        router.push("/players")
      }
    }

    initializeGame()
  }, [router, t])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-lg font-medium text-muted-foreground">{loadingText}</p>
      </div>
    </div>
  )
}

