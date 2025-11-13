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
import type { User, ReactionType } from "@/lib/types"

interface ReactionDrawerProps {
  players: User[]
  activePlayerId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (reactions: Record<string, ReactionType>) => void
}

export function ReactionDrawer({
  players,
  activePlayerId,
  open,
  onOpenChange,
  onSave,
}: ReactionDrawerProps) {
  const { t } = useTranslation("common")
  const [reactions, setReactions] = useState<Record<string, ReactionType>>({})

  // Filter out active player - they don't play in this round
  const otherPlayers = players.filter((p) => p.id !== activePlayerId)

  // Reset reactions when drawer opens
  useEffect(() => {
    if (open) {
      setReactions({})
    }
  }, [open])

  const handleReactionSelect = (playerId: string, reaction: ReactionType) => {
    setReactions((prev) => ({
      ...prev,
      [playerId]: reaction,
    }))
  }

  const handleSave = () => {
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
                  {reactionOptions.map((option) => (
                    <button
                      key={option.type}
                      onClick={() => handleReactionSelect(player.id, option.type)}
                      className={cn(
                        "flex-1 px-4 py-3 rounded-lg border-2 transition-all",
                        "text-sm font-medium",
                        selectedReaction === option.type
                          ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                      )}
                    >
                      {t(`game.reaction.${option.labelKey}`)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <DrawerFooter>
          <Button
            onClick={handleSave}
            disabled={!otherPlayers.every((player) => reactions[player.id])}
            className="bg-green-500 hover:bg-green-600 w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("game.saveReactions")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

