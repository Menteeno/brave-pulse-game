"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "nextjs-toploader/app"
import { useTranslation } from "react-i18next"
import { loadInitialStages, getCheckpoint, getGameState } from "@/lib/dataService"
import { Onboarding, hasSeenOnboarding } from "@/components/Onboarding"

export default function HomePage() {
  const { t } = useTranslation("common")
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Load initial game stages (non-blocking, can happen in background)
        loadInitialStages().catch(console.error)

        // Check for checkpoint (last page user was on) - use cache for instant check
        const checkpoint = await getCheckpoint()
        if (checkpoint) {
          // Check if game state exists - use cache for instant check
          const gameState = await getGameState()
          if (gameState) {
            // Redirect to checkpoint immediately
            router.push(checkpoint)
            return
          }
        }

        // Check if user has seen onboarding
        if (!hasSeenOnboarding()) {
          setShowOnboarding(true)
          setIsLoading(false)
          return
        }

        // Redirect to players page if no checkpoint and onboarding seen
        router.push("/players")
      } catch (error) {
        console.error("Failed to initialize game:", error)
        // Check if user has seen onboarding even on error
        if (!hasSeenOnboarding()) {
          setShowOnboarding(true)
        } else {
          router.push("/players")
        }
        setIsLoading(false)
      }
    }

    initializeGame()
  }, [router, t])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-muted-foreground">{t("game.loading")}</p>
        </div>
      </div>
    )
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }

  return null
}

