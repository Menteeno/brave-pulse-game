/**
 * Hook for managing achievement checks and unlocks
 */

import { useState, useCallback } from "react"
import type { GameState, User, PlayerScores } from "../types"
import type { Achievement } from "../achievementTypes"
import { checkAchievements, unlockAchievements } from "../achievementService"
import { getAllUsers } from "../dataService"

interface UnlockedAchievementData {
  achievement: Achievement
  player?: User
  isTeamAchievement: boolean
}

export function useAchievements() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievementData[]>([])
  const [isChecking, setIsChecking] = useState(false)
  
  // Calculate next unlocked achievement from state
  const nextUnlocked = unlockedAchievements.length > 0 ? unlockedAchievements[0] : null

  /**
   * Check achievements for a specific trigger and unlock them
   */
  const checkAndUnlockAchievements = useCallback(
    async (
      trigger: "instant" | "round_end" | "game_end",
      gameState: GameState,
      options?: {
        playerId?: string
        roundScores?: PlayerScores[]
        finalScores?: PlayerScores[]
      }
    ) => {
      if (isChecking) return // Prevent concurrent checks

      try {
        setIsChecking(true)
        const users = await getAllUsers()

        // Check achievements
        const newlyUnlocked = await checkAchievements(trigger, gameState, options)

        if (newlyUnlocked.length === 0) {
          setIsChecking(false)
          return
        }

        // Unlock achievements (call API and mark as unlocked)
        await unlockAchievements(newlyUnlocked)

        // Prepare data for modal display
        const unlockedData: UnlockedAchievementData[] = newlyUnlocked.map(({ achievement, playerId }) => {
          const player = playerId ? users.find((u) => u.id === playerId) : undefined
          return {
            achievement,
            player,
            isTeamAchievement: achievement.category === "team",
          }
        })

        setUnlockedAchievements(unlockedData)
      } catch (error) {
        console.error("Error checking achievements:", error)
      } finally {
        setIsChecking(false)
      }
    },
    [isChecking]
  )

  /**
   * Clear unlocked achievements (after modal is closed)
   */
  const clearUnlockedAchievements = useCallback(() => {
    setUnlockedAchievements([])
  }, [])

  /**
   * Remove the first unlocked achievement (after modal is closed)
   */
  const removeFirstUnlockedAchievement = useCallback(() => {
    setUnlockedAchievements((prev) => prev.slice(1))
  }, [])

  return {
    checkAndUnlockAchievements,
    clearUnlockedAchievements,
    nextUnlocked,
    removeFirstUnlockedAchievement,
    hasUnlockedAchievements: unlockedAchievements.length > 0,
    isChecking,
  }
}

