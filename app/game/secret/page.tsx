"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { PlayersHeader } from "@/components/PlayersHeader"
import { PlayerProfileModal } from "@/components/PlayerProfileModal"
import { Button } from "@/components/ui/button"
import { getAllUsers, getGameState, saveCheckpoint } from "@/lib/dataService"
import { loadSituationCards } from "@/lib/gameService"
import type { User, GameState, SituationCard } from "@/lib/types"
import secretGif from "@/app/assets/images/secret.gif"

export default function SecretPage() {
  const { t, i18n } = useTranslation("common")
  const router = useRouter()
  const currentLanguage = i18n.language || "en"

  const [players, setPlayers] = useState<User[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [allCards, setAllCards] = useState<SituationCard[]>([])

  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsLoading(true)

        // Load players, game state, and cards in parallel
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
        
        // Save checkpoint (non-blocking)
        saveCheckpoint("/game/secret").catch(console.error)
      } catch (error) {
        console.error("Failed to initialize secret page:", error)
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

  const activePlayer = players.find((p) => p.id === gameState.activePlayerId)
  const activePlayerName = activePlayer
    ? `${activePlayer.firstName} ${activePlayer.lastName}`
    : ""

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
        {/* Secret GIF */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-48 h-48">
            <Image
              src={secretGif}
              alt="Secret"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center">
          {t("game.secretTitle")}
        </h1>

        {/* Description */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-md px-4">
          {t("game.secretDescription", { name: activePlayerName })}
        </p>
      </div>

      {/* Bottom Button */}
      <div className="mt-auto pt-6">
        <Button
          onClick={() => {
            // Find first non-passive player and redirect to their reaction page
            if (!gameState || !gameState.reactions || gameState.reactions.length === 0) {
              router.push("/game/results")
              return
            }

            const lastRoundReactions = gameState.reactions[gameState.reactions.length - 1]
            const nonPassiveReactions = lastRoundReactions.reactions.filter(
              (r) => r.reaction !== "passive"
            )

            if (nonPassiveReactions.length === 0) {
              router.push("/game/results")
              return
            }

            // Redirect to first non-passive player's reaction page
            const firstPlayerId = nonPassiveReactions[0].playerId
            router.push(`/game/reaction?playerId=${firstPlayerId}`)
          }}
          className="bg-green-500 hover:bg-green-600 w-full"
        >
          {t("game.secretContinue", { name: activePlayerName })}
        </Button>
      </div>

      {/* Player Profile Modal */}
      {selectedPlayer && gameState && (
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

