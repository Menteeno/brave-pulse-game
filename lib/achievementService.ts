/**
 * Achievement service - handles checking and unlocking achievements
 */

import type { GameState, User, PlayerScores } from "./types"
import type { Achievement, AchievementCheckContext, UnlockedAchievement } from "./achievementTypes"
import { ACHIEVEMENTS, getAchievementsByTrigger } from "./achievements"
import { getAllUsers } from "./dataService"
import { unlockAchievement as apiUnlockAchievement } from "./apiService"

const STORAGE_KEY = "bravery_game_unlocked_achievements"

/**
 * Get all unlocked achievements from storage
 */
export function getUnlockedAchievements(): UnlockedAchievement[] {
  try {
    if (typeof window === "undefined") return []
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as UnlockedAchievement[]
  } catch (error) {
    console.error("Failed to get unlocked achievements:", error)
    return []
  }
}

/**
 * Check if an achievement is already unlocked
 */
export function isAchievementUnlocked(
  slug: string,
  playerId?: string
): boolean {
  const unlocked = getUnlockedAchievements()
  if (playerId) {
    // For individual achievements, check specific player
    return unlocked.some(
      (a) => a.slug === slug && a.playerId === playerId
    )
  } else {
    // For team achievements, check if any unlock exists
    return unlocked.some((a) => a.slug === slug && !a.playerId)
  }
}

/**
 * Mark achievement as unlocked in storage
 */
function markAchievementUnlocked(
  slug: string,
  playerId: string | undefined,
  xp: number
): void {
  try {
    if (typeof window === "undefined") return
    const unlocked = getUnlockedAchievements()
    const unlock: UnlockedAchievement = {
      slug,
      playerId,
      unlockedAt: new Date().toISOString(),
      xp,
    }
    unlocked.push(unlock)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked))
  } catch (error) {
    console.error("Failed to mark achievement as unlocked:", error)
  }
}

/**
 * Check achievements and return newly unlocked ones
 */
export async function checkAchievements(
  trigger: "instant" | "round_end" | "game_end",
  gameState: GameState,
  options?: {
    playerId?: string
    roundScores?: PlayerScores[]
    finalScores?: PlayerScores[]
  }
): Promise<Array<{ achievement: Achievement; playerId?: string }>> {
  const users = await getAllUsers()
  const achievementsToCheck = getAchievementsByTrigger(trigger)

  const context: AchievementCheckContext = {
    gameState,
    users,
    currentRound: gameState.currentRound,
    playerId: options?.playerId,
    roundScores: options?.roundScores,
    finalScores: options?.finalScores,
  }

  const newlyUnlocked: Array<{ achievement: Achievement; playerId?: string }> = []

  for (const achievement of achievementsToCheck) {
    if (achievement.category === "individual") {
      // Check for each player
      for (const playerId of gameState.players) {
        if (isAchievementUnlocked(achievement.slug, playerId)) {
          continue // Already unlocked for this player
        }

        const checkContext: AchievementCheckContext = {
          ...context,
          playerId,
        }

        if (achievement.checkFunction(checkContext)) {
          newlyUnlocked.push({ achievement, playerId })
        }
      }
    } else {
      // Team achievement
      if (isAchievementUnlocked(achievement.slug)) {
        continue // Already unlocked
      }

      const isUnlocked = achievement.checkFunction(context)
      if (isUnlocked) {
        newlyUnlocked.push({ achievement })
      }
    }
  }

  return newlyUnlocked
}

/**
 * Unlock an achievement (mark as unlocked and call API)
 */
export async function unlockAchievement(
  achievement: Achievement,
  playerId?: string
): Promise<{ success: boolean; error?: string }> {
  // Check if already unlocked
  if (isAchievementUnlocked(achievement.slug, playerId)) {
    return { success: true } // Already unlocked, consider it success
  }

  // Get user email for API call
  const users = await getAllUsers()
  let email: string | undefined

  if (playerId) {
    // Individual achievement
    const user = users.find((u) => u.id === playerId)
    if (!user) {
      return { success: false, error: "User not found" }
    }
    email = user.email
  } else {
    // Team achievement - unlock for all players
    // We'll call API for each player
    const results = await Promise.all(
      users.map(async (user) => {
        const result = await apiUnlockAchievement(achievement.slug, user.email)
        if (result.success) {
          markAchievementUnlocked(achievement.slug, undefined, achievement.xp)
        }
        return result
      })
    )

    // If at least one succeeded, consider it success
    const hasSuccess = results.some((r) => r.success)
    if (hasSuccess) {
      markAchievementUnlocked(achievement.slug, undefined, achievement.xp)
      return { success: true }
    } else {
      return {
        success: false,
        error: results[0]?.error || "Failed to unlock achievement",
      }
    }
  }

  // Call API for individual achievement
  const result = await apiUnlockAchievement(achievement.slug, email)
  if (result.success) {
    markAchievementUnlocked(achievement.slug, playerId, achievement.xp)
  }

  return result
}

/**
 * Unlock multiple achievements
 */
export async function unlockAchievements(
  achievements: Array<{ achievement: Achievement; playerId?: string }>
): Promise<void> {
  for (const { achievement, playerId } of achievements) {
    try {
      await unlockAchievement(achievement, playerId)
    } catch (error) {
      console.error(`Failed to unlock achievement ${achievement.slug}:`, error)
      // Continue with other achievements even if one fails
    }
  }
}

