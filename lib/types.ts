/**
 * Data structure definitions for the BravePulse application
 */

/**
 * Represents a registered user in the system
 */
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  createdAt: string // ISO 8601 date string
  updatedAt: string // ISO 8601 date string
}

/**
 * Represents a stage/level in the game
 */
export interface GameStage {
  id: string
  name: string
  description?: string
  order: number // Order of the stage in the game sequence
  isActive: boolean
}

/**
 * Represents the game progress for a specific user
 */
export interface GameProgress {
  userId: string
  currentStageId: string | null
  completedStages: string[] // Array of completed stage IDs
  score: number
  startedAt: string // ISO 8601 date string
  lastPlayedAt: string // ISO 8601 date string
  metadata?: Record<string, unknown> // Additional progress data
}

/**
 * Represents individual gain and cost for a specific reaction type
 */
export interface ReactionGainAndCost {
  selfRespect: number
  selfRespectDescription?: string
  relationshipHealth: number
  relationshipHealthDescription?: string
  goalAchievement: number
  goalAchievementDescription?: string
  customCost?: number
  customCostTitle?: string
  customCostDescription?: string
}

/**
 * Represents a situation card in the game
 */
export interface SituationCard {
  id: string
  title: string
  scenario: string
  emoji: string
  individualGainAndCost: {
    passive: ReactionGainAndCost
    aggressive: ReactionGainAndCost
    assertive: ReactionGainAndCost
  }
  teamResults: {
    allAssertive?: number
    allAssertiveDescription?: string
    onlyOneAssertive?: number
    onlyOneAssertiveDescription?: string
    perPersonAssertive?: number
    perPersonAssertiveDescription?: string
  }
}

/**
 * Reaction card types
 */
export type ReactionType = "passive" | "assertive" | "aggressive"

/**
 * Player reaction for a round
 */
export interface PlayerReaction {
  playerId: string
  reaction: ReactionType
}

/**
 * Round reactions data
 */
export interface RoundReactions {
  round: number
  cardId: string
  reactions: PlayerReaction[]
  feedback?: ReactionFeedback[] // Feedback from active player for assertive/aggressive reactions
}

/**
 * Player scores for KPIs
 */
export interface PlayerScores {
  playerId: string
  selfRespect: number
  relationshipHealth: number
  goalAchievement: number
}

/**
 * Reaction feedback from active player
 */
export interface ReactionFeedback {
  playerId: string // The player who gave the reaction
  relationshipHealthFeedback?: "good" | "normal" | "bad" // Feedback on relationship health impact
  goalAchievementFeedback?: "could" | "normal" | "couldnt" // Feedback on goal achievement impact
  customCostKpi?: "selfRespect" | "relationshipHealth" | "goalAchievement" // Which KPI to apply customCost to
}

/**
 * Represents an aggressive reaction event
 */
export interface AggressiveReaction {
  playerId: string
  round: number // The round in which aggressive reaction occurred
}

/**
 * Round score calculations
 */
export interface RoundScores {
  round: number
  cardId: string
  playerScores: PlayerScores[] // Scores after this round
  teamScore: number // Team score after this round
  feedback?: ReactionFeedback[] // Feedback from active player for assertive/aggressive reactions
  fatiguedPlayers?: PlayerFatigue[] // Players who experienced fatigue in this round
  burnoutEvents?: PlayerBurnout[] // Players who experienced burnout in this round
  aggressiveReactions?: AggressiveReaction[] // Players who played aggressively in this round
}

/**
 * Represents a player's fatigue status
 */
export interface PlayerFatigue {
  playerId: string
  round: number // The round in which the player is fatigued (cannot play assertively in next round)
}

/**
 * Represents a burnout event for a player
 */
export interface PlayerBurnout {
  playerId: string
  round: number // The round in which burnout occurred
  kpi: "selfRespect" | "relationshipHealth" | "goalAchievement" // Which KPI reached zero
}

/**
 * Represents the current game state
 */
export interface GameState {
  currentRound: number
  currentCardIndex: number
  cardOrder: string[] // Array of card IDs in the order they will be played
  currentCardId: string | null
  activePlayerId: string | null
  players: string[] // Array of player/user IDs
  isCardRevealed: boolean
  selectedCardId: string | null
  reactions?: RoundReactions[] // Array of reactions for each round
  scores?: RoundScores[] // Array of scores for each round
  teamScore: number // Current team score
  fatiguedPlayers?: PlayerFatigue[] // Players who are fatigued and cannot play assertively
  burnoutHistory?: PlayerBurnout[] // Complete history of all burnout events
  startedAt: string
  lastUpdatedAt: string
}

