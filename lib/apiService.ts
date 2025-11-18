/**
 * API Service - Handles communication with backend API
 */

import type { User, GameState } from "./types"
import { getAllUsers } from "./dataService"
import { loadSituationCards } from "./gameService"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACK_END_URL || "http://menteeno.local/api"
const GAME_API_KEY = process.env.NEXT_PUBLIC_GAME_API_KEY || "qwertyuiop"
const GAME_SLUG = process.env.NEXT_PUBLIC_GAME_SLUG || "default"

// Storage key for game score IDs
const GAME_SCORE_IDS_KEY = "bravery_game_score_ids"
const GAME_IDS_KEY = "bravery_game_ids"

interface CreateScoreRequest {
    email: string
    score_data: {
        selfRespect: number
        relationshipHealth: number
        goalAchievement: number
        team: number
    }
    metadata?: Record<string, unknown>
}

interface UpdateScoreRequest {
    score_data: {
        selfRespect: number
        relationshipHealth: number
        goalAchievement: number
        team: number
    }
    metadata?: Record<string, unknown>
}

interface CreateScoreResponseData {
    id: string
    game_id: string
    user_id: string
    score_data: unknown[]
    metadata: unknown[]
    user: {
        id: string
        name: string
        email: string
    }
    created_at: string
    updated_at: string
}

interface CreateScoreResponse {
    data: CreateScoreResponseData
}

/**
 * Get game slug from environment variable
 */
function getGameSlug(): string {
    return GAME_SLUG
}

/**
 * Store game score ID and game ID for a user
 */
function storeGameScoreData(userId: string, gameScoreId: string, gameId: string): void {
    try {
        if (typeof window === "undefined") return

        // Store game score ID
        const stored = localStorage.getItem(GAME_SCORE_IDS_KEY)
        const scoreIds: Record<string, string> = stored ? JSON.parse(stored) : {}
        scoreIds[userId] = gameScoreId
        localStorage.setItem(GAME_SCORE_IDS_KEY, JSON.stringify(scoreIds))

        // Store game ID
        const storedGameIds = localStorage.getItem(GAME_IDS_KEY)
        const gameIds: Record<string, string> = storedGameIds ? JSON.parse(storedGameIds) : {}
        gameIds[userId] = gameId
        localStorage.setItem(GAME_IDS_KEY, JSON.stringify(gameIds))
    } catch (error) {
        console.error("Failed to store game score data:", error)
    }
}

/**
 * Get game score ID for a user
 */
function getGameScoreId(userId: string): string | null {
    try {
        if (typeof window === "undefined") return null

        const stored = localStorage.getItem(GAME_SCORE_IDS_KEY)
        if (!stored) return null

        const scoreIds: Record<string, string> = JSON.parse(stored)
        return scoreIds[userId] || null
    } catch (error) {
        console.error("Failed to get game score ID:", error)
        return null
    }
}

/**
 * Get game ID for a user (from stored data or use game slug)
 */
function getGameIdForUser(userId: string): string {
    try {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(GAME_IDS_KEY)
            if (stored) {
                const gameIds: Record<string, string> = JSON.parse(stored)
                if (gameIds[userId]) {
                    return gameIds[userId]
                }
            }
        }
    } catch (error) {
        console.error("Failed to get game ID for user:", error)
    }
    // Fallback to game slug if not found
    return getGameSlug()
}

/**
 * Create a user score in the backend
 */
export async function createUserScore(
    user: User,
    userCount: number
): Promise<{ success: boolean; gameScoreId?: string; error?: string }> {
    try {
        const gameSlug = getGameSlug()

        const requestData: CreateScoreRequest = {
            email: user.email,
            score_data: {
                selfRespect: 5,
                relationshipHealth: 5,
                goalAchievement: 5,
                team: userCount * 10,
            },
            metadata: {
                firstName: user.firstName,
                lastName: user.lastName,
                createdAt: user.createdAt,
            },
        }

        const response = await fetch(`${BACKEND_URL}/v1/games/${gameSlug}/scores`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "X-Game-API-Key": GAME_API_KEY
            },
            body: JSON.stringify(requestData),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Failed to create user score:", response.status, errorText)
            return {
                success: false,
                error: `API error: ${response.status}`,
            }
        }

        const responseData: CreateScoreResponse = await response.json()

        // Extract data from nested response structure
        if (responseData.data) {
            const { id, game_id } = responseData.data

            // Store both game_id and id (gameScoreId)
            if (id && game_id) {
                storeGameScoreData(user.id, id, game_id)
            }

            return {
                success: true,
                gameScoreId: id,
            }
        }

        // Fallback for unexpected response structure
        console.warn("Unexpected response structure:", responseData)
        return {
            success: false,
            error: "Unexpected response structure",
        }
    } catch (error) {
        console.error("Error creating user score:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }
    }
}

