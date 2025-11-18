"use client"

import React, { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "nextjs-toploader/app"
import { HeartPlus, HeartMinus, ChartColumnIncreasing, AlertTriangle, Info, Smile, Frown } from "lucide-react"
import { cn } from "@/lib/utils"
import { PlayersHeader } from "@/components/PlayersHeader"
import { PlayerProfileModal } from "@/components/PlayerProfileModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { getAllUsers, getGameState, saveCheckpoint } from "@/lib/dataService"
import { getCurrentCard, loadSituationCards } from "@/lib/gameService"
import { nextRound } from "@/lib/gameService"
import { calculateRoundScores, saveRoundScores } from "@/lib/scoringService"
import { updateUserScore } from "@/lib/apiService"
import type { User, GameState, RoundScores, SituationCard, ReactionType } from "@/lib/types"
import { Separator } from "@/components/ui/separator"
import { useAchievements } from "@/lib/hooks/useAchievements"
import { AchievementUnlockedModal } from "@/components/AchievementUnlockedModal"

export default function ResultsPage() {
  const { t, i18n } = useTranslation("common")
  const router = useRouter()
  const currentLanguage = i18n.language || "fa"

  const [players, setPlayers] = useState<User[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [roundScores, setRoundScores] = useState<RoundScores | null>(null)
  const [previousScores, setPreviousScores] = useState<Array<{ playerId: string; selfRespect: number; relationshipHealth: number; goalAchievement: number }>>([])
  const [currentCard, setCurrentCard] = useState<SituationCard | null>(null)
  const [allCards, setAllCards] = useState<SituationCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const isInitializedRef = useRef(false)

  // Achievement management
  const {
    checkAndUnlockAchievements,
    nextUnlocked,
    removeFirstUnlockedAchievement,
    hasUnlockedAchievements,
  } = useAchievements()


  useEffect(() => {
    // Prevent re-initialization if already initialized
    if (isInitializedRef.current) return

    const initializePage = async () => {
      try {
        // Mark as initializing to prevent concurrent runs
        isInitializedRef.current = true

        setIsLoading(true)

        // Optimistic: Load cached data first for instant display
        const [cachedUsers, cachedState] = await Promise.all([
          getAllUsers(),
          getGameState(),
        ])

        // Show cached data immediately
        if (cachedUsers.length > 0) {
          setPlayers(cachedUsers)
        }
        if (cachedState) {
          setGameState(cachedState)

          // Show existing scores immediately if available
          if (cachedState.scores && cachedState.scores.length > 0) {
            const lastRoundScores = cachedState.scores[cachedState.scores.length - 1]
            setRoundScores(lastRoundScores)

            if (cachedState.scores.length > 1) {
              const previousRoundScores = cachedState.scores[cachedState.scores.length - 2]
              setPreviousScores(previousRoundScores.playerScores)
            } else {
              setPreviousScores(
                cachedState.players.map((playerId) => ({
                  playerId,
                  selfRespect: 5,
                  relationshipHealth: 5,
                  goalAchievement: 5,
                }))
              )
            }
          }
        }

        // Load fresh data in parallel
        const [users, state, cards] = await Promise.all([
          getAllUsers(),
          getGameState(),
          loadSituationCards(currentLanguage)
        ])

        if (users.length === 0) {
          router.push("/players")
          return
        }
        setPlayers(users)
        setAllCards(cards)

        if (!state) {
          router.push("/game")
          return
        }

        setGameState(state)

        // Calculate scores in background (non-blocking)
        const lastRoundReactions = state.reactions?.[state.reactions.length - 1]
        if (lastRoundReactions) {
          const existingScores = state.scores || []
          const existingRoundScore = existingScores.find(
            (s) => s.round === lastRoundReactions.round
          )

          if (!existingRoundScore) {
            // Re-fetch game state to get the latest feedback before calculating scores
            getGameState()
              .then(async (latestState) => {
                if (!latestState) {
                  throw new Error("Game state not found")
                }

                // Use the latest feedback from the updated game state
                const latestFeedback = latestState.reactions?.[latestState.reactions.length - 1]?.feedback

                // Calculate scores in background (don't block UI)
                return calculateRoundScores(
                  latestState,
                  currentLanguage,
                  latestFeedback
                )
              })
              .then(async (roundScores) => {
                await saveRoundScores(roundScores)
                // Update UI with calculated scores
                const updatedState = await getGameState()
                if (updatedState) {
                  setGameState(updatedState)

                  if (updatedState.scores && updatedState.scores.length > 0) {
                    const lastRoundScores = updatedState.scores[updatedState.scores.length - 1]
                    setRoundScores(lastRoundScores)

                    if (updatedState.scores.length > 1) {
                      const previousRoundScores = updatedState.scores[updatedState.scores.length - 2]
                      setPreviousScores(previousRoundScores.playerScores)
                    }
                  }

                  // Check achievements for round_end trigger
                  // Make sure we have the latest state with reactions
                  const latestState = await getGameState()
                  if (latestState) {
                    checkAndUnlockAchievements("round_end", latestState, {
                      roundScores: roundScores.playerScores,
                    }).catch((error) => {
                      console.error("Error checking achievements:", error)
                    })
                  }

                  // Update user scores in backend API after scores are saved (non-blocking)
                  // Update all users' scores in parallel
                  const allUsers = await getAllUsers()
                  Promise.all(
                    allUsers.map((user) => updateUserScore(user, updatedState).catch((error) => {
                      console.error(`Failed to update score for user ${user.id}:`, error)
                      return { success: false, error: error.message }
                    }))
                  ).catch((error) => {
                    console.error("Error updating user scores:", error)
                  })
                }
              })
              .catch((error) => {
                console.error("Failed to calculate scores:", error)
              })
          } else {
            // Scores already exist, use them
            const lastRoundScores = existingScores[existingScores.length - 1]
            setRoundScores(lastRoundScores)

            if (existingScores.length > 1) {
              const previousRoundScores = existingScores[existingScores.length - 2]
              setPreviousScores(previousRoundScores.playerScores)
            } else {
              setPreviousScores(
                state.players.map((playerId) => ({
                  playerId,
                  selfRespect: 5,
                  relationshipHealth: 5,
                  goalAchievement: 5,
                }))
              )
            }

            // Check achievements for round_end trigger (even if scores already exist)
            checkAndUnlockAchievements("round_end", state, {
              roundScores: lastRoundScores.playerScores,
            }).catch((error) => {
              console.error("Error checking achievements:", error)
            })

            // Update user scores in backend API (non-blocking)
            // Update all users' scores in parallel
            Promise.all(
              users.map((user) => updateUserScore(user, state).catch((error) => {
                console.error(`Failed to update score for user ${user.id}:`, error)
                return { success: false, error: error.message }
              }))
            ).catch((error) => {
              console.error("Error updating user scores:", error)
            })
          }
        }

        // Use already loaded cards instead of loading again
        if (state.currentCardId) {
          const currentCardId = state.cardOrder[state.currentCardIndex]
          const card = cards.find((c) => c.id === currentCardId) || null
          setCurrentCard(card)
        }

        // Save checkpoint (non-blocking)
        saveCheckpoint("/game/results").catch(console.error)
      } catch (error) {
        console.error("Failed to initialize results page:", error)
        router.push("/game")
      } finally {
        setIsLoading(false)
      }
    }

    initializePage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage])

  const handleNextRound = async () => {
    if (!gameState) return

    // Check if game is finished (max rounds reached)
    const maxRounds = parseInt(process.env.NEXT_PUBLIC_MAX_ROUNDS || "8", 10)
    if (gameState.currentRound >= maxRounds) {
      // Game finished - redirect to final results page
      router.push("/game/final-results")
      return
    }

    // Move to next round
    await nextRound()
    router.push("/game")
  }

  const getPlayerReaction = (playerId: string): ReactionType | null => {
    if (!gameState || !gameState.reactions || gameState.reactions.length === 0) {
      return null
    }
    const lastRoundReactions = gameState.reactions[gameState.reactions.length - 1]
    const playerReaction = lastRoundReactions.reactions.find((r) => r.playerId === playerId)
    return playerReaction?.reaction || null
  }

  const getScoreChange = (
    playerId: string,
    kpi: "selfRespect" | "relationshipHealth" | "goalAchievement"
  ): number => {
    if (!roundScores) return 0
    const currentScore = roundScores.playerScores.find((s) => s.playerId === playerId)
    const previousScore = previousScores.find((s) => s.playerId === playerId)
    if (!currentScore || !previousScore) return 0

    // Check if this player had burnout for this KPI
    const playerBurnout = roundScores.burnoutEvents?.find(
      (b) => b.playerId === playerId && b.kpi === kpi
    )

    // If burnout occurred, the score reached 0 before being reset to 3
    // So we need to calculate the change as if it went to 0, not 3
    if (playerBurnout) {
      // The actual change: from previousScore to 0
      return 0 - previousScore[kpi]
    }

    return currentScore[kpi] - previousScore[kpi]
  }

  const getKpiDescription = (
    playerId: string,
    kpi: "selfRespect" | "relationshipHealth" | "goalAchievement",
    reaction: ReactionType | null
  ): string => {
    if (!currentCard || !reaction) return ""
    const reactionData = currentCard.individualGainAndCost[reaction]

    if (kpi === "selfRespect") {
      return reactionData.selfRespectDescription || ""
    } else if (kpi === "relationshipHealth") {
      return reactionData.relationshipHealthDescription || ""
    } else if (kpi === "goalAchievement") {
      return reactionData.goalAchievementDescription || ""
    }
    return ""
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

  if (!gameState || !roundScores) {
    return null
  }

  const activePlayer = players.find((p) => p.id === gameState.activePlayerId)
  const activePlayerName = activePlayer
    ? `${activePlayer.firstName} ${activePlayer.lastName}`
    : ""

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {t("game.resultsTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("game.resultsDescription")}
          </p>
        </div>

        {/* Player Results */}
        <div className="space-y-6">
          {players
            .filter((player) => {
              // Always exclude active player - they are the game facilitator, not a player
              return player.id !== gameState.activePlayerId
            })
            .map((player) => {
              const playerScores = roundScores.playerScores.find(
                (s) => s.playerId === player.id
              )
              if (!playerScores) return null

              const reaction = getPlayerReaction(player.id)

              // Check if this player experienced burnout in this round
              const playerBurnout = roundScores.burnoutEvents?.find(
                (b) => b.playerId === player.id
              )

              // First, check for customCost to subtract it from the KPI changes
              let customCostInfo: {
                kpi: "selfRespect" | "relationshipHealth" | "goalAchievement"
                change: number
                title: string
                description: string
              } | null = null

              let customCostValue = 0
              if (currentCard && reaction) {
                const reactionData = currentCard.individualGainAndCost[reaction]
                if (reactionData.customCost && reactionData.customCost !== 0) {
                  const feedback = roundScores.feedback?.find(f => f.playerId === player.id)
                  if (feedback?.customCostKpi) {
                    customCostInfo = {
                      kpi: feedback.customCostKpi,
                      change: reactionData.customCost,
                      title: reactionData.customCostTitle || t("game.customCost"),
                      description: reactionData.customCostDescription || "",
                    }
                    customCostValue = reactionData.customCost
                  }
                }
              }

              // Get score changes (these include customCost, but NOT burnout recovery)
              let selfRespectChange = getScoreChange(player.id, "selfRespect")
              let relationshipHealthChange = getScoreChange(
                player.id,
                "relationshipHealth"
              )
              let goalAchievementChange = getScoreChange(
                player.id,
                "goalAchievement"
              )

              // Subtract customCost from the KPI it was applied to
              if (customCostInfo) {
                if (customCostInfo.kpi === "selfRespect") {
                  selfRespectChange -= customCostValue
                } else if (customCostInfo.kpi === "relationshipHealth") {
                  relationshipHealthChange -= customCostValue
                } else if (customCostInfo.kpi === "goalAchievement") {
                  goalAchievementChange -= customCostValue
                }
              }

              // If burnout occurred, the change shows drop to 0
              // The recovery to 3 is handled separately in the display
              // So we don't need to modify the changes here

              const gains: Array<{
                kpi: string
                change: number
                description: string
              }> = []
              const costs: Array<{
                kpi: string
                change: number
                description: string
              }> = []

              if (selfRespectChange > 0) {
                gains.push({
                  kpi: t("gameIntro.kpiSelfRespect"),
                  change: selfRespectChange,
                  description: getKpiDescription(player.id, "selfRespect", reaction),
                })
              } else if (selfRespectChange < 0) {
                costs.push({
                  kpi: t("gameIntro.kpiSelfRespect"),
                  change: selfRespectChange,
                  description: getKpiDescription(player.id, "selfRespect", reaction),
                })
              }

              if (relationshipHealthChange > 0) {
                gains.push({
                  kpi: t("gameIntro.kpiRelationship"),
                  change: relationshipHealthChange,
                  description: getKpiDescription(
                    player.id,
                    "relationshipHealth",
                    reaction
                  ),
                })
              } else if (relationshipHealthChange < 0) {
                costs.push({
                  kpi: t("gameIntro.kpiRelationship"),
                  change: relationshipHealthChange,
                  description: getKpiDescription(
                    player.id,
                    "relationshipHealth",
                    reaction
                  ),
                })
              }

              if (goalAchievementChange > 0) {
                gains.push({
                  kpi: t("gameIntro.kpiGoal"),
                  change: goalAchievementChange,
                  description: getKpiDescription(
                    player.id,
                    "goalAchievement",
                    reaction
                  ),
                })
              } else if (goalAchievementChange < 0) {
                costs.push({
                  kpi: t("gameIntro.kpiGoal"),
                  change: goalAchievementChange,
                  description: getKpiDescription(
                    player.id,
                    "goalAchievement",
                    reaction
                  ),
                })
              }

              // Add customCost as a separate entry in costs or gains
              if (customCostInfo) {
                const kpiName = customCostInfo.kpi === "selfRespect"
                  ? t("gameIntro.kpiSelfRespect")
                  : customCostInfo.kpi === "relationshipHealth"
                    ? t("gameIntro.kpiRelationship")
                    : t("gameIntro.kpiGoal")

                if (customCostValue < 0) {
                  costs.push({
                    kpi: customCostInfo.title,
                    change: customCostValue,
                    description: `${customCostInfo.description} (${t("game.appliedTo")} ${kpiName})`,
                  })
                } else if (customCostValue > 0) {
                  gains.push({
                    kpi: customCostInfo.title,
                    change: customCostValue,
                    description: `${customCostInfo.description} (${t("game.appliedTo")} ${kpiName})`,
                  })
                }
              }

              // Add burnout recovery (shock) as a separate gain if burnout occurred
              // The change already shows the drop to 0, now we add the recovery to 3
              if (playerBurnout) {
                const burnoutKpiName = playerBurnout.kpi === "selfRespect"
                  ? t("gameIntro.kpiSelfRespect")
                  : playerBurnout.kpi === "relationshipHealth"
                    ? t("gameIntro.kpiRelationship")
                    : t("gameIntro.kpiGoal")

                gains.push({
                  kpi: t("game.burnoutRecovery"),
                  change: 3,
                  description: t("game.burnoutRecoveryDescription", { kpiName: burnoutKpiName }),
                })
              }

              return (
                <React.Fragment key={player.id}>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 mb-2">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h2 className="text-lg font-semibold">
                          {player.firstName} {player.lastName}
                        </h2>

                        {/* Player Reaction Overview */}
                        <p className="inline-flex items-center gap-1">
                          {t("game.reactionLabel")}:
                          <span className="font-medium">
                            {t(`game.reaction.${reaction}`)}
                          </span>
                        </p>
                      </div>


                      {/* KPI Score Boxes */}
                      <div className="flex gap-2 justify-stretch items-center w-full">
                        {(() => {
                          // If this KPI had burnout, show 3 instead of actual score
                          const selfRespectValue = playerBurnout?.kpi === "selfRespect" ? 3 : playerScores.selfRespect
                          const relationshipHealthValue = playerBurnout?.kpi === "relationshipHealth" ? 3 : playerScores.relationshipHealth
                          const goalAchievementValue = playerBurnout?.kpi === "goalAchievement" ? 3 : playerScores.goalAchievement

                          return (
                            <>
                              <div
                                className={cn(
                                  "rounded-lg border-2 flex flex-col rtl:persian-number items-center justify-center px-2 py-4 flex-1",
                                  selfRespectValue < 3
                                    ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                                    : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                                )}
                              >
                                <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                                  {t("gameIntro.kpiSelfRespect")}
                                </span>
                                <span className={cn(
                                  "text-2xl font-bold",
                                  selfRespectValue < 3 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                                )}>
                                  {selfRespectValue}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "rounded-lg border-2 flex flex-col rtl:persian-number items-center justify-center px-2 py-4 flex-1",
                                  relationshipHealthValue < 3
                                    ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                                    : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                                )}
                              >
                                <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                                  {t("gameIntro.kpiRelationship")}
                                </span>
                                <span className={cn(
                                  "text-2xl font-bold",
                                  relationshipHealthValue < 3 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                                )}>
                                  {relationshipHealthValue}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "rounded-lg border-2 flex flex-col rtl:persian-number items-center justify-center px-2 py-4 flex-1",
                                  goalAchievementValue < 3
                                    ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                                    : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                                )}
                              >
                                <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                                  {t("gameIntro.kpiGoal")}
                                </span>
                                <span className={cn(
                                  "text-2xl font-bold",
                                  goalAchievementValue < 3 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                                )}>
                                  {goalAchievementValue}
                                </span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Gains */}
                    {gains.length > 0 && (
                      <Card className="bg-green-50 relative dark:bg-green-950 border-green-200 dark:border-green-800">
                        <CardHeader className="p-5 py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {t("game.individualProfit")}
                            </CardTitle>
                            <HeartPlus className="size-8 opacity-50 text-green-600 dark:text-green-400" />
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {gains.map((gain, index) => {
                            return (
                              <div key={index} className="border-t border-green-200 dark:border-green-800 py-2 px-5 space-y-1">
                                <p className="font-medium w-full flex justify-between">
                                  <span>{gain.kpi}:</span>
                                  <span className="text-green-800 dark:text-green-200 rtl:persian-number font-black tracking-wider" dir="ltr">{gain.change}</span>
                                </p>
                                {gain.description && (
                                  <p className="font-medium w-full flex justify-between">

                                    <span className="font-light">{gain.description}</span>
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {/* Costs */}
                    {costs.length > 0 && (
                      <Card className="bg-red-50 relative dark:bg-red-950 border-red-200 dark:border-red-800">
                        <CardHeader className="p-5 py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {t("game.individualCost")}
                            </CardTitle>
                            <HeartMinus className="size-8 opacity-50 text-red-600 dark:text-red-400" />
                          </div>
                        </CardHeader>
                        <CardContent className="p-0">
                          {costs.map((cost, index) => {
                            return (
                              <div key={index} className="border-t border-red-200 dark:border-red-800 py-2 px-5 space-y-1">
                                <p className="font-medium w-full flex justify-between">
                                  <span>{cost.kpi}:</span>
                                  <span className="text-red-800 dark:text-red-200 rtl:persian-number font-black tracking-wider" dir="ltr">{cost.change}</span>
                                </p>
                                {cost.description && (
                                  <p className="font-medium w-full flex justify-between">

                                    <span className="font-light">{cost.description}</span>
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {/* Feedback Impact Alert */}
                    {(() => {
                      // Check if player played assertively and has feedback
                      if (reaction !== "assertive" || !roundScores.feedback) {
                        return null
                      }

                      const playerFeedback = roundScores.feedback.find(
                        (f) => f.playerId === player.id
                      )

                      if (!playerFeedback) {
                        return null
                      }

                      // Determine which KPIs were affected by feedback
                      // NOTE: customCostKpi is NOT part of feedback - it's separate (customCost)
                      // Feedback only includes relationshipHealthFeedback and goalAchievementFeedback
                      const affectedKPIs: Array<{
                        kpi: "relationshipHealth" | "goalAchievement"
                        kpiName: string
                      }> = []

                      // Check relationshipHealthFeedback (if not "normal")
                      if (
                        playerFeedback.relationshipHealthFeedback &&
                        playerFeedback.relationshipHealthFeedback !== "normal"
                      ) {
                        affectedKPIs.push({
                          kpi: "relationshipHealth",
                          kpiName: t("gameIntro.kpiRelationship"),
                        })
                      }

                      // Check goalAchievementFeedback (if not "normal")
                      if (
                        playerFeedback.goalAchievementFeedback &&
                        playerFeedback.goalAchievementFeedback !== "normal"
                      ) {
                        affectedKPIs.push({
                          kpi: "goalAchievement",
                          kpiName: t("gameIntro.kpiGoal"),
                        })
                      }

                      if (affectedKPIs.length === 0) {
                        return null
                      }

                      // Join all KPI names with "و" (and) separator
                      const kpiNames = affectedKPIs.map((kpi) => kpi.kpiName)
                      const kpiNamesText = kpiNames.join(` ${t("game.and")} `)

                      // Display single alert for all affected KPIs
                      return (
                        <Alert
                          key={`feedback-${player.id}`}
                          className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 mt-4"
                        >
                          <Info className="w-5 h-5 text-blue-500" />
                          <AlertDescription className="text-sm text-muted-foreground">
                            {t("game.feedbackImpactAlert", {
                              activePlayer: activePlayerName,
                              playerName: `${player.firstName} ${player.lastName}`,
                              kpi: kpiNamesText,
                            })}
                          </AlertDescription>
                        </Alert>
                      )
                    })()}

                    {/* Burnout Alert */}
                    {playerBurnout && (() => {
                      const kpiName = playerBurnout.kpi === "selfRespect"
                        ? t("gameIntro.kpiSelfRespect")
                        : playerBurnout.kpi === "relationshipHealth"
                          ? t("gameIntro.kpiRelationship")
                          : t("gameIntro.kpiGoal")
                      const totalBurnoutCount = roundScores.burnoutEvents?.length || 0
                      const totalPenalty = -10 * totalBurnoutCount

                      return (
                        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <AlertTitle className="text-lg font-semibold text-red-700 dark:text-red-400">
                            {t("game.burnoutAlert")}
                          </AlertTitle>
                          <AlertDescription className="text-sm text-muted-foreground rtl:persian-number">
                            {t("game.burnoutAlertDescription", {
                              playerName: `${player.firstName} ${player.lastName}`,
                              penalty: Math.abs(totalPenalty),
                              kpiName: kpiName,
                            })}
                          </AlertDescription>
                        </Alert>
                      )
                    })()}
                  </div>
                  <Separator />
                </React.Fragment>
              )
            })}
        </div>

        {/* Team Scores */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="p-5 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {t("game.teamScore")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span dir="ltr" className="text-blue-600 dark:text-blue-400 rtl:persian-number font-black text-xl">
                  {roundScores.teamScore}
                </span>
                <ChartColumnIncreasing className="size-8 opacity-50 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(() => {
              const lastRoundReactions =
                gameState.reactions?.[gameState.reactions.length - 1]
              if (!lastRoundReactions || !currentCard) return null

              const assertiveCount = lastRoundReactions.reactions.filter(
                (r) => r.reaction === "assertive"
              ).length
              const totalPlayers = lastRoundReactions.reactions.length

              // Calculate team gains from reactions
              let teamGain = 0
              let teamGainDescription = ""

              if (assertiveCount === totalPlayers && currentCard.teamResults.allAssertive !== undefined) {
                teamGain = currentCard.teamResults.allAssertive
                teamGainDescription = currentCard.teamResults.allAssertiveDescription || ""
              } else if (assertiveCount === 1 && currentCard.teamResults.onlyOneAssertive !== undefined) {
                teamGain = currentCard.teamResults.onlyOneAssertive
                teamGainDescription = currentCard.teamResults.onlyOneAssertiveDescription || ""
              } else if (currentCard.teamResults.perPersonAssertive !== undefined) {
                teamGain = assertiveCount * currentCard.teamResults.perPersonAssertive
                teamGainDescription = currentCard.teamResults.perPersonAssertiveDescription || ""
              }

              // Calculate team costs from burnout
              const burnoutEvents = roundScores.burnoutEvents || []
              const burnoutPenalty = burnoutEvents.length * -10

              const gains: Array<{
                kpi: string
                change: number
                description: string
              }> = []
              const costs: Array<{
                kpi: string
                change: number
                description: string
              }> = []

              if (teamGain > 0) {
                gains.push({
                  kpi: t("game.teamScoreGain"),
                  change: teamGain,
                  description: teamGainDescription,
                })
              }

              if (burnoutPenalty < 0) {
                const penaltyDescription = burnoutEvents.length === 1
                  ? t("game.burnoutTeamPenaltyDescription", {
                    playerName: (() => {
                      const burnoutPlayer = players.find(p => p.id === burnoutEvents[0].playerId)
                      return burnoutPlayer ? `${burnoutPlayer.firstName} ${burnoutPlayer.lastName}` : ""
                    })()
                  })
                  : t("game.burnoutTeamPenaltyMultiple", { count: burnoutEvents.length })

                costs.push({
                  kpi: t("game.burnoutTeamPenalty"),
                  change: burnoutPenalty,
                  description: penaltyDescription,
                })
              }

              return (
                <>
                  {/* Team Gains */}
                  {gains.length > 0 && (
                    <div className="border-t border-blue-200 dark:border-blue-800 py-2 px-5 space-y-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {t("game.teamProfit")}
                        </h3>
                        <Smile className="size-6 opacity-50 text-green-600 dark:text-green-400" />
                      </div>
                      {gains.map((gain, index) => {
                        return (
                          <div key={index} className="space-y-1">
                            <p className="font-medium w-full flex justify-between">
                              <span>{gain.kpi}:</span>
                              <span className="text-green-800 dark:text-green-200 rtl:persian-number font-black tracking-wider" dir="ltr">{gain.change}</span>
                            </p>
                            {gain.description && (
                              <p className="font-medium w-full flex justify-between">
                                <span className="font-light">{gain.description}</span>
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Team Costs */}
                  {costs.length > 0 && (
                    <div className="border-t border-blue-200 dark:border-blue-800 py-2 px-5 space-y-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {t("game.teamCost")}
                        </h3>
                        <Frown className="size-6 opacity-50 text-red-600 dark:text-red-400" />
                      </div>
                      {costs.map((cost, index) => {
                        return (
                          <div key={index} className="space-y-1">
                            <p className="font-medium w-full flex justify-between">
                              <span>{cost.kpi}:</span>
                              <span className="text-red-800 dark:text-red-200 rtl:persian-number font-black tracking-wider" dir="ltr">{cost.change}</span>
                            </p>
                            {cost.description && (
                              <p className="font-medium w-full flex justify-between">
                                <span className="font-light">{cost.description}</span>
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Button */}
      <div className="mt-auto pt-6">
        <Button
          onClick={handleNextRound}
          className="bg-green-500 hover:bg-green-600 w-full"
        >
          {gameState && gameState.currentRound >= parseInt(process.env.NEXT_PUBLIC_MAX_ROUNDS || "8", 10)
            ? t("game.finalResults.viewFinalResults")
            : t("game.nextRound")}
        </Button>
      </div>

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

      {/* Achievement Unlocked Modal */}
      {nextUnlocked && (
        <AchievementUnlockedModal
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              removeFirstUnlockedAchievement()
            }
          }}
          achievement={nextUnlocked.achievement}
          player={nextUnlocked.player}
          isTeamAchievement={nextUnlocked.isTeamAchievement}
        />
      )}
    </div>
  )
}
