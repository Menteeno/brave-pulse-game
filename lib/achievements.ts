/**
 * Achievement definitions
 */

import type { Achievement, AchievementCheckTrigger, AchievementCategory } from "./achievementTypes"
import type { AchievementCheckContext } from "./achievementTypes"

/**
 * Helper function to generate slug from English name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Individual Achievement: Iron Mind
 * No Burnout throughout the entire game
 */
function checkIronMind(context: AchievementCheckContext): boolean {
  if (!context.playerId) return false
  const burnoutHistory = context.gameState.burnoutHistory || []
  return !burnoutHistory.some((burnout) => burnout.playerId === context.playerId)
}

/**
 * Individual Achievement: Brave 10
 * Reach personal Assertiveness score of 10 or more
 * Assertiveness = selfRespect + goalAchievement
 */
function checkBrave10(context: AchievementCheckContext): boolean {
  if (!context.playerId || !context.finalScores) return false
  const playerScore = context.finalScores.find((ps) => ps.playerId === context.playerId)
  if (!playerScore) return false
  const assertivenessScore = playerScore.goalAchievement
  return assertivenessScore >= 10
}

/**
 * Individual Achievement: Triple Balance
 * All 3 KPIs above 10 at end of game
 */
function checkTripleBalance(context: AchievementCheckContext): boolean {
  if (!context.playerId || !context.finalScores) return false
  const playerScore = context.finalScores.find((ps) => ps.playerId === context.playerId)
  if (!playerScore) return false
  return (
    playerScore.selfRespect > 10 &&
    playerScore.relationshipHealth > 10 &&
    playerScore.goalAchievement > 10
  )
}

/**
 * Individual Achievement: The Negotiator
 * Use Assertive card at least 3 times without Burnout
 */
function checkTheNegotiator(context: AchievementCheckContext): boolean {
  if (!context.playerId) return false
  const reactions = context.gameState.reactions || []
  const burnoutHistory = context.gameState.burnoutHistory || []

  // Count assertive reactions for this player
  let assertiveCount = 0
  reactions.forEach((roundReaction) => {
    const playerReaction = roundReaction.reactions.find((r) => r.playerId === context.playerId)
    if (playerReaction?.reaction === "assertive") {
      // Check if player had burnout before this round
      const roundNumber = roundReaction.round
      const hadBurnoutBefore = burnoutHistory.some(
        (burnout) => burnout.playerId === context.playerId && burnout.round < roundNumber
      )
      if (!hadBurnoutBefore) {
        assertiveCount++
      }
    }
  })

  return assertiveCount >= 3
}

/**
 * Individual Achievement: Zero Passive
 * Never play a Passive card
 */
function checkZeroPassive(context: AchievementCheckContext): boolean {
  if (!context.playerId) return false
  const reactions = context.gameState.reactions || []
  return !reactions.some((roundReaction) => {
    const playerReaction = roundReaction.reactions.find((r) => r.playerId === context.playerId)
    return playerReaction?.reaction === "passive"
  })
}

/**
 * Individual Achievement: Lone Brave
 * In one round, be the only player to play Assertive card
 * This should only check the current round (the one that just ended)
 */
function checkLoneBrave(context: AchievementCheckContext): boolean {
  if (!context.playerId) return false
  const reactions = context.gameState.reactions || []

  // For round_end trigger, we check the last round that was completed
  const roundReaction = reactions[reactions.length - 1]

  if (!roundReaction) return false

  const playerReaction = roundReaction.reactions.find((r) => r.playerId === context.playerId)
  if (playerReaction?.reaction === "assertive") {
    // Check if this player is the only one with assertive
    const assertivePlayers = roundReaction.reactions.filter((r) => r.reaction === "assertive")
    if (assertivePlayers.length === 1 && assertivePlayers[0].playerId === context.playerId) {
      return true
    }
  }

  return false
}

/**
 * Team Achievement: No Burnout Squad
 * No team member has Burnout
 */
function checkNoBurnoutSquad(context: AchievementCheckContext): boolean {
  const burnoutHistory = context.gameState.burnoutHistory || []
  return burnoutHistory.length === 0
}

/**
 * Team Achievement: Perfect Sprint
 * In one round, all players play Assertive cards
 * Note: Active player doesn't play a reaction card, so we check if all non-active players played assertive
 * This should only check the current round (the one that just ended)
 */
