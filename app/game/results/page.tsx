"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { Heart, Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { PlayersHeader } from "@/components/PlayersHeader"
import { PlayerProfileModal } from "@/components/PlayerProfileModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllUsers, getGameState, saveCheckpoint } from "@/lib/dataService"
import { getCurrentCard, loadSituationCards } from "@/lib/gameService"
import { nextRound } from "@/lib/gameService"
import { calculateRoundScores, saveRoundScores } from "@/lib/scoringService"
import type { User, GameState, RoundScores, SituationCard, ReactionType } from "@/lib/types"

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

  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsLoading(true)

        // Load players, game state, and cards in parallel
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

        // Check if scores for current round exist, if not calculate them
        const lastRoundReactions = state.reactions?.[state.reactions.length - 1]
        let finalState = state
        if (lastRoundReactions) {
          const existingScores = state.scores || []
          const existingRoundScore = existingScores.find(
            (s) => s.round === lastRoundReactions.round
          )

          if (!existingRoundScore) {
            // Scores don't exist for this round, calculate them
            try {
              const roundScores = await calculateRoundScores(
                state,
                currentLanguage,
                lastRoundReactions.feedback
              )
              await saveRoundScores(roundScores)
              // Reload game state to get updated scores
              const updatedState = await getGameState()
              if (updatedState) {
                setGameState(updatedState)
                finalState = updatedState
              }
            } catch (error) {
              console.error("Failed to calculate scores:", error)
            }
          }
        }

        // Get last round scores
        if (finalState.scores && finalState.scores.length > 0) {
          const lastRoundScores = finalState.scores[finalState.scores.length - 1]
          setRoundScores(lastRoundScores)

          // Get previous scores (before this round)
          if (finalState.scores.length > 1) {
            const previousRoundScores = finalState.scores[finalState.scores.length - 2]
            setPreviousScores(previousRoundScores.playerScores)
          } else {
            // First round - use initial scores (5 for each)
            setPreviousScores(
              finalState.players.map((playerId) => ({
                playerId,
                selfRespect: 5,
                relationshipHealth: 5,
                goalAchievement: 5,
              }))
            )
          }
        }

        // Use already loaded cards instead of loading again
        if (finalState.currentCardId) {
          const currentCardId = finalState.cardOrder[finalState.currentCardIndex]
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
  }, [router, currentLanguage])

  const handleNextRound = async () => {
    if (!gameState) return

    // Check if game is finished (max rounds reached)
    const maxRounds = parseInt(process.env.NEXT_PUBLIC_MAX_ROUNDS || "8", 10)
    if (gameState.currentRound >= maxRounds) {
      // Game finished - could redirect to a game over page
      router.push("/game")
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
              const selfRespectChange = getScoreChange(player.id, "selfRespect")
              const relationshipHealthChange = getScoreChange(
                player.id,
                "relationshipHealth"
              )
              const goalAchievementChange = getScoreChange(
                player.id,
                "goalAchievement"
              )

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

              // Check for customCost - add it to the selected KPI instead of separate entry
              let customCostInfo: {
                kpi: "selfRespect" | "relationshipHealth" | "goalAchievement"
                change: number
                title: string
                description: string
              } | null = null

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
                  }
                }
              }

              if (gains.length === 0 && costs.length === 0) return null

              return (
                <div key={player.id} className="space-y-4">
                  <div className="flex flex-col gap-3 mb-2">
                    <h2 className="text-lg font-semibold">
                      {t("game.playerResults", {
                        name: `${player.firstName} ${player.lastName}`,
                      })}
                    </h2>

                    {/* KPI Score Boxes */}
                    <div className="flex gap-2 justify-start">
                      <div
                        className={cn(
                          "w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center px-2",
                          playerScores.selfRespect < 3
                            ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                            : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                        )}
                      >
                        <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                          {t("gameIntro.kpiSelfRespect")}
                        </span>
                        <span className={cn(
                          "text-2xl font-bold",
                          playerScores.selfRespect < 3 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                        )}>
                          {playerScores.selfRespect}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center px-2",
                          playerScores.relationshipHealth < 3
                            ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                            : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                        )}
                      >
                        <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                          {t("gameIntro.kpiRelationship")}
                        </span>
                        <span className={cn(
                          "text-2xl font-bold",
                          playerScores.relationshipHealth < 3 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                        )}>
                          {playerScores.relationshipHealth}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center px-2",
                          playerScores.goalAchievement < 3
                            ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                            : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                        )}
                      >
                        <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                          {t("gameIntro.kpiGoal")}
                        </span>
                        <span className={cn(
                          "text-2xl font-bold",
                          playerScores.goalAchievement < 3 ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                        )}>
                          {playerScores.goalAchievement}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gains */}
                  {gains.length > 0 && (
                    <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Heart className="w-5 h-5 text-green-600 dark:text-green-400" />
                          <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                          {t("game.individualProfit")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {gains.map((gain, index) => {
                          const isCustomCostKpi = customCostInfo && customCostInfo.kpi === gain.kpi && customCostInfo.change > 0
                          return (
                            <div key={index} className="text-sm">
                              <p className="font-medium">{gain.kpi}</p>
                              {gain.description && (
                                <p className="text-muted-foreground mt-1">
                                  {t("game.reason")}: {gain.description}
                                </p>
                              )}
                              {isCustomCostKpi && customCostInfo && (
                                <p className="text-muted-foreground mt-1 text-xs italic">
                                  {customCostInfo.title}: {customCostInfo.change > 0 ? '+' : ''}{customCostInfo.change} - {customCostInfo.description}
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
                    <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                          <Minus className="w-4 h-4 text-red-600 dark:text-red-400" />
                          {t("game.individualCost")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {costs.map((cost, index) => {
                          const isCustomCostKpi = customCostInfo && customCostInfo.kpi === cost.kpi && customCostInfo.change < 0
                          return (
                            <div key={index} className="text-sm">
                              <p className="font-medium">
                                {Math.abs(cost.change)}- {cost.kpi}
                              </p>
                              {cost.description && (
                                <p className="text-muted-foreground mt-1">
                                  {t("game.reason")}: {cost.description}
                                </p>
                              )}
                              {isCustomCostKpi && customCostInfo && (
                                <p className="text-muted-foreground mt-1 text-xs italic">
                                  {customCostInfo.title}: {customCostInfo.change} - {customCostInfo.description}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )
            })}
        </div>

        {/* Team Scores */}
        <div className="mt-6">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-lg">{t("game.teamScores")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(() => {
                  const previousTeamScore = gameState.scores && gameState.scores.length > 1
                    ? gameState.scores[gameState.scores.length - 2].teamScore
                    : 0
                  const teamScoreChange = roundScores.teamScore - previousTeamScore
                  const changeText = teamScoreChange >= 0
                    ? `+${teamScoreChange}`
                    : `${teamScoreChange}`

                  return (
                    <>
                      <p className="text-2xl font-bold">
                        {t("game.teamScore")}: {roundScores.teamScore}
                        {teamScoreChange !== 0 && (
                          <span className={cn(
                            "text-lg ms-2",
                            teamScoreChange >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ({changeText})
                          </span>
                        )}
                      </p>
                    </>
                  )
                })()}
                {currentCard && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    {(() => {
                      const lastRoundReactions =
                        gameState.reactions?.[gameState.reactions.length - 1]
                      if (!lastRoundReactions) return null

                      const assertiveCount = lastRoundReactions.reactions.filter(
                        (r) => r.reaction === "assertive"
                      ).length
                      const totalPlayers = lastRoundReactions.reactions.length

                      if (
                        assertiveCount === totalPlayers &&
                        currentCard.teamResults.allAssertiveDescription
                      ) {
                        return (
                          <p>
                            {t("game.teamResultAllAssertive")}:{" "}
                            {currentCard.teamResults.allAssertiveDescription}
                          </p>
                        )
                      } else if (
                        assertiveCount === 1 &&
                        currentCard.teamResults.onlyOneAssertiveDescription
                      ) {
                        return (
                          <p>
                            {t("game.teamResultOnlyOneAssertive")}:{" "}
                            {currentCard.teamResults.onlyOneAssertiveDescription}
                          </p>
                        )
                      } else if (
                        currentCard.teamResults.perPersonAssertiveDescription
                      ) {
                        return (
                          <p>
                            {t("game.teamResultPerPersonAssertive")}:{" "}
                            {currentCard.teamResults.perPersonAssertiveDescription}
                          </p>
                        )
                      }
                      return null
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="mt-auto pt-6">
        <Button
          onClick={handleNextRound}
          className="bg-green-500 hover:bg-green-600 w-full"
        >
          {t("game.nextRound")}
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
    </div>
  )
}
