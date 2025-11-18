/**
 * Achievement system type definitions
 */

import type { GameState, PlayerScores, User } from "./types"

/**
 * Achievement check trigger types
 */
export type AchievementCheckTrigger = "instant" | "round_end" | "game_end"

/**
 * Achievement category types
 */
export type AchievementCategory = "individual" | "team"

/**
 * Achievement difficulty levels
 */
export type AchievementDifficulty = "easy" | "medium" | "hard" | "very_hard"

/**
 * Achievement check context
 */
export interface AchievementCheckContext {
  gameState: GameState
  users: User[]
  currentRound?: number
  playerId?: string // For individual achievements
  roundScores?: PlayerScores[] // For round_end checks
  finalScores?: PlayerScores[] // For game_end checks
}

/**
 * Achievement check function type
 * Returns true if achievement conditions are met
 */
export type AchievementCheckFunction = (context: AchievementCheckContext) => boolean

/**
 * Achievement definition
 */
export interface Achievement {
  slug: string
  translationKey: string // Key for translation (e.g., "achievements.ironMind")
  icon: string // Lucide icon name
  xp: number
  category: AchievementCategory
  difficulty: AchievementDifficulty
  checkTrigger: AchievementCheckTrigger
  checkFunction: AchievementCheckFunction
}

/**
 * Unlocked achievement data
 */
export interface UnlockedAchievement {
  slug: string
  playerId?: string // For individual achievements
  unlockedAt: string // ISO timestamp
  xp: number
}

