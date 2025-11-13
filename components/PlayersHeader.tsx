"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"

interface PlayersHeaderProps {
  players: User[]
  activePlayerId: string | null
  onPlayerClick?: (player: User) => void
  currentRound?: number
  maxRounds?: number
}

export function PlayersHeader({
  players,
  activePlayerId,
  onPlayerClick,
  currentRound,
  maxRounds,
}: PlayersHeaderProps) {
  const { t } = useTranslation("common")
  const [isExpanded, setIsExpanded] = useState(false)

  const activePlayer = players.find((p) => p.id === activePlayerId)
  const activePlayerName = activePlayer
    ? `${activePlayer.firstName} ${activePlayer.lastName}`
    : ""

  const handleAvatarClick = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="relative w-full">
      {/* Main Header Layout - Flex with text on start and avatars on end */}
      <div
        className={cn(
          "flex items-center justify-between w-full transition-all duration-300",
          isExpanded && "opacity-0 pointer-events-none"
        )}
      >
        {/* Text on Start - Two Lines */}
        {activePlayer && (
          <div className="flex flex-col text-start">
            <p className="text-lg font-medium text-foreground leading-tight">
              {t("game.thisRoundIs")}
            </p>
            <p className="text-lg font-medium text-foreground leading-tight">
              <span className="text-blue-600 font-semibold">
                {activePlayerName}
              </span>{" "}
              {t("game.turn")}
            </p>
          </div>
        )}

        <div className="flex gap-2 text-start">
          <div className="flex items-center gap-2">
            {currentRound && maxRounds && (
              <span className="text-xl font-bold font-mono text-muted-foreground">
                {currentRound}/{maxRounds}
              </span>
            )}
          </div>
          {/* Avatar Stack - Collapsed State on End */}
          <div className="flex items-center gap-0">
            {players.map((player, index) => {
              const avatarUrl = `https://unavatar.io/${player.email}`
              const displayName = `${player.firstName} ${player.lastName}`
              const isActive = player.id === activePlayerId

              return (
                <button
                  key={player.id}
                  onClick={handleAvatarClick}
                  className={cn(
                    "relative transition-transform hover:scale-110",
                    index > 0 && "-ms-3"
                  )}
                >
                  <Avatar
                    className={cn(
                      "w-12 h-12 border-2 transition-all",
                      isActive
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-white dark:border-gray-800"
                    )}
                  >
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-sm font-semibold">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Expanded Avatars - Two Rows */}
      <div
        className={cn(
          "flex flex-col gap-3 transition-all duration-300 w-full",
          isExpanded
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-[-20px] pointer-events-none absolute top-0"
        )}
      >
        {/* First Row */}
        <div className="grid grid-cols-4 gap-3">
          {players.slice(0, 4).map((player) => {
            const avatarUrl = `https://unavatar.io/${player.email}`
            const displayName = `${player.firstName} ${player.lastName}`
            const isActive = player.id === activePlayerId

            return (
              <button
                key={player.id}
                onClick={() => {
                  onPlayerClick?.(player)
                  setIsExpanded(false)
                }}
                className="flex flex-col items-center gap-2"
              >
                <Avatar
                  className={cn(
                    "w-16 h-16 border-2 transition-all",
                    isActive
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-white dark:border-gray-800"
                  )}
                >
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-base font-semibold">
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "text-xs text-center max-w-[60px] truncate",
                    isActive && "font-semibold text-blue-600"
                  )}
                >
                  {displayName}
                </span>
              </button>
            )
          })}
        </div>
        {/* Second Row */}
        {players.length > 4 && (
          <div className="grid grid-cols-4 gap-3">
            {players.slice(4).map((player) => {
              const avatarUrl = `https://unavatar.io/${player.email}`
              const displayName = `${player.firstName} ${player.lastName}`
              const isActive = player.id === activePlayerId

              return (
                <button
                  key={player.id}
                  onClick={() => {
                    onPlayerClick?.(player)
                    setIsExpanded(false)
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <Avatar
                    className={cn(
                      "w-16 h-16 border-2 transition-all",
                      isActive
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-white dark:border-gray-800"
                    )}
                  >
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-base font-semibold">
                      {displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "text-xs text-center max-w-[60px] truncate",
                      isActive && "font-semibold text-blue-600"
                    )}
                  >
                    {displayName}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Close button when expanded */}
      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="absolute top-0 end-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("game.close")}
        </button>
      )}
    </div>
  )
}

