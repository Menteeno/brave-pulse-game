"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import type { SituationCard, ReactionFeedback } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ReactionFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: SituationCard | null
  playerId: string
  playerName: string
  reactionType: "assertive"
  onSave: (feedback: ReactionFeedback) => void
}

export function ReactionFeedbackModal({
  open,
  onOpenChange,
  card,
  playerId,
  playerName,
  reactionType,
  onSave,
}: ReactionFeedbackModalProps) {
  const { t } = useTranslation("common")
  const [relationshipHealthFeedback, setRelationshipHealthFeedback] = useState<
    "good" | "normal" | "bad" | null
  >(null)
  const [goalAchievementFeedback, setGoalAchievementFeedback] = useState<
    "could" | "normal" | "couldnt" | null
  >(null)
  const [customCostKpi, setCustomCostKpi] = useState<
    "selfRespect" | "relationshipHealth" | "goalAchievement" | null
  >(null)

  if (!card) return null

  // Check if we need to ask about relationship health based on the specific reaction type
  const reactionData = card.individualGainAndCost[reactionType]
  const needsRelationshipHealthQuestion = reactionData.relationshipHealth < 0

  // Check if we need to ask about goal achievement based on the specific reaction type
  const needsGoalAchievementQuestion = reactionData.goalAchievement < 0

  // Check if we need to ask about customCost
  const needsCustomCostQuestion = reactionData.customCost !== undefined && reactionData.customCost !== 0

  const handleSave = () => {
    const feedback: ReactionFeedback = {
      playerId,
      relationshipHealthFeedback: relationshipHealthFeedback || undefined,
      goalAchievementFeedback: goalAchievementFeedback || undefined,
      customCostKpi: customCostKpi || undefined,
    }
    onSave(feedback)
    onOpenChange(false)
    // Reset state
    setRelationshipHealthFeedback(null)
    setGoalAchievementFeedback(null)
    setCustomCostKpi(null)
  }

  const canSave = () => {
    if (needsRelationshipHealthQuestion && !relationshipHealthFeedback) return false
    if (needsGoalAchievementQuestion && !goalAchievementFeedback) return false
    if (needsCustomCostQuestion && !customCostKpi) return false
    return true
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-xl font-bold text-center">
            {t("game.reactionFeedbackTitle")}
          </DrawerTitle>
          <DrawerDescription className="text-center text-sm text-muted-foreground mt-2">
            {t("game.reactionFeedbackSubtitle", { name: playerName })}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Relationship Health Question */}
          {needsRelationshipHealthQuestion && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground text-center">
                {t("game.reactionFeedbackRelationshipQuestion", { name: playerName })}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setRelationshipHealthFeedback("bad")}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                    relationshipHealthFeedback === "bad"
                      ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.reactionFeedbackBad")}
                </button>
                <button
                  onClick={() => setRelationshipHealthFeedback("normal")}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                    relationshipHealthFeedback === "normal"
                      ? "border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.reactionFeedbackNormal")}
                </button>
                <button
                  onClick={() => setRelationshipHealthFeedback("good")}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                    relationshipHealthFeedback === "good"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.reactionFeedbackGood")}
                </button>
              </div>
            </div>
          )}

          {/* Goal Achievement Question */}
          {needsGoalAchievementQuestion && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground text-center">
                {t("game.reactionFeedbackGoalQuestion", { name: playerName })}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setGoalAchievementFeedback("couldnt")}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                    goalAchievementFeedback === "couldnt"
                      ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.reactionFeedbackCouldnt")}
                </button>
                <button
                  onClick={() => setGoalAchievementFeedback("normal")}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                    goalAchievementFeedback === "normal"
                      ? "border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.reactionFeedbackNormal")}
                </button>
                <button
                  onClick={() => setGoalAchievementFeedback("could")}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium",
                    goalAchievementFeedback === "could"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.reactionFeedbackCould")}
                </button>
              </div>
            </div>
          )}

          {/* Custom Cost Question */}
          {needsCustomCostQuestion && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground text-center">
                {t("game.reactionFeedbackCustomCostQuestion", { 
                  name: playerName,
                  costTitle: reactionData.customCostTitle || "",
                  costValue: Math.abs(reactionData.customCost || 0)
                })}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setCustomCostKpi("selfRespect")}
                  className={cn(
                    "px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-start",
                    customCostKpi === "selfRespect"
                      ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.kpiSelfRespect")}
                </button>
                <button
                  onClick={() => setCustomCostKpi("relationshipHealth")}
                  className={cn(
                    "px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-start",
                    customCostKpi === "relationshipHealth"
                      ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.kpiRelationship")}
                </button>
                <button
                  onClick={() => setCustomCostKpi("goalAchievement")}
                  className={cn(
                    "px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-start",
                    customCostKpi === "goalAchievement"
                      ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {t("game.kpiGoal")}
                </button>
              </div>
              {reactionData.customCostDescription && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {reactionData.customCostDescription}
                </p>
              )}
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSave}
            disabled={!canSave()}
            className="bg-green-500 hover:bg-green-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("game.reactionFeedbackSubmit")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

