"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { PlayersHeader } from "@/components/PlayersHeader"
import { Button } from "@/components/ui/button"
import { getAllUsers, getGameState, saveCheckpoint } from "@/lib/dataService"
import type { User, GameState } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function ThinkingPage() {
  const { t, i18n } = useTranslation("common")
  const router = useRouter()
  const currentLanguage = i18n.language || "en"

  const [players, setPlayers] = useState<User[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [timeLeft, setTimeLeft] = useState(60) // 1 minute in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
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

        // Check if there are non-passive reactions
        if (!state.reactions || state.reactions.length === 0) {
          router.push("/game/results")
          return
        }

        const lastRoundReactions = state.reactions[state.reactions.length - 1]
        if (!lastRoundReactions) {
          router.push("/game/results")
          return
        }

        const hasNonPassive = lastRoundReactions.reactions.some(
          (r) => r.reaction !== "passive"
        )

        if (!hasNonPassive) {
          // All passive - redirect to results
          router.push("/game/results")
          return
        }

        setGameState(state)
        
        // Save checkpoint
        await saveCheckpoint("/game/thinking")
      } catch (error) {
        console.error("Failed to initialize thinking page:", error)
        router.push("/game")
      } finally {
        setIsLoading(false)
      }
    }

    initializePage()
  }, [router])

  // Get players who have non-passive reactions
  const getNonPassivePlayers = (): User[] => {
    if (!gameState || !gameState.reactions || gameState.reactions.length === 0) {
      return []
    }

    const lastRoundReactions = gameState.reactions[gameState.reactions.length - 1]
    if (!lastRoundReactions) return []

    const nonPassivePlayerIds = lastRoundReactions.reactions
      .filter((r) => r.reaction !== "passive")
      .map((r) => r.playerId)

    return players.filter((p) => nonPassivePlayerIds.includes(p.id))
  }

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            setIsCompleted(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isRunning, timeLeft])

  const handleStart = () => {
    setIsRunning(true)
    setIsCompleted(false)
  }

  const handleReset = () => {
    setTimeLeft(60)
    setIsRunning(false)
    setIsCompleted(false)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  const nonPassivePlayers = gameState ? getNonPassivePlayers() : []
  const playerNames = nonPassivePlayers
    .map((p) => `${p.firstName} ${p.lastName}`)
    .join(" و ")

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
        {/* Cat Illustration Placeholder */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-48 h-48 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
            <span className="text-8xl">🐱</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center">
          {t("game.thinkingTitle")}
        </h1>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-md px-4">
          {t("game.thinkingDescription", { names: playerNames })}
        </p>

        {/* Timer */}
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="text-4xl font-mono font-bold tabular-nums">
              {formatTime(timeLeft)}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={isRunning}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
            <button
              onClick={handleStart}
              disabled={isRunning || isCompleted}
              className={cn(
                "p-2 rounded-full transition-colors",
                isRunning || isCompleted
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <svg
                className="w-6 h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="mt-auto pt-6">
        <Button
          onClick={() => {
            router.push("/game/results")
          }}
          className="bg-green-500 hover:bg-green-600 w-full"
          disabled={!isCompleted}
        >
          {t("game.thinkingDone")}
        </Button>
      </div>
    </div>
  )
}

