/**
 * Scoring Service - Handles score calculations for players and team
 */

import {
  GameState,
  SituationCard,
  ReactionType,
  PlayerScores,
  RoundScores,
  ReactionFeedback,
  PlayerFatigue,
  PlayerBurnout,
  AggressiveReaction,
} from "./types"
import { getGameState, saveGameState } from "./dataService"
import { getCurrentCard } from "./gameService"

const DEFAULT_SCORE = 5

/**
 * Initialize player scores with default values
 */
export function initializePlayerScores(playerIds: string[]): PlayerScores[] {
  return playerIds.map((playerId) => ({
    playerId,
    selfRespect: DEFAULT_SCORE,
    relationshipHealth: DEFAULT_SCORE,
    goalAchievement: DEFAULT_SCORE,
  }))
}

/**
 * Get current player scores (from last round or initialize if first round)
 */
export function getCurrentPlayerScores(
  gameState: GameState,
  playerIds: string[]
): PlayerScores[] {
  if (!gameState.scores || gameState.scores.length === 0) {
    return initializePlayerScores(playerIds)
  }

  // Get scores from last round
  const lastRoundScores = gameState.scores[gameState.scores.length - 1]
  return lastRoundScores.playerScores
}

/**
 * Calculate individual scores for a player based on their reaction
 */
function calculatePlayerScore(
  currentScores: PlayerScores,
  reaction: ReactionType,
  card: SituationCard,
  feedback?: ReactionFeedback
): PlayerScores {
  const reactionData = card.individualGainAndCost[reaction]
  let newScores = { ...currentScores }

  // Apply base scores from reaction
  newScores.selfRespect += reactionData.selfRespect
  newScores.relationshipHealth += reactionData.relationshipHealth
  newScores.goalAchievement += reactionData.goalAchievement

  // Apply customCost if it exists and feedback specifies which KPI to apply it to
  if (reactionData.customCost && reactionData.customCost !== 0 && feedback?.customCostKpi) {
    console.log(`[calculatePlayerScore] Applying customCost:`, {
      playerId: currentScores.playerId,
      customCost: reactionData.customCost,
      customCostKpi: feedback.customCostKpi,
      before: {
        selfRespect: newScores.selfRespect,
        relationshipHealth: newScores.relationshipHealth,
        goalAchievement: newScores.goalAchievement,
      }
    })

    if (feedback.customCostKpi === "selfRespect") {
      newScores.selfRespect += reactionData.customCost
    } else if (feedback.customCostKpi === "relationshipHealth") {
      newScores.relationshipHealth += reactionData.customCost
    } else if (feedback.customCostKpi === "goalAchievement") {
      newScores.goalAchievement += reactionData.customCost
    }

    console.log(`[calculatePlayerScore] After customCost:`, {
      playerId: currentScores.playerId,
      after: {
        selfRespect: newScores.selfRespect,
        relationshipHealth: newScores.relationshipHealth,
        goalAchievement: newScores.goalAchievement,
      }
    })
  } else if (reactionData.customCost && reactionData.customCost !== 0) {
    console.log(`[calculatePlayerScore] customCost exists but not applied:`, {
      playerId: currentScores.playerId,
      customCost: reactionData.customCost,
      hasFeedback: !!feedback,
      customCostKpi: feedback?.customCostKpi,
      reaction
    })
  }

  // Apply feedback adjustments for assertive reactions only
  // Only apply if the player's reaction matches the feedback playerId
  if (feedback && feedback.playerId === currentScores.playerId && reaction === "assertive") {
    // Adjust relationship health based on feedback
    if (feedback.relationshipHealthFeedback) {
      if (feedback.relationshipHealthFeedback === "good") {
        // Add +1 to relationship health
        newScores.relationshipHealth += 1
      } else if (feedback.relationshipHealthFeedback === "bad") {
        // Subtract -1 from relationship health
        newScores.relationshipHealth -= 1
      }
      // "normal" has no effect (no change)
    }

    // Adjust goal achievement based on feedback
    if (feedback.goalAchievementFeedback) {
      if (feedback.goalAchievementFeedback === "could") {
        // Add +1 to goal achievement
        newScores.goalAchievement += 1
      } else if (feedback.goalAchievementFeedback === "couldnt") {
        // Subtract -1 from goal achievement
        newScores.goalAchievement -= 1
      }
      // "normal" has no effect (no change)
    }
  }

  // Ensure scores don't go below 0 (or handle burnout if needed)
  newScores.selfRespect = Math.max(0, newScores.selfRespect)
  newScores.relationshipHealth = Math.max(0, newScores.relationshipHealth)
  newScores.goalAchievement = Math.max(0, newScores.goalAchievement)

  return newScores
}