/**
 * Build metadata object from game state
 */
async function buildGameMetadata(gameState: GameState, language: string = "fa"): Promise<Record<string, unknown>> {
    const users = await getAllUsers()
    const userMap = new Map(users.map((u) => [u.id, u]))

    // Load cards to get card details
    const cards = await loadSituationCards(language)
    const cardMap = new Map(cards.map((c) => [c.id, c]))

    const metadata: Record<string, unknown> = {
        gameInfo: {
            currentRound: gameState.currentRound,
            totalRounds: parseInt(process.env.NEXT_PUBLIC_MAX_ROUNDS || "8", 10),
            startedAt: gameState.startedAt,
            lastUpdatedAt: gameState.lastUpdatedAt,
            teamScore: gameState.teamScore,
            playerCount: gameState.players.length,
            cardOrder: gameState.cardOrder,
        },
        playedCards: [] as unknown[],
        reactions: [] as unknown[],
        scores: [] as unknown[],
        feedbacks: [] as unknown[],
        customCosts: [] as unknown[],
        fatiguedPlayers: gameState.fatiguedPlayers || [],
        burnoutHistory: gameState.burnoutHistory || [],
    }

    // Add played cards and reactions
    if (gameState.reactions) {
        gameState.reactions.forEach((roundReaction) => {
            const card = cardMap.get(roundReaction.cardId)

            // Build card details
            const cardDetails: Record<string, unknown> = {
                round: roundReaction.round,
                cardId: roundReaction.cardId,
            }

            if (card) {
                cardDetails.title = card.title
                cardDetails.scenario = card.scenario
                cardDetails.emoji = card.emoji
                cardDetails.individualGainAndCost = card.individualGainAndCost
                cardDetails.teamResults = card.teamResults
            }

            // Add reactions for this card
            cardDetails.reactions = roundReaction.reactions.map((r) => {
                const player = userMap.get(r.playerId)
                return {
                    playerId: r.playerId,
                    playerName: player
                        ? `${player.firstName} ${player.lastName}`
                        : r.playerId,
                    playerEmail: player?.email || "",
                    reaction: r.reaction,
                }
            })

                ; (metadata.playedCards as unknown[]).push(cardDetails)

                ; (metadata.reactions as unknown[]).push({
                    round: roundReaction.round,
                    cardId: roundReaction.cardId,
                    reactions: roundReaction.reactions,
                })

            // Add feedbacks
            if (roundReaction.feedback) {
                roundReaction.feedback.forEach((feedback) => {
                    const player = userMap.get(feedback.playerId)
                    const feedbackData: Record<string, unknown> = {
                        round: roundReaction.round,
                        cardId: roundReaction.cardId,
                        playerId: feedback.playerId,
                        playerName: player
                            ? `${player.firstName} ${player.lastName}`
                            : feedback.playerId,
                        playerEmail: player?.email || "",
                    }

                    if (feedback.relationshipHealthFeedback) {
                        feedbackData.relationshipHealthFeedback = feedback.relationshipHealthFeedback
                    }
                    if (feedback.goalAchievementFeedback) {
                        feedbackData.goalAchievementFeedback = feedback.goalAchievementFeedback
                    }
                    if (feedback.customCostKpi) {
                        feedbackData.customCostKpi = feedback.customCostKpi
                        // Get custom cost value from card if available
                        if (card && card.individualGainAndCost.assertive.customCost) {
                            feedbackData.customCost = card.individualGainAndCost.assertive.customCost
                            feedbackData.customCostTitle = card.individualGainAndCost.assertive.customCostTitle
                            feedbackData.customCostDescription = card.individualGainAndCost.assertive.customCostDescription
                        }
                    }

                    ; (metadata.feedbacks as unknown[]).push(feedbackData)

                    // Extract custom costs from feedback
                    if (feedback.customCostKpi) {
                        const customCostData: Record<string, unknown> = {
                            round: roundReaction.round,
                            cardId: roundReaction.cardId,
                            playerId: feedback.playerId,
                            playerName: player
                                ? `${player.firstName} ${player.lastName}`
                                : feedback.playerId,
                            playerEmail: player?.email || "",
                            customCostKpi: feedback.customCostKpi,
                        }

                        if (card && card.individualGainAndCost.assertive.customCost) {
                            customCostData.customCost = card.individualGainAndCost.assertive.customCost
                            customCostData.customCostTitle = card.individualGainAndCost.assertive.customCostTitle
                            customCostData.customCostDescription = card.individualGainAndCost.assertive.customCostDescription
                        }

                        ; (metadata.customCosts as unknown[]).push(customCostData)
                    }
                })
            }
        })
    }

    // Add scores
    if (gameState.scores) {
        gameState.scores.forEach((roundScore) => {
            ; (metadata.scores as unknown[]).push({
                round: roundScore.round,
                cardId: roundScore.cardId,
                playerScores: roundScore.playerScores.map((ps) => {
                    const player = userMap.get(ps.playerId)
                    return {
                        playerId: ps.playerId,
                        playerName: player
                            ? `${player.firstName} ${player.lastName}`
                            : ps.playerId,
                        selfRespect: ps.selfRespect,
                        relationshipHealth: ps.relationshipHealth,
                        goalAchievement: ps.goalAchievement,
                    }
                }),
                teamScore: roundScore.teamScore,
                fatiguedPlayers: roundScore.fatiguedPlayers || [],
                burnoutEvents: roundScore.burnoutEvents || [],
            })
        })
    }

    return metadata
}

