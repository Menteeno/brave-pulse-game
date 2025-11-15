"use client"

import React, { useState, useEffect, Suspense, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import Image from "next/image"
import { PlayersHeader } from "@/components/PlayersHeader"
import { PlayerProfileModal } from "@/components/PlayerProfileModal"
import { Button } from "@/components/ui/button"
import { getAllUsers, getGameState, saveCheckpoint } from "@/lib/dataService"
import { getCurrentCard, loadSituationCards, saveReactionFeedback } from "@/lib/gameService"
import { calculateRoundScores, saveRoundScores } from "@/lib/scoringService"
import type { User, GameState, SituationCard, ReactionFeedback } from "@/lib/types"
import { cn } from "@/lib/utils"
import sadGif from "@/app/assets/images/sad.gif"

function CustomCostPageContent() {
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
    const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
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

                // Get player ID from URL (use the one from outer scope)
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

    const redirectToNextPlayer = async (
        state: GameState,
        users: User[],
        currentPlayerId?: string
    ) => {
        // Re-fetch game state to get the latest feedback before checking
        const latestState = await getGameState()
        if (!latestState) {
            router.push("/game/results")
            return
        }

        const lastRoundReactions = latestState.reactions?.[latestState.reactions.length - 1]
        if (!lastRoundReactions) {
            router.push("/game/results")
            return
        }

        // Get all assertive players
        const assertiveReactions = lastRoundReactions.reactions.filter(
            (r) => r.reaction === "assertive"
        )

        if (assertiveReactions.length === 0) {
            // No assertive players - go to results immediately
            router.push("/game/results")
            return
        }

        // Check which assertive players need customCost selection
        // Load cards in background (non-blocking)
        loadSituationCards(currentLanguage).then((cards) => {
            const currentCardId = latestState.cardOrder[latestState.currentCardIndex]
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
                // All players have selected - go to results immediately, calculate scores in background
                router.push("/game/results")
                calculateAndSaveScores(latestState).catch(console.error)
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
                // All players done - go to results immediately, calculate scores in background
                router.push("/game/results")
                calculateAndSaveScores(latestState).catch(console.error)
                return
            }

            const nextPlayerId = playersNeedingSelection[nextIndex].playerId
            router.push(`/game/custom-cost?playerId=${nextPlayerId}`)
        }).catch(() => {
            // If card loading fails, just navigate to results
            router.push("/game/results")
            calculateAndSaveScores(latestState).catch(console.error)
        })
    }

    const handleSave = async () => {
        if (!currentPlayer || !selectedKpi || !gameState) return

        const feedback: ReactionFeedback = {
            playerId: currentPlayer.id,
            customCostKpi: selectedKpi,
        }

        try {
            // Save feedback (saveReactionFeedback will merge with existing feedback if it exists)
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
    const playerName = `${currentPlayer.firstName} ${currentPlayer.lastName}`

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
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
                {/* Sad GIF */}
                <div className="flex items-center justify-center mb-4">
                    <div className="relative w-48 h-48">
                        <Image
                            src={sadGif}
                            alt="Brave"
                            fill
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-semibold text-center">
                    {customCostTitle}
                </h1>

                <p className="text-center mb-4">
                    {t("game.customCostTitleBeforeScore", {
                        name: playerName,
                    })}
                    <span className={`rtl:persian-number font-black tracking-wider ${customCost > 0 ? 'text-green-500' : 'text-red-500'}`} dir="ltr">
                        {' '}({customCost}){' '}
                    </span>
                    {t("game.customCostTitleAfterScore")}
                </p>

                {/* Description */}
                <p className="text-sm text-muted-foreground text-center leading-relaxed max-w-md px-4 mb-6">
                    {customCostDescription}
                </p>

                {/* Question */}
                <p className="text-sm font-medium text-foreground text-center">
                    {t("game.customCostQuestion")}
                </p>

                {/* KPI Selection */}
                <div className="w-full max-w-md space-y-2 px-4">
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
            </div>

            {/* Bottom Button */}
            <div className="mt-auto pt-6">
                <Button
                    onClick={handleSave}
                    disabled={!selectedKpi}
                    className="bg-green-500 hover:bg-green-600 w-full"
                >
                    {t("game.customCostSubmit")}
                </Button>
            </div>

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

export default function CustomCostPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen px-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-lg font-medium text-muted-foreground">Loading...</p>
                </div>
            </div>
        }>
            <CustomCostPageContent />
        </Suspense>
    )
}