function checkPerfectSprint(context: AchievementCheckContext): boolean {
  const reactions = context.gameState.reactions || []

  // For round_end trigger, we check the last round that was completed
  // The last reaction in the array is the round that just ended
  const roundReaction = reactions[reactions.length - 1]

  if (!roundReaction) {
    return false
  }

  // Get all reactions for this round
  const allReactions = roundReaction.reactions

  // If no reactions, return false
  if (allReactions.length === 0) {
    return false
  }

  // Check if all players who reacted (non-active players) played assertive
  const allAssertive = allReactions.every((r) => r.reaction === "assertive")

  if (allAssertive && allReactions.length > 0) {
    return true
  }

  return false
}

/**
 * Team Achievement: 50/75/100 Club
 * Team reaches team score threshold
 */
function createClubCheck(threshold: number) {
  return (context: AchievementCheckContext): boolean => {
    if (context.finalScores && context.finalScores.length > 0) {
      // Use final team score from game state
      return context.gameState.teamScore >= threshold
    }
    // For round_end checks, use current team score
    return context.gameState.teamScore >= threshold
  }
}

/**
 * All achievement definitions
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    slug: generateSlug("Iron Mind"),
    translationKey: "achievements.ironMind",
    icon: "brain",
    xp: 50,
    category: "individual",
    difficulty: "hard",
    checkTrigger: "game_end",
    checkFunction: checkIronMind,
  },
  {
    slug: generateSlug("Brave 10"),
    translationKey: "achievements.brave10",
    icon: "zap",
    xp: 40,
    category: "individual",
    difficulty: "medium",
    checkTrigger: "game_end",
    checkFunction: checkBrave10,
  },
  {
    slug: generateSlug("Triple Balance"),
    translationKey: "achievements.tripleBalance",
    icon: "scale",
    xp: 45,
    category: "individual",
    difficulty: "hard",
    checkTrigger: "game_end",
    checkFunction: checkTripleBalance,
  },
  {
    slug: generateSlug("The Negotiator"),
    translationKey: "achievements.theNegotiator",
    icon: "handshake",
    xp: 35,
    category: "individual",
    difficulty: "medium",
    checkTrigger: "game_end",
    checkFunction: checkTheNegotiator,
  },
  {
    slug: generateSlug("Zero Passive"),
    translationKey: "achievements.zeroPassive",
    icon: "x-circle",
    xp: 30,
    category: "individual",
    difficulty: "medium",
    checkTrigger: "game_end",
    checkFunction: checkZeroPassive,
  },
  {
    slug: generateSlug("Lone Brave"),
    translationKey: "achievements.loneBrave",
    icon: "user-check",
    xp: 30,
    category: "individual",
    difficulty: "medium",
    checkTrigger: "round_end",
    checkFunction: checkLoneBrave,
  },
  {
    slug: generateSlug("No Burnout Squad"),
    translationKey: "achievements.noBurnoutSquad",
    icon: "users",
    xp: 60,
    category: "team",
    difficulty: "hard",
    checkTrigger: "game_end",
    checkFunction: checkNoBurnoutSquad,
  },
  {
    slug: generateSlug("Perfect Sprint"),
    translationKey: "achievements.perfectSprint",
    icon: "rocket",
    xp: 40,
    category: "team",
    difficulty: "medium",
    checkTrigger: "round_end",
    checkFunction: checkPerfectSprint,
  },
  {
    slug: generateSlug("50 Club"),
    translationKey: "achievements.club50",
    icon: "trophy",
    xp: 50,
    category: "team",
    difficulty: "medium",
    checkTrigger: "round_end",
    checkFunction: createClubCheck(50),
  },
  {
    slug: generateSlug("75 Club"),
    translationKey: "achievements.club75",
    icon: "trophy",
    xp: 60,
    category: "team",
    difficulty: "hard",
    checkTrigger: "round_end",
    checkFunction: createClubCheck(75),
  },
  {
    slug: generateSlug("100 Club"),
    translationKey: "achievements.club100",
    icon: "trophy",
    xp: 75,
    category: "team",
    difficulty: "very_hard",
    checkTrigger: "round_end",
    checkFunction: createClubCheck(100),
  },
]

/**
 * Get achievement by slug
 */
export function getAchievementBySlug(slug: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.slug === slug)
}

/**
 * Get achievements by trigger
 */
export function getAchievementsByTrigger(trigger: AchievementCheckTrigger): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.checkTrigger === trigger)
}

/**
 * Get achievements by category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category)
}