/**
 * Calculate team score based on reactions
 */
function calculateTeamScore(
  reactions: Array<{ playerId: string; reaction: ReactionType }>,
  card: SituationCard,
  currentTeamScore: number
): number {
  const assertiveCount = reactions.filter((r) => r.reaction === "assertive").length
  const totalPlayers = reactions.length

  let teamScoreChange = 0

  if (assertiveCount === totalPlayers && card.teamResults.allAssertive !== undefined) {
    // All players were assertive
    teamScoreChange = card.teamResults.allAssertive
  } else if (assertiveCount === 1 && card.teamResults.onlyOneAssertive !== undefined) {
    // Only one player was assertive
    teamScoreChange = card.teamResults.onlyOneAssertive
  } else if (card.teamResults.perPersonAssertive !== undefined) {
    // Per person assertive bonus
    teamScoreChange = assertiveCount * card.teamResults.perPersonAssertive
  }

  return currentTeamScore + teamScoreChange
}

/**
 * Calculate scores for a round
 */
export async function calculateRoundScores(
  gameState: GameState,
  language: string = "fa",
  feedback?: ReactionFeedback[]
): Promise<RoundScores> {
  const lastRoundReactions = gameState.reactions?.[gameState.reactions.length - 1]
  if (!lastRoundReactions) {
    throw new Error("No reactions found for current round")
  }

  const card = await getCurrentCard(language)
  if (!card) {
    throw new Error("Current card not found")
  }

  // Use feedback from parameter if provided, otherwise use feedback from lastRoundReactions
  const feedbackToUse = feedback || lastRoundReactions.feedback

  // Get current player scores
  const currentScores = getCurrentPlayerScores(gameState, gameState.players)

  // Calculate new scores for each player
  const newPlayerScores: PlayerScores[] = currentScores.map((currentScore) => {
    const playerReaction = lastRoundReactions.reactions.find(
      (r) => r.playerId === currentScore.playerId
    )
    if (!playerReaction) {
      // If no reaction found, still return the current score so player appears in results
      return currentScore
    }

    // Find feedback for this specific player
    const playerFeedback = feedbackToUse?.find((f) => f.playerId === currentScore.playerId)

    return calculatePlayerScore(currentScore, playerReaction.reaction, card, playerFeedback)
  })

  // Ensure all players from gameState.players are included in scores
  // This handles edge cases where a player might not have been in currentScores
  const playerIdsInScores = new Set(newPlayerScores.map(s => s.playerId))
  const missingPlayers = gameState.players
    .filter(playerId => playerId !== gameState.activePlayerId) // Exclude active player
    .filter(playerId => !playerIdsInScores.has(playerId))

  // Add missing players with their initial scores
  missingPlayers.forEach(playerId => {
    const existingScore = currentScores.find(s => s.playerId === playerId)
    if (existingScore) {
      newPlayerScores.push(existingScore)
    } else {
      // Initialize with default scores if not found
      newPlayerScores.push({
        playerId,
        selfRespect: DEFAULT_SCORE,
        relationshipHealth: DEFAULT_SCORE,
        goalAchievement: DEFAULT_SCORE,
      })
    }
  })

  // Calculate team score
  const currentTeamScore = gameState.teamScore || 0
  let newTeamScore = calculateTeamScore(
    lastRoundReactions.reactions,
    card,
    currentTeamScore
  )

  // Calculate aggressive penalty: -3 points per aggressive reaction
  const aggressiveReactions: AggressiveReaction[] = lastRoundReactions.reactions
    .filter((r) => r.reaction === "aggressive")
    .map((r) => ({
      playerId: r.playerId,
      round: gameState.currentRound,
    }))
  const aggressivePenalty = aggressiveReactions.length * -3
  newTeamScore += aggressivePenalty

  // Check for burnout: if any indicator reaches 0, apply burnout mechanic
  const fatiguedPlayers: PlayerFatigue[] = []
  const burnoutEvents: PlayerBurnout[] = []
  let burnoutPenalty = 0

  newPlayerScores.forEach((playerScore) => {
    let hasBurnout = false
    let indicatorReachedZero: "selfRespect" | "relationshipHealth" | "goalAchievement" | null = null

    // Check if any indicator reached 0
    if (playerScore.selfRespect === 0) {
      hasBurnout = true
      indicatorReachedZero = "selfRespect"
    } else if (playerScore.relationshipHealth === 0) {
      hasBurnout = true
      indicatorReachedZero = "relationshipHealth"
    } else if (playerScore.goalAchievement === 0) {
      hasBurnout = true
      indicatorReachedZero = "goalAchievement"
    }

    if (hasBurnout && indicatorReachedZero) {
      // Apply burnout mechanic:
      // 1. Team loses -10 points per burnout
      burnoutPenalty -= 10

      // 2. Apply "shock" - reset the indicator to 3
      playerScore[indicatorReachedZero] = 3

      // 3. Record burnout event
      burnoutEvents.push({
        playerId: playerScore.playerId,
        round: gameState.currentRound,
        kpi: indicatorReachedZero,
      })

      // 4. Mark player as fatigued for the next round (currentRound + 1)
      fatiguedPlayers.push({
        playerId: playerScore.playerId,
        round: gameState.currentRound + 1,
      })
    }
  })

  // Apply burnout penalty to team score (multiplied by number of burnout events)
  newTeamScore += burnoutPenalty

  return {
    round: gameState.currentRound,
    cardId: lastRoundReactions.cardId,
    playerScores: newPlayerScores,
    teamScore: newTeamScore,
    feedback: feedbackToUse, // Use feedbackToUse instead of feedback parameter
    fatiguedPlayers: fatiguedPlayers.length > 0 ? fatiguedPlayers : undefined,
    burnoutEvents: burnoutEvents.length > 0 ? burnoutEvents : undefined,
    aggressiveReactions: aggressiveReactions.length > 0 ? aggressiveReactions : undefined,
  }
}

