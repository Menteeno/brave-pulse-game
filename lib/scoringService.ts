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
    if (feedback.customCostKpi === "selfRespect") {
      newScores.selfRespect += reactionData.customCost
    } else if (feedback.customCostKpi === "relationshipHealth") {
      newScores.relationshipHealth += reactionData.customCost
    } else if (feedback.customCostKpi === "goalAchievement") {
      newScores.goalAchievement += reactionData.customCost
    }
  }

  // Apply feedback adjustments for assertive reactions only
  // Only apply if the player's reaction matches the feedback playerId
  if (feedback && feedback.playerId === currentScores.playerId && reaction === "assertive") {
    // Adjust relationship health based on feedback
    if (feedback.relationshipHealthFeedback) {
      const baseCost = reactionData.relationshipHealth
      if (baseCost < 0) {
        // Negative cost (penalty)
        if (feedback.relationshipHealthFeedback === "good") {
          // Reduce penalty by 1 (make it less negative)
          newScores.relationshipHealth += 1
        } else if (feedback.relationshipHealthFeedback === "bad") {
          // Increase penalty by 1 (make it more negative)
          newScores.relationshipHealth -= 1
        }
        // "normal" has no effect
      }
    }

    // Adjust goal achievement based on feedback
    if (feedback.goalAchievementFeedback) {
      const baseCost = reactionData.goalAchievement
      if (baseCost < 0) {
        // Negative cost (penalty)
        if (feedback.goalAchievementFeedback === "could") {
          // Reduce penalty by 1 (make it less negative)
          newScores.goalAchievement += 1
        } else if (feedback.goalAchievementFeedback === "couldnt") {
          // Increase penalty by 1 (make it more negative)
          newScores.goalAchievement -= 1
        }
        // "normal" has no effect
      }
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

  // Get current player scores
  const currentScores = getCurrentPlayerScores(gameState, gameState.players)

  // Calculate new scores for each player
  const newPlayerScores: PlayerScores[] = currentScores.map((currentScore) => {
    const playerReaction = lastRoundReactions.reactions.find(
      (r) => r.playerId === currentScore.playerId
    )
    if (!playerReaction) {
      return currentScore
    }

    // Find feedback for this specific player
    const playerFeedback = feedback?.find((f) => f.playerId === currentScore.playerId)
    return calculatePlayerScore(currentScore, playerReaction.reaction, card, playerFeedback)
  })

  // Calculate team score
  const currentTeamScore = gameState.teamScore || 0
  const newTeamScore = calculateTeamScore(
    lastRoundReactions.reactions,
    card,
    currentTeamScore
  )

  return {
    round: gameState.currentRound,
    cardId: lastRoundReactions.cardId,
    playerScores: newPlayerScores,
    teamScore: newTeamScore,
    feedback,
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

  const updatedState: GameState = {
    ...gameState,
    scores: updatedScores,
    teamScore: roundScores.teamScore,
    lastUpdatedAt: new Date().toISOString(),
  }

  await saveGameState(updatedState)
}

