"use client"

import React, { useState, useEffect, Suspense, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import Image from "next/image"
import { Play, Pause, RotateCcw } from "lucide-react"
import { PlayersHeader } from "@/components/PlayersHeader"
import { PlayerProfileModal } from "@/components/PlayerProfileModal"
import { Button } from "@/components/ui/button"
import { ReactionFeedbackModal } from "@/components/ReactionFeedbackModal"
import { getAllUsers, getGameState, saveCheckpoint } from "@/lib/dataService"
import { getCurrentCard, saveReactionFeedback, loadSituationCards } from "@/lib/gameService"
import { calculateRoundScores, saveRoundScores } from "@/lib/scoringService"
import type { User, GameState, ReactionType, SituationCard, ReactionFeedback } from "@/lib/types"
import { cn } from "@/lib/utils"
import braveGif from "@/app/assets/images/brave.gif"
import savageGif from "@/app/assets/images/savage.gif"

function ReactionPageContent() {
  const { t, i18n } = useTranslation("common")
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentLanguage = i18n.language || "en"

  const [players, setPlayers] = useState<User[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<User | null>(null)
  const [reactionType, setReactionType] = useState<ReactionType | null>(null)
  const [currentCard, setCurrentCard] = useState<SituationCard | null>(null)
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes in seconds
  const [isRunning, setIsRunning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [allCards, setAllCards] = useState<SituationCard[]>([])
  const isInitializedRef = useRef<string | null>(null)

  useEffect(() => {
    const playerId = searchParams.get("playerId")

    // Reset if playerId changed (allow re-initialization for different players)
    if (isInitializedRef.current !== playerId) {
      isInitializedRef.current = null
    }

    // Prevent re-initialization if already initialized for this playerId
    if (isInitializedRef.current === playerId) return

    const initializePage = async () => {
      try {
        // Mark as initializing to prevent concurrent runs
        isInitializedRef.current = playerId

        setIsLoading(true)

        // Optimistic: Load cached data first
        const [cachedUsers, cachedState] = await Promise.all([
          getAllUsers(),
          getGameState(),
        ])

        // Show cached data immediately
        if (cachedUsers.length > 0) {
          setPlayers(cachedUsers)
        }
        if (cachedState) {
          setGameState(cachedState)
        }

        // Load fresh data in parallel
        const [users, state, cards] = await Promise.all([
          getAllUsers(),
          getGameState(),
          loadSituationCards(currentLanguage)
        ])

        if (users.length === 0) {
          router.push("/players")
          return
        }
        setPlayers(users)
        setAllCards(cards)

        if (!state) {
          router.push("/game")
          return
        }

        setGameState(state)

        // Get player ID from URL (use the one from outer scope)
        if (!playerId) {
          // No player ID - redirect to get first non-passive player
          await redirectToNextPlayer(state, users)
          return
        }

        // Find player
        const player = users.find((p) => p.id === playerId)
        if (!player) {
          router.push("/game/results")
          return
        }

        // Get player's reaction from last round
        const lastRoundReactions = state.reactions?.[state.reactions.length - 1]
        if (!lastRoundReactions) {
          router.push("/game/results")
          return
        }

        const playerReaction = lastRoundReactions.reactions.find(
          (r) => r.playerId === playerId
        )

        if (!playerReaction || playerReaction.reaction === "passive") {
          // Player has passive reaction or no reaction - skip to next
          await redirectToNextPlayer(state, users, playerId)
          return
        }

        setCurrentPlayer(player)
        setReactionType(playerReaction.reaction)

        // Use already loaded cards instead of loading again
        if (state.currentCardId) {
          const currentCardId = state.cardOrder[state.currentCardIndex]
          const card = cards.find((c) => c.id === currentCardId) || null
          setCurrentCard(card)
        }

        // Save checkpoint (non-blocking)
        saveCheckpoint(`/game/reaction?playerId=${playerId}`).catch(console.error)
      } catch (error) {
        console.error("Failed to initialize reaction page:", error)
        // Reset on error so it can retry
        isInitializedRef.current = null
        router.push("/game")
      } finally {
        setIsLoading(false)
      }
    }

    initializePage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentLanguage])

  const redirectToNextPlayer = async (
    state: GameState,
    users: User[],
    currentPlayerId?: string
  ) => {
    const lastRoundReactions = state.reactions?.[state.reactions.length - 1]
    if (!lastRoundReactions) {
      router.push("/game/results")
      return
    }

    // Get all non-passive players
    const nonPassiveReactions = lastRoundReactions.reactions.filter(
      (r) => r.reaction !== "passive"
    )

    if (nonPassiveReactions.length === 0) {
      // All passive - navigate immediately, calculate scores in background
      router.push("/game/results")
      calculateAndSaveScores(state).catch(console.error)
      return
    }

    // Find current player index
    let currentIndex = -1
    if (currentPlayerId) {
      currentIndex = nonPassiveReactions.findIndex(
        (r) => r.playerId === currentPlayerId
      )
    }

    // Get next player
    const nextIndex = currentIndex + 1
    if (nextIndex >= nonPassiveReactions.length) {
      // All players done - check if any assertive players need customCost selection
      // Load cards in background (non-blocking)
      loadSituationCards(currentLanguage).then((cards) => {
        const currentCardId = state.cardOrder[state.currentCardIndex]
        const card = cards.find((c) => c.id === currentCardId)

        if (card) {
          const reactionData = card.individualGainAndCost.assertive
          const hasCustomCost = reactionData?.customCost && reactionData.customCost !== 0

          if (hasCustomCost) {
            // Check if any assertive players need customCost selection
            const assertiveReactions = nonPassiveReactions.filter(
              (r) => r.reaction === "assertive"
            )

            const playersNeedingSelection = assertiveReactions.filter((reaction) => {
              const existingFeedback = lastRoundReactions.feedback?.find(
                (f) => f.playerId === reaction.playerId
              )
              return !existingFeedback?.customCostKpi
            })

            if (playersNeedingSelection.length > 0) {
              // Redirect to custom cost selection page
              const firstPlayerId = playersNeedingSelection[0].playerId
              router.push(`/game/custom-cost?playerId=${firstPlayerId}`)
              return
            }
          }
        }

        // No customCost or all selected - navigate immediately, calculate in background
        router.push("/game/results")
        calculateAndSaveScores(state).catch(console.error)
      }).catch(() => {
        // If card loading fails, just navigate to results
        router.push("/game/results")
        calculateAndSaveScores(state).catch(console.error)
      })
      return
    }

    // Navigate to next player immediately
    const nextPlayerId = nonPassiveReactions[nextIndex].playerId
    router.push(`/game/reaction?playerId=${nextPlayerId}`)
  }

  const calculateAndSaveScores = async (state: GameState) => {
    try {
      // Check if scores for this round already exist
      const existingScores = state.scores || []
      const existingRoundScore = existingScores.find(
        (s) => s.round === state.currentRound
      )

      if (existingRoundScore) {
        // Scores already exist for this round, don't recalculate
        return
      }

      // Re-fetch game state to get the latest feedback (in case last feedback was just saved)
      const latestGameState = await getGameState()
      if (!latestGameState) {
        throw new Error("Game state not found")
      }

      // Use the latest feedback from the updated game state
      const latestFeedback = latestGameState.reactions?.[latestGameState.reactions.length - 1]?.feedback

      const roundScores = await calculateRoundScores(latestGameState, currentLanguage, latestFeedback)
      await saveRoundScores(roundScores)
    } catch (error) {
      console.error("Failed to calculate scores:", error)
    }
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

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setTimeLeft(180)
    setIsRunning(false)
    setIsCompleted(false)
  }

  const handleFinish = async () => {
    if (!gameState || !currentPlayer || !reactionType) return

    // For assertive reactions only, show feedback modal
    if (reactionType === "assertive") {
      setShowFeedbackModal(true)
    } else {
      // For aggressive or passive reactions, move to next player
      await redirectToNextPlayer(gameState, players, currentPlayer.id)
    }
  }

  const handleFeedbackSave = async (feedback: ReactionFeedback) => {
    if (!currentPlayer || !gameState) return

    // Wait for feedback to be saved before navigating
    await saveReactionFeedback(currentPlayer.id, feedback)

    // Get updated game state after saving feedback
    const updatedState = await getGameState()
    if (!updatedState) {
      console.error("Failed to get updated game state")
      return
    }

    // Navigate with updated state
    redirectToNextPlayer(updatedState, players, currentPlayer.id)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

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

  if (!gameState || !currentPlayer || !reactionType) {
    return null
  }

  const playerName = `${currentPlayer.firstName} ${currentPlayer.lastName}`
  const reactionGif = reactionType === "assertive" ? braveGif : savageGif

  return (
    <div className="flex flex-col min-h-screen px-4 py-6">
      {/* Header with Players */}
      <div className="mb-6">
        <PlayersHeader
          players={players}
          activePlayerId={gameState.activePlayerId}
          currentRound={gameState.currentRound}
          maxRounds={parseInt(process.env.NEXT_PUBLIC_MAX_ROUNDS || "8", 10)}
          onPlayerClick={(player) => {
            setSelectedPlayer(player)
            setIsProfileModalOpen(true)
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Reaction GIF */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-48 h-48">
            <Image
              src={reactionGif}
              alt={reactionType === "assertive" ? "Brave" : "Savage"}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center">
          {t("game.reactionTitle", { name: playerName })}
        </h1>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-md px-4">
          {t("game.reactionDescription", {
            name: playerName,
            reaction: t(`game.reaction.${reactionType}`),
            activePlayer: gameState.activePlayerId
              ? players.find((p) => p.id === gameState.activePlayerId)
                ?.firstName || ""
              : "",
          })}
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
              className={cn(
                "p-2 rounded-full transition-colors",
                isRunning
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              disabled={isRunning}
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
            <button
              onClick={isRunning ? handlePause : handleStart}
              disabled={isCompleted}
              className={cn(
                "p-2 rounded-full transition-colors",
                isCompleted
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {isRunning ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="mt-auto pt-6">
        <Button
          onClick={handleFinish}
          className="bg-green-500 hover:bg-green-600 w-full"
        >
          {t("game.reactionFinished")}
        </Button>
      </div>

      {/* Feedback Modal - Only for assertive reactions */}
      {currentPlayer && reactionType === "assertive" && (
        <ReactionFeedbackModal
          open={showFeedbackModal}
          onOpenChange={setShowFeedbackModal}
          card={currentCard}
          playerId={currentPlayer.id}
          playerName={`${currentPlayer.firstName} ${currentPlayer.lastName}`}
          reactionType={reactionType}
          onSave={handleFeedbackSave}
        />
      )}

      {/* Player Profile Modal */}
      {selectedPlayer && (
        <PlayerProfileModal
          open={isProfileModalOpen}
          onOpenChange={setIsProfileModalOpen}
          player={selectedPlayer}
          gameState={gameState}
          cards={allCards}
        />
      )}
    </div>
  )
}

export default function ReactionPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ReactionPageContent />
    </Suspense>
  )
}

