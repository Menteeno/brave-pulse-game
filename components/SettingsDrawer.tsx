"use client"

import React, { useState, useEffect } from "react"
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
import { Trash2 } from "lucide-react"

interface StorageItem {
  key: string
  value: string
  size: number
}

interface SettingsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDrawer({ open, onOpenChange }: SettingsDrawerProps) {
  const { t } = useTranslation("common")
  const [storageItems, setStorageItems] = useState<StorageItem[]>([])

  // Get all localStorage items related to the game
  const getGameStorageItems = (): StorageItem[] => {
    if (typeof window === "undefined") return []

    const gameKeys = [
      "bravery_game_users",
      "bravery_game_cards_cache_fa",
      "bravery_game_cards_cache_en",
      "bravery_game_checkpoint",
      "bravery_game_state",
      "bravery_game_stages",
      "bravery_game_progress",
    ]

    const items: StorageItem[] = []

    gameKeys.forEach((key) => {
      const value = localStorage.getItem(key)
      if (value !== null) {
        items.push({
          key,
          value,
          size: new Blob([value]).size,
        })
      }
    })

    // Also check for any other keys that start with "bravery_game"
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith("bravery_game") && !gameKeys.includes(key)) {
        const value = localStorage.getItem(key)
        if (value !== null) {
          items.push({
            key,
            value,
            size: new Blob([value]).size,
          })
        }
      }
    }

    return items.sort((a, b) => a.key.localeCompare(b.key))
  }

  useEffect(() => {
    if (open) {
      setStorageItems(getGameStorageItems())
    }
  }, [open])

  const handleDelete = (key: string) => {
    if (typeof window === "undefined") return

    if (confirm(t("settings.deleteConfirm", { key }))) {
      localStorage.removeItem(key)
      setStorageItems(getGameStorageItems())
    }
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("settings.title")}</DrawerTitle>
          <DrawerDescription>{t("settings.description")}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 max-h-[60vh] overflow-y-auto">
          {storageItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("settings.noData")}
            </div>
          ) : (
            <div className="space-y-2">
              {storageItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.key}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatSize(item.size)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.key)}
                    className="ms-2 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">{t("game.close")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