/**
 * Save round scores to game state
 * Only saves if scores for this round don't already exist
 */
export async function saveRoundScores(roundScores: RoundScores): Promise<void> {
  const gameState = await getGameState()
  if (!gameState) {
    throw new Error("Game state not found")
  }

  const existingScores = gameState.scores || []

  // Check if scores for this round already exist
  const existingRoundScore = existingScores.find(
    (s) => s.round === roundScores.round
  )

  if (existingRoundScore) {
    // Scores already exist for this round, don't recalculate
    return
  }

  const updatedScores = [...existingScores, roundScores]

  // Update fatigued players: merge new fatigued players with existing ones
  // Remove fatigued players from previous rounds (they can play assertively again)
  const existingFatiguedPlayers = gameState.fatiguedPlayers || []
  const currentRound = gameState.currentRound

  // Keep only fatigued players that are still in effect (their round >= currentRound)
  const activeFatiguedPlayers = existingFatiguedPlayers.filter(
    (fp) => fp.round >= currentRound
  )

  // Add new fatigued players from this round
  const newFatiguedPlayers = roundScores.fatiguedPlayers || []
  const allFatiguedPlayers = [...activeFatiguedPlayers, ...newFatiguedPlayers]

  // Remove duplicates (same playerId, keep the one with the highest round)
  const uniqueFatiguedPlayers = allFatiguedPlayers.reduce((acc, current) => {
    const existing = acc.find((fp) => fp.playerId === current.playerId)
    if (!existing) {
      acc.push(current)
    } else if (current.round > existing.round) {
      // Replace with the one that has a higher round number
      const index = acc.indexOf(existing)
      acc[index] = current
    }
    return acc
  }, [] as PlayerFatigue[])

  // Update burnout history: add new burnout events to existing history
  const existingBurnoutHistory = gameState.burnoutHistory || []
  const newBurnoutEvents = roundScores.burnoutEvents || []
  const updatedBurnoutHistory = [...existingBurnoutHistory, ...newBurnoutEvents]

  const updatedState: GameState = {
    ...gameState,
    scores: updatedScores,
    teamScore: roundScores.teamScore,
    fatiguedPlayers: uniqueFatiguedPlayers.length > 0 ? uniqueFatiguedPlayers : undefined,
    burnoutHistory: updatedBurnoutHistory.length > 0 ? updatedBurnoutHistory : undefined,
    lastUpdatedAt: new Date().toISOString(),
  }

  await saveGameState(updatedState)
}