/**
 * Update user score in the backend
 */
export async function updateUserScore(
    user: User,
    gameState: GameState
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get game ID for this user (from stored data or use game slug)
        const gameId = getGameIdForUser(user.id)
        const gameScoreId = getGameScoreId(user.id)

        if (!gameScoreId) {
            console.warn(`No game score ID found for user ${user.id}, creating new score instead`)
            // Try to create a new score if update ID is missing
            const users = await getAllUsers()
            const result = await createUserScore(user, users.length)
            if (!result.success) {
                return result
            }
            // Retry with the new gameScoreId and gameId
            const newGameScoreId = getGameScoreId(user.id)
            const newGameId = getGameIdForUser(user.id)
            if (!newGameScoreId) {
                return {
                    success: false,
                    error: "Failed to get game score ID after creation",
                }
            }
            // Update the gameId in case it was stored from the response
            return updateUserScore(user, gameState)
        }

        // Get final scores for this user
        const lastRoundScores = gameState.scores?.[gameState.scores.length - 1]
        if (!lastRoundScores) {
            return {
                success: false,
                error: "No scores found for final round",
            }
        }

        const userScore = lastRoundScores.playerScores.find((ps) => ps.playerId === user.id)
        if (!userScore) {
            return {
                success: false,
                error: "User score not found in final round",
            }
        }

        const users = await getAllUsers()
        // Try to detect language from localStorage or use default
        let language = "fa"
        try {
            if (typeof window !== "undefined") {
                const storedLang = localStorage.getItem("i18nextLng") || localStorage.getItem("language")
                if (storedLang) {
                    language = storedLang.startsWith("fa") ? "fa" : "en"
                }
            }
        } catch (error) {
            // Use default if detection fails
        }
        const metadata = await buildGameMetadata(gameState, language)

        const requestData: UpdateScoreRequest = {
            score_data: {
                selfRespect: userScore.selfRespect,
                relationshipHealth: userScore.relationshipHealth,
                goalAchievement: userScore.goalAchievement,
                team: lastRoundScores.teamScore,
            },
            metadata,
        }

        // Use the stored game_id for the URL, or fallback to game slug
        const gameSlug = getGameSlug()

        const response = await fetch(
            `${BACKEND_URL}/v1/games/${gameSlug}/scores/${gameScoreId}`,
            {
                method: "PUT",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-Game-API-Key": GAME_API_KEY,
                },
                body: JSON.stringify(requestData),
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Failed to update user score:", response.status, errorText)
            return {
                success: false,
                error: `API error: ${response.status}`,
            }
        }

        return {
            success: true,
        }
    } catch (error) {
        console.error("Error updating user score:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }
    }
}

/**
 * Unlock an achievement for a user
 */
export async function unlockAchievement(
    achievementSlug: string,
    email: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const gameSlug = getGameSlug()

        const response = await fetch(
            `${BACKEND_URL}/v1/games/${gameSlug}/achievements/${achievementSlug}/unlock`,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-Game-API-Key": GAME_API_KEY,
                },
                body: JSON.stringify({
                    email,
                }),
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error("Failed to unlock achievement:", response.status, errorText)
            return {
                success: false,
                error: `API error: ${response.status}`,
            }
        }

        return {
            success: true,
        }
    } catch (error) {
        console.error("Error unlocking achievement:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        }
    }
}

