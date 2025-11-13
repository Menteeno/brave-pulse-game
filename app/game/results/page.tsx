"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { PlayersHeader } from "@/components/PlayersHeader"
import { getAllUsers, getGameState, saveCheckpoint } from "@/lib/dataService"
import type { User, GameState } from "@/lib/types"

export default function ResultsPage() {
  const { t } = useTranslation("common")
  const router = useRouter()

  const [players, setPlayers] = useState<User[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsLoading(true)

        // Load players
        const users = await getAllUsers()
        if (users.length === 0) {
          router.push("/players")
          return
        }
        setPlayers(users)

        // Load game state
        const state = await getGameState()
        if (!state) {
          router.push("/game")
          return
        }

        setGameState(state)
        
        // Save checkpoint
        await saveCheckpoint("/game/results")
      } catch (error) {
        console.error("Failed to initialize results page:", error)
        router.push("/game")
      } finally {
        setIsLoading(false)
      }
    }

    initializePage()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-muted-foreground">
            {t("game.loading")}
          </p>
        </div>
      </div>
    )
  }

  if (!gameState) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      {/* Header with Players */}
      <div className="mb-6">
        <PlayersHeader
          players={players}
          activePlayerId={gameState.activePlayerId}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-bold text-center">
          {t("game.resultsTitle")}
        </h1>
        <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-md px-4">
          {t("game.resultsDescription")}
        </p>
      </div>
    </div>
  )
}

