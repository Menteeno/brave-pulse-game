"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import { Clock } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import type { User, GameState, RoundScores, SituationCard, ReactionType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PlayerProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  player: User
  gameState: GameState | null
  cards: SituationCard[]
}

export function PlayerProfileModal({
  open,
  onOpenChange,
  player,
  gameState,
  cards,
}: PlayerProfileModalProps) {
  const { t } = useTranslation("common")
  const avatarUrl = `https://unavatar.io/${player.email}`
  const displayName = `${player.firstName} ${player.lastName}`

  // Get current player scores
  const currentScores = gameState?.scores && gameState.scores.length > 0
    ? gameState.scores[gameState.scores.length - 1].playerScores.find(
        (s) => s.playerId === player.id
      )
    : null

  // Get player history
  const getPlayerHistory = () => {
    if (!gameState || !gameState.reactions || !gameState.scores) return []

    const history: Array<{
      round: number
      cardTitle: string
      reaction: ReactionType
      scoreChanges: {
        selfRespect: number
        relationshipHealth: number
        goalAchievement: number
      }
    }> = []

    gameState.reactions.forEach((roundReaction, index) => {
      const playerReaction = roundReaction.reactions.find(
        (r) => r.playerId === player.id
      )
      if (!playerReaction) return

      const card = cards.find((c) => c.id === roundReaction.cardId)
      if (!card) return

      // Get score changes
      const previousScores =
        index > 0 && gameState.scores[index - 1]
          ? gameState.scores[index - 1].playerScores.find(
              (s) => s.playerId === player.id
            )
          : { selfRespect: 5, relationshipHealth: 5, goalAchievement: 5 }

      const currentScores = gameState.scores[index]
        ? gameState.scores[index].playerScores.find(
            (s) => s.playerId === player.id
          )
        : null

      if (!currentScores) return

      const scoreChanges = {
        selfRespect: currentScores.selfRespect - previousScores.selfRespect,
        relationshipHealth:
          currentScores.relationshipHealth - previousScores.relationshipHealth,
        goalAchievement:
          currentScores.goalAchievement - previousScores.goalAchievement,
      }

      history.push({
        round: roundReaction.round,
        cardTitle: card.title,
        reaction: playerReaction.reaction,
        scoreChanges,
      })
    })

    return history.reverse() // Show most recent first
  }

  const history = getPlayerHistory()

  const formatScoreChange = (change: number): string => {
    if (change === 0) return ""
    return change > 0 ? `+${change}` : `${change}`
  }

  const getReactionLabel = (reaction: ReactionType): string => {
    return t(`game.reaction.${reaction}`)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 border-2 border-gray-200 dark:border-gray-700">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-2xl font-semibold">
                {displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <DrawerTitle className="text-2xl font-bold">
                {displayName}
              </DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground mt-2">
                {t("game.playerProfileDescription", { name: player.firstName })}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* KPI Scores */}
          {currentScores && (
            <div className="flex gap-2 justify-center">
              <div
                className={cn(
                  "w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center px-2",
                  currentScores.selfRespect < 3
                    ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                    : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                )}
              >
                <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                  {t("gameIntro.kpiSelfRespect")}
                </span>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    currentScores.selfRespect < 3
                      ? "text-red-600 dark:text-red-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}
                >
                  {currentScores.selfRespect}
                </span>
              </div>
              <div
                className={cn(
                  "w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center px-2",
                  currentScores.relationshipHealth < 3
                    ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                    : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                )}
              >
                <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                  {t("gameIntro.kpiRelationship")}
                </span>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    currentScores.relationshipHealth < 3
                      ? "text-red-600 dark:text-red-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}
                >
                  {currentScores.relationshipHealth}
                </span>
              </div>
              <div
                className={cn(
                  "w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center px-2",
                  currentScores.goalAchievement < 3
                    ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700"
                    : "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                )}
              >
                <span className="text-xs font-medium text-foreground mb-1 text-center leading-tight">
                  {t("gameIntro.kpiGoal")}
                </span>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    currentScores.goalAchievement < 3
                      ? "text-red-600 dark:text-red-400"
                      : "text-blue-600 dark:text-blue-400"
                  )}
                >
                  {currentScores.goalAchievement}
                </span>
              </div>
            </div>
          )}

          {/* History Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{t("game.history")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("game.historyDescription")}
            </p>

            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("game.noHistory")}
                </p>
              ) : (
                history.map((item, index) => (
                  <Card key={index} className="bg-gray-50 dark:bg-gray-900">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm mb-1">
                            {item.cardTitle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getReactionLabel(item.reaction)}
                          </p>
                        </div>
                        <div className="flex gap-2 text-sm font-mono">
                          {item.scoreChanges.selfRespect !== 0 && (
                            <span
                              className={cn(
                                item.scoreChanges.selfRespect > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {formatScoreChange(item.scoreChanges.selfRespect)}
                            </span>
                          )}
                          {item.scoreChanges.relationshipHealth !== 0 && (
                            <span
                              className={cn(
                                item.scoreChanges.relationshipHealth > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {formatScoreChange(
                                item.scoreChanges.relationshipHealth
                              )}
                            </span>
                          )}
                          {item.scoreChanges.goalAchievement !== 0 && (
                            <span
                              className={cn(
                                item.scoreChanges.goalAchievement > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              )}
                            >
                              {formatScoreChange(
                                item.scoreChanges.goalAchievement
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-green-500 hover:bg-green-600 w-full"
          >
            {t("game.understood")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

