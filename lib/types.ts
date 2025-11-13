/**
 * Data structure definitions for the Bravery Game application
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
 * Represents a situation card in the game
 */
export interface SituationCard {
  id: string
  title: string
  scenario: string
  emoji: string
  individualGain: {
    selfRespect: number
    additionalSelfRespect?: number
    description?: string
  }
  individualCost: {
    relationshipHealth?: number
    goalAchievement?: number
    mentalEnergy?: number
    personalTime?: number
    description?: string
  }
  teamResults: {
    allAssertive?: number
    onlyOneAssertive?: number
    perPerson?: number
    perPersonAssertive?: number
    description?: string
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
  startedAt: string
  lastUpdatedAt: string
}

