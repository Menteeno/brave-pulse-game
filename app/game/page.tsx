"use client"

import React, { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "nextjs-toploader/app"
import Image from "next/image"
import { PlayersHeader } from "@/components/PlayersHeader"
import { CardDrawer } from "@/components/CardDrawer"
import { ReactionDrawer } from "@/components/ReactionDrawer"
import { PlayerProfileModal } from "@/components/PlayerProfileModal"
import { Button } from "@/components/ui/button"
import { getAllUsers, getGameState } from "@/lib/dataService"
import {
    initializeGameState,
    getCurrentCard,
    revealCard,
    selectCard,
    loadSituationCards,
    saveReactions,
} from "@/lib/gameService"
import { calculateRoundScores, saveRoundScores } from "@/lib/scoringService"
import type { User, SituationCard, GameState, ReactionType } from "@/lib/types"
import { cn } from "@/lib/utils"
import cartBackImage from "@/app/assets/images/cart-back.jpg"

export default function GamePage() {
    const { t, i18n } = useTranslation("common")
    const router = useRouter()
    const currentLanguage = i18n.language || "en" // Used for loading cards based on language

    const [players, setPlayers] = useState<User[]>([])
    const [gameState, setGameState] = useState<GameState | null>(null)
    const [currentCard, setCurrentCard] = useState<SituationCard | null>(null)
    const [allCards, setAllCards] = useState<SituationCard[]>([])
    const [isCardRevealed, setIsCardRevealed] = useState(false)
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [isReactionDrawerOpen, setIsReactionDrawerOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
    const [existingReactions, setExistingReactions] = useState<Record<string, ReactionType>>({})
    const isInitializedRef = useRef(false)

    useEffect(() => {
        // Prevent re-initialization if already initialized
        if (isInitializedRef.current) return

        const initializeGame = async () => {
            try {
                // Mark as initializing to prevent concurrent runs
                isInitializedRef.current = true

                // Optimistic: Show UI immediately, load data in background
                setIsLoading(true)

                // Try to get cached data first (instant)
                const cachedUsers = await getAllUsers()
                const cachedState = await getGameState()

                // Show cached data immediately if available
                if (cachedUsers.length > 0) {
                    setPlayers(cachedUsers)
                }
                if (cachedState) {
                    setGameState(cachedState)
                    setIsCardRevealed(cachedState.isCardRevealed)
                    setSelectedCardId(cachedState.selectedCardId)
                }

                // Load fresh data in parallel (non-blocking)
                const [users, cards] = await Promise.all([
                    getAllUsers(),
                    loadSituationCards(currentLanguage)
                ])

                if (users.length === 0) {
                    router.push("/players")
                    return
                }

                // Update with fresh data
                setPlayers(users)
                setAllCards(cards)

                // Check for existing game state
                const existingState = await getGameState()
                if (existingState) {
                    setGameState(existingState)
                    setIsCardRevealed(existingState.isCardRevealed)
                    setSelectedCardId(existingState.selectedCardId)

                    if (existingState.isCardRevealed && existingState.currentCardId) {
                        // Use already loaded cards instead of loading again
                        const currentCardId = existingState.cardOrder[existingState.currentCardIndex]
                        const card = cards.find((c) => c.id === currentCardId) || null
                        setCurrentCard(card)
                    }

                    // Load existing reactions if any
                    const lastRoundReactions = existingState.reactions?.[existingState.reactions.length - 1]
                    if (lastRoundReactions && lastRoundReactions.round === existingState.currentRound) {
                        const reactionsMap: Record<string, ReactionType> = {}
                        lastRoundReactions.reactions.forEach((r) => {
                            reactionsMap[r.playerId] = r.reaction
                        })
                        setExistingReactions(reactionsMap)
                    }
                } else {
                    // Initialize new game
                    const randomOrder =
                        process.env.NEXT_PUBLIC_CARD_ORDER === "random"
                    const playerIds = users.map((u) => u.id)
                    const newState = await initializeGameState(playerIds, randomOrder, currentLanguage)
                    setGameState(newState)
                }
            } catch (error) {
                console.error("Failed to initialize game:", error)
                // Reset on error so it can retry
                isInitializedRef.current = false
            } finally {
                setIsLoading(false)
            }
        }

        initializeGame()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentLanguage])

    const handleCardStackClick = async () => {
        if (isCardRevealed || !gameState) return

        await revealCard()
        const card = await getCurrentCard(currentLanguage)
        setCurrentCard(card)
        setIsCardRevealed(true)

        // Update game state
        const updatedState = await getGameState()
        if (updatedState) {
            setGameState(updatedState)
        }
    }

    const handleCardClick = async (cardId: string) => {
        setSelectedCardId(cardId)
        await selectCard(cardId)
        const card = allCards.find((c) => c.id === cardId)
        if (card) {
            setCurrentCard(card)
            setIsDrawerOpen(true)
        }
    }

    const handleDrawerClose = () => {
        setIsDrawerOpen(false)
        setSelectedCardId(null)
    }

    const handleReactionsSave = async (reactions: Record<string, ReactionType>) => {
        try {
            if (!gameState) return

            // Convert reactions to PlayerReaction array for optimistic update
            const playerReactions = Object.entries(reactions).map(
                ([playerId, reaction]) => ({ playerId, reaction })
            )

            const roundReaction = {
                round: gameState.currentRound,
                cardId: gameState.currentCardId || "",
                reactions: playerReactions,
            }

            // Optimistically update local state immediately
            const optimisticState = {
                ...gameState,
                reactions: [...(gameState.reactions || []), roundReaction],
            }
            setGameState(optimisticState)

            // Save reactions in background (cache updates immediately)
            saveReactions(reactions).catch(console.error)

            // Check if any player has non-passive reaction (using optimistic state)
            const hasNonPassive = playerReactions.some(
                (r) => r.reaction !== "passive"
            )

            // Navigate IMMEDIATELY (don't wait for any async operations)
            if (hasNonPassive) {
                router.push("/game/thinking")
            } else {
                // All passive - navigate immediately, calculate scores in background
                router.push("/game/results")

                // Calculate scores in background (non-blocking)
                getGameState().then(async (updatedState) => {
                    if (updatedState) {
                        try {
                            const roundScores = await calculateRoundScores(
                                updatedState,
                                currentLanguage,
                                updatedState.reactions?.[updatedState.reactions.length - 1]?.feedback
                            )
                            await saveRoundScores(roundScores)
                        } catch (error) {
                            console.error("Failed to calculate scores:", error)
                        }
                    }
                }).catch(console.error)
            }
        } catch (error) {
            console.error("Failed to save reactions:", error)
        }
    }

    const handleReactionsContinue = async () => {
        // Continue to next page based on game state
        if (!gameState) return

        const updatedState = await getGameState()
        if (!updatedState) return

        // Check if any player has non-passive reaction
        const lastRoundReactions = updatedState.reactions?.[updatedState.reactions.length - 1]
        const hasNonPassive = lastRoundReactions?.reactions.some(
            (r) => r.reaction !== "passive"
        )

        if (hasNonPassive) {
            // Navigate to thinking page
            router.push("/game/thinking")
        } else {
            // All passive - go to results
            router.push("/game/results")
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

    if (!gameState || players.length === 0) {
        return null
    }

    const remainingCards = gameState.cardOrder.slice(gameState.currentCardIndex + 1)
    const revealedCardId = gameState.currentCardId

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

            {/* Card Stack Area */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
                {/* Instruction Text */}
                {!isCardRevealed && (
                    <p className="text-sm text-muted-foreground text-center">
                        {t("game.selectCard")}
                    </p>
                )}

                {/* Card Stack */}
                <div className="relative flex items-center justify-center min-h-[300px]">
                    {/* Card Stack (remaining cards) */}
                    {remainingCards.length > 0 && !isCardRevealed && (
                        <button
                            onClick={handleCardStackClick}
                            className={cn(
                                "relative flex items-center justify-center transition-all cursor-pointer",
                                "hover:scale-105"
                            )}
                        >
                            {remainingCards.slice(0, 3).map((cardId, index) => {
                                return (
                                    <div
                                        key={cardId}
                                        className={cn(
                                            "absolute w-32 h-48 rounded-lg border-2 shadow-lg transition-all overflow-hidden",
                                            index === 0 && "z-10",
                                            index === 1 && "z-0 -ms-1 mt-1",
                                            index === 2 && "z-0 -ms-2 mt-2"
                                        )}
                                    >
                                        <Image
                                            src={cartBackImage}
                                            alt={t("game.cardBack")}
                                            fill
                                            className="object-cover"
                                            sizes="128px"
                                        />
                                    </div>
                                )
                            })}
                        </button>
                    )}

                    {/* Revealed Card - Rotated and positioned beside stack */}
                    {isCardRevealed && revealedCardId && (
                        <div className="flex items-center gap-4">
                            {/* Remaining stack (if any) */}
                            {remainingCards.length > 0 && (
                                <div className="relative flex items-center justify-center">
                                    {remainingCards.slice(0, 2).map((cardId, index) => {
                                        return (
                                            <div
                                                key={cardId}
                                                className={cn(
                                                    "absolute w-32 h-48 rounded-lg border-2 shadow-lg overflow-hidden",
                                                    index === 0 && "z-10",
                                                    index === 1 && "z-0 -ms-1 mt-1"
                                                )}
                                            >
                                                <Image
                                                    src={cartBackImage}
                                                    alt="Card back"
                                                    fill
                                                    className="object-cover"
                                                    sizes="128px"
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Revealed Card */}
                            <div
                                className={cn(
                                    "relative z-20 transition-all duration-500",
                                    "animate-in fade-in slide-in-from-bottom-4"
                                )}
                                style={{
                                    transform: "rotate(-5deg)",
                                }}
                            >
                                <button
                                    onClick={() => handleCardClick(revealedCardId)}
                                    className="w-40 h-56 rounded-lg border-2 bg-card shadow-xl hover:scale-105 transition-transform flex flex-col items-center justify-center gap-3 p-4"
                                >
                                    <span className="text-5xl">{currentCard?.emoji}</span>
                                    <span className="text-sm font-semibold text-center line-clamp-2">
                                        {currentCard?.title}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hint Text - Below revealed card */}
                {isCardRevealed && revealedCardId && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                        {t("game.clickCardHint")}
                    </p>
                )}
            </div>

            {/* Bottom Section - Instructions and Next Button */}
            {isCardRevealed && (
                <div className="flex flex-col gap-4 mt-auto pt-6">
                    {/* Instruction Text */}
                    <p className="text-sm text-muted-foreground text-center leading-relaxed px-4">
                        {t("game.cardRevealedInstruction")}
                    </p>

                    {/* Next Step Button */}
                    <Button
                        onClick={() => {
                            setIsReactionDrawerOpen(true)
                        }}
                        className="bg-green-500 hover:bg-green-600 w-full"
                    >
                        {t("game.nextStep")}
                    </Button>
                </div>
            )}

            {/* Card Drawer */}
            <CardDrawer
                card={currentCard}
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                onContinue={handleDrawerClose}
            />

            {/* Reaction Drawer */}
            <ReactionDrawer
                players={players}
                activePlayerId={gameState.activePlayerId}
                open={isReactionDrawerOpen}
                onOpenChange={setIsReactionDrawerOpen}
                onSave={handleReactionsSave}
                existingReactions={Object.keys(existingReactions).length > 0 ? existingReactions : undefined}
                disabled={Object.keys(existingReactions).length > 0}
                onContinue={handleReactionsContinue}
                gameState={gameState}
            />

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

