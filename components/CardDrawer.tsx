"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import type { SituationCard } from "@/lib/types"

interface CardDrawerProps {
  card: SituationCard | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue?: () => void
}

export function CardDrawer({ card, open, onOpenChange, onContinue }: CardDrawerProps) {
  const { t } = useTranslation("common")

  if (!card) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-center text-xl font-bold">
            {card.title}
          </DrawerTitle>
          <DrawerDescription className="text-center text-sm text-muted-foreground mt-2">
            {t("game.readCardAloud")}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <p className="text-sm leading-relaxed text-foreground text-center">
            {card.scenario}
          </p>
        </div>
        <DrawerFooter>
          <Button
            onClick={() => {
              onOpenChange(false)
              onContinue?.()
            }}
            className="bg-green-500 hover:bg-green-600 w-full"
          >
            {t("game.understand")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

