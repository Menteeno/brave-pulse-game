"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { PlayersHeader } from "@/components/PlayersHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllUsers, getGameState, saveCheckpoint } from "@/lib/dataService"
import { getCurrentCard, loadSituationCards, saveReactionFeedback } from "@/lib/gameService"
import type { User, GameState, SituationCard, ReactionFeedback } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function CustomCostPage() {
    const { t, i18n } = useTranslation("common")
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentLanguage = i18n.language || "fa"

    const [players, setPlayers] = useState<User[]>([])
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [currentPlayer, setCurrentPlayer] = useState<User | null>(null)
    const [currentCard, setCurrentCard] = useState<SituationCard | null>(null)
    const [allCards, setAllCards] = useState<SituationCard[]>([])
    const [selectedKpi, setSelectedKpi] = useState<
        "selfRespect" | "relationshipHealth" | "goalAchievement" | null
    >(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const initializePage = async () => {
            try {
                setIsLoading(true)

                // Load players, game state, and cards in parallel
                const [users, state, cards] = await Promise.all([
                    getAllUsers(),
                    getGameState(),
                    loadSituationCards(currentLanguage),
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

                // Get player ID from URL
                const playerId = searchParams.get("playerId")
                if (!playerId) {
                    // No player ID - redirect to get first assertive player with customCost
                    await redirectToNextPlayer(state, users)
                    return
                }

                // Find player
                const player = users.find((p) => p.id === playerId)
                if (!player) {
                    router.push("/game/results")
                    return
                }

                setCurrentPlayer(player)

                // Get player's reaction from last round
                const lastRoundReactions = state.reactions?.[state.reactions.length - 1]
                if (!lastRoundReactions) {
                    router.push("/game/results")
                    return
                }

                const playerReaction = lastRoundReactions.reactions.find(
                    (r) => r.playerId === playerId
                )

                if (!playerReaction || playerReaction.reaction !== "assertive") {
                    // Player doesn't have assertive reaction - skip to next
                    await redirectToNextPlayer(state, users, playerId)
                    return
                }

                // Load current card
                if (state.currentCardId) {
                    const currentCardId = state.cardOrder[state.currentCardIndex]
                    const card = cards.find((c) => c.id === currentCardId) || null
                    setCurrentCard(card)

                    // Check if customCost exists
                    const reactionData = card?.individualGainAndCost.assertive
                    if (!reactionData?.customCost || reactionData.customCost === 0) {
                        // No customCost - skip to next player
                        await redirectToNextPlayer(state, users, playerId)
                        return
                    }

                    // Check if customCostKpi already selected
                    const existingFeedback = lastRoundReactions.feedback?.find(
                        (f) => f.playerId === playerId
                    )
                    if (existingFeedback?.customCostKpi) {
                        // Already selected - skip to next player
                        await redirectToNextPlayer(state, users, playerId)
                        return
                    }
                }

                // Save checkpoint (non-blocking)
                saveCheckpoint(`/game/custom-cost?playerId=${playerId}`).catch(console.error)
            } catch (error) {
                console.error("Failed to initialize custom cost page:", error)
                router.push("/game")
            } finally {
                setIsLoading(false)
            }
        }

        initializePage()
    }, [router, searchParams, currentLanguage])

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

        // Get all assertive players
        const assertiveReactions = lastRoundReactions.reactions.filter(
            (r) => r.reaction === "assertive"
        )

        if (assertiveReactions.length === 0) {
            // No assertive players - go to results
            router.push("/game/results")
            return
        }

        // Check which assertive players need customCost selection
        const cards = await loadSituationCards(currentLanguage)
        const currentCardId = state.cardOrder[state.currentCardIndex]
        const card = cards.find((c) => c.id === currentCardId)

        const playersNeedingSelection = assertiveReactions.filter((reaction) => {
            if (!card) return false
            const reactionData = card.individualGainAndCost.assertive
            if (!reactionData?.customCost || reactionData.customCost === 0) return false

            const existingFeedback = lastRoundReactions.feedback?.find(
                (f) => f.playerId === reaction.playerId
            )
            return !existingFeedback?.customCostKpi
        })

        if (playersNeedingSelection.length === 0) {
            // All players have selected - go to results
            router.push("/game/results")
            return
        }

        // Find current player index
        let currentIndex = -1
        if (currentPlayerId) {
            currentIndex = playersNeedingSelection.findIndex(
                (r) => r.playerId === currentPlayerId
            )
        }

        // Get next player
        const nextIndex = currentIndex + 1
        if (nextIndex >= playersNeedingSelection.length) {
            // All players done - go to results
            router.push("/game/results")
            return
        }

        const nextPlayerId = playersNeedingSelection[nextIndex].playerId
        router.push(`/game/custom-cost?playerId=${nextPlayerId}`)
    }

    const handleSave = async () => {
        if (!currentPlayer || !selectedKpi || !gameState) return

        const feedback: ReactionFeedback = {
            playerId: currentPlayer.id,
            customCostKpi: selectedKpi,
        }

        try {
            // Get existing feedback and merge
            const lastRoundReactions = gameState.reactions?.[gameState.reactions.length - 1]
            const existingFeedback = lastRoundReactions?.feedback?.find(
                (f) => f.playerId === currentPlayer.id
            )

            const mergedFeedback: ReactionFeedback = {
                ...existingFeedback,
                ...feedback,
            }

            await saveReactionFeedback(currentPlayer.id, mergedFeedback)

            // Update game state
            const updatedState = await getGameState()
            if (updatedState) {
                setGameState(updatedState)
            }

            // Redirect to next player
            await redirectToNextPlayer(updatedState || gameState, players, currentPlayer.id)
        } catch (error) {
            console.error("Failed to save custom cost selection:", error)
        }
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

    if (!gameState || !currentPlayer || !currentCard) {
        return null
    }

    const reactionData = currentCard.individualGainAndCost.assertive
    const customCost = reactionData.customCost || 0
    const customCostTitle = reactionData.customCostTitle || t("game.customCost")
    const customCostDescription = reactionData.customCostDescription || ""

    return (
        <div className="flex flex-col min-h-screen px-4 py-6">
            {/* Header with Players */}
            <div className="mb-6">
                <PlayersHeader
                    players={players}
                    activePlayerId={gameState.activePlayerId}
                    currentRound={gameState.currentRound}
                    maxRounds={parseInt(process.env.NEXT_PUBLIC_MAX_ROUNDS || "8", 10)}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center text-lg">
                            {t("game.customCostTitle", {
                                name: `${currentPlayer.firstName} ${currentPlayer.lastName}`,
                            })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            {t("game.customCostDescription", {
                                costTitle: customCostTitle,
                                costValue: Math.abs(customCost),
                                costDescription: customCostDescription,
                            })}
                        </p>

                        <p className="text-sm font-medium text-foreground text-center">
                            {t("game.customCostQuestion")}
                        </p>

                        {/* KPI Selection */}
                        <div className="space-y-2">
                            <button
                                onClick={() => setSelectedKpi("selfRespect")}
                                className={cn(
                                    "w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-start",
                                    selectedKpi === "selfRespect"
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                                )}
                            >
                                {t("gameIntro.kpiSelfRespect")}
                            </button>
                            <button
                                onClick={() => setSelectedKpi("relationshipHealth")}
                                className={cn(
                                    "w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-start",
                                    selectedKpi === "relationshipHealth"
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                                )}
                            >
                                {t("gameIntro.kpiRelationship")}
                            </button>
                            <button
                                onClick={() => setSelectedKpi("goalAchievement")}
                                className={cn(
                                    "w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-start",
                                    selectedKpi === "goalAchievement"
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                                )}
                            >
                                {t("gameIntro.kpiGoal")}
                            </button>
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={!selectedKpi}
                            className="bg-green-500 hover:bg-green-600 w-full"
                        >
                            {t("game.customCostSubmit")}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

