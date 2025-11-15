"use client"

import React, { useState, useEffect } from "react"
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
import { cn } from "@/lib/utils"
import type { User, ReactionType, GameState, SituationCard } from "@/lib/types"
import { getCurrentCard } from "@/lib/gameService"

interface ReactionDrawerProps {
  players: User[]
  activePlayerId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (reactions: Record<string, ReactionType>) => void
  existingReactions?: Record<string, ReactionType>
  disabled?: boolean
  onContinue?: () => void
  gameState?: GameState | null
}

export function ReactionDrawer({
  players,
  activePlayerId,
  open,
  onOpenChange,
  onSave,
  existingReactions,
  disabled = false,
  onContinue,
  gameState,
}: ReactionDrawerProps) {
  const { t, i18n } = useTranslation("common")
  const [reactions, setReactions] = useState<Record<string, ReactionType>>({})
  const [currentCard, setCurrentCard] = useState<SituationCard | null>(null)
  const currentLanguage = i18n.language || "en"

  // Filter out active player - they don't play in this round
  const otherPlayers = players.filter((p) => p.id !== activePlayerId)

  // Check which players are fatigued (cannot play assertively in current round)
  const getFatiguedPlayerIds = (): Set<string> => {
    if (!gameState || !gameState.fatiguedPlayers) {
      return new Set()
    }
    const currentRound = gameState.currentRound
    return new Set(
      gameState.fatiguedPlayers
        .filter((fp) => fp.round === currentRound)
        .map((fp) => fp.playerId)
    )
  }

  const fatiguedPlayerIds = getFatiguedPlayerIds()

  // Load existing reactions and current card when drawer opens
  useEffect(() => {
    if (open) {
      if (existingReactions && Object.keys(existingReactions).length > 0) {
        setReactions(existingReactions)
      } else {
        setReactions({})
      }

      // Load current card
      const loadCard = async () => {
        try {
          const card = await getCurrentCard(currentLanguage)
          setCurrentCard(card)
        } catch (error) {
          console.error("Failed to load current card:", error)
        }
      }
      loadCard()
    }
  }, [open, existingReactions, currentLanguage])

  const handleReactionSelect = (playerId: string, reaction: ReactionType) => {
    setReactions((prev) => ({
      ...prev,
      [playerId]: reaction,
    }))
  }

  const handleSave = () => {
    if (disabled) {
      // If disabled and reactions exist, continue to next page
      if (existingReactions && Object.keys(existingReactions).length > 0 && onContinue) {
        onContinue()
        onOpenChange(false)
      }
      return
    }

    // Validate that all players have selected a reaction
    const allSelected = otherPlayers.every((player) => reactions[player.id])
    if (!allSelected) {
      return // Don't save if not all reactions are selected
    }
    onSave(reactions)
    onOpenChange(false)
  }

  const reactionOptions: { type: ReactionType; labelKey: string }[] = [
    { type: "passive", labelKey: "passive" },
    { type: "assertive", labelKey: "assertive" },
    { type: "aggressive", labelKey: "aggressive" },
  ]

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-xl font-bold text-center">
            {t("game.registerReactions")}
          </DrawerTitle>
          <DrawerDescription className="text-center text-sm text-muted-foreground mt-2">
            {t("game.whoPlayedWhichReaction")}
          </DrawerDescription>
        </DrawerHeader>

        {currentCard && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Aggressive Reaction KPI Impact */}
              <div className="flex flex-col gap-2 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
                <h3 className="font-semibold text-orange-700 dark:text-orange-300 text-sm mb-2">
                  {t("game.reaction.aggressive")}
                </h3>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("gameIntro.kpiSelfRespect")}:</span>
                    <span className={cn(
                      "font-medium",
                      currentCard.individualGainAndCost.aggressive.selfRespect >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {currentCard.individualGainAndCost.aggressive.selfRespect >= 0 ? "+" : ""}
                      {currentCard.individualGainAndCost.aggressive.selfRespect}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("gameIntro.kpiRelationship")}:</span>
                    <span className={cn(
                      "font-medium",
                      currentCard.individualGainAndCost.aggressive.relationshipHealth >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {currentCard.individualGainAndCost.aggressive.relationshipHealth >= 0 ? "+" : ""}
                      {currentCard.individualGainAndCost.aggressive.relationshipHealth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("gameIntro.kpiGoal")}:</span>
                    <span className={cn(
                      "font-medium",
                      currentCard.individualGainAndCost.aggressive.goalAchievement >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {currentCard.individualGainAndCost.aggressive.goalAchievement >= 0 ? "+" : ""}
                      {currentCard.individualGainAndCost.aggressive.goalAchievement}
                    </span>
                  </div>
                </div>
              </div>

              {/* Passive Reaction KPI Impact */}
              <div className="flex flex-col gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-2">
                  {t("game.reaction.passive")}
                </h3>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("gameIntro.kpiSelfRespect")}:</span>
                    <span className={cn(
                      "font-medium",
                      currentCard.individualGainAndCost.passive.selfRespect >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {currentCard.individualGainAndCost.passive.selfRespect >= 0 ? "+" : ""}
                      {currentCard.individualGainAndCost.passive.selfRespect}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("gameIntro.kpiRelationship")}:</span>
                    <span className={cn(
                      "font-medium",
                      currentCard.individualGainAndCost.passive.relationshipHealth >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {currentCard.individualGainAndCost.passive.relationshipHealth >= 0 ? "+" : ""}
                      {currentCard.individualGainAndCost.passive.relationshipHealth}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t("gameIntro.kpiGoal")}:</span>
                    <span className={cn(
                      "font-medium",
                      currentCard.individualGainAndCost.passive.goalAchievement >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {currentCard.individualGainAndCost.passive.goalAchievement >= 0 ? "+" : ""}
                      {currentCard.individualGainAndCost.passive.goalAchievement}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pb-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {otherPlayers.map((player) => {
            const playerName = `${player.firstName} ${player.lastName}`
            const selectedReaction = reactions[player.id]

            return (
              <div key={player.id} className="space-y-3">
                <p className="font-semibold text-foreground">
                  {t("game.whatReactionDidShow", { name: playerName })}
                </p>
                <div className="flex gap-2">
                  {reactionOptions.map((option) => {
                    const isFatigued = fatiguedPlayerIds.has(player.id)
                    const isAssertiveDisabled = option.type === "assertive" && isFatigued
                    const isButtonDisabled = disabled || isAssertiveDisabled

                    return (
                      <button
                        key={option.type}
                        onClick={() => !isButtonDisabled && handleReactionSelect(player.id, option.type)}
                        disabled={isButtonDisabled}
                        className={cn(
                          "flex-1 px-4 py-3 rounded-lg border-2 transition-all",
                          "text-sm font-medium",
                          isButtonDisabled && "opacity-50 cursor-not-allowed",
                          selectedReaction === option.type
                            ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600",
                          !isButtonDisabled && selectedReaction !== option.type && "hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                        title={isAssertiveDisabled ? t("game.fatigueCannotPlayAssertive") : undefined}
                      >
                        {t(`game.reaction.${option.labelKey}`)}
                      </button>
                    )
                  })}
                </div>
                {fatiguedPlayerIds.has(player.id) && (
                  <p className="text-xs text-red-500 mt-1">
                    {t("game.fatigueWarning")}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSave}
            disabled={!disabled && !otherPlayers.every((player) => reactions[player.id])}
            className="bg-green-500 hover:bg-green-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disabled && existingReactions && Object.keys(existingReactions).length > 0
              ? t("game.continue")
              : t("game.saveReactions")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

