"use client"

import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Achievement } from "@/lib/achievementTypes"
import * as LucideIcons from "lucide-react"
import type { User } from "@/lib/types"
import { Sparkles, Trophy, Star } from "lucide-react"

interface AchievementUnlockedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  achievement: Achievement
  player?: User // For individual achievements
  isTeamAchievement?: boolean
}

/**
 * Get Lucide icon component by name
 * Handles kebab-case to PascalCase conversion (e.g., "x-circle" -> "XCircle")
 */
function getIconComponent(iconName: string) {
  // Convert kebab-case to PascalCase
  const pascalCase = iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("")
  
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<any>>)[pascalCase]
  return IconComponent || LucideIcons.Award
}

/**
 * Confetti particles for celebration
 */
function AchievementConfetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute w-2 h-2 rounded-full",
            i % 5 === 0 ? "bg-yellow-400" : i % 5 === 1 ? "bg-green-500" : i % 5 === 2 ? "bg-blue-400" : i % 5 === 3 ? "bg-pink-400" : "bg-purple-400"
          )}
          style={{
            left: `${Math.random() * 100}%`,
            top: "-10px",
            animation: `confetti ${2 + Math.random() * 2}s ease-out forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  )
}

export function AchievementUnlockedModal({
  open,
  onOpenChange,
  achievement,
  player,
  isTeamAchievement = false,
}: AchievementUnlockedModalProps) {
  const { t } = useTranslation("common")
  const IconComponent = getIconComponent(achievement.icon)
  const [showConfetti, setShowConfetti] = useState(false)

  const achievementName = t(`${achievement.translationKey}.name`)
  const achievementDescription = t(`${achievement.translationKey}.description`)

  const playerName = player ? `${player.firstName} ${player.lastName}` : ""

  useEffect(() => {
    if (open) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [open])

  return (
    <>
      {showConfetti && <AchievementConfetti />}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md mx-auto p-0 overflow-hidden border-0 shadow-2xl">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-green-400/10 to-green-600/20 dark:from-green-500/10 dark:via-green-400/5 dark:to-green-600/10" />
          
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.3),transparent_50%)] animate-pulse" />
          </div>

          <div className="relative z-10">
            <DialogHeader className="px-6 pt-8 pb-4">
              <div className="flex flex-col items-center gap-6">
                {/* Celebration Icons */}
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-bounce" style={{ animationDelay: "0s" }} />
                  <Star className="w-6 h-6 text-yellow-400 animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <Trophy className="w-7 h-7 text-yellow-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <Star className="w-6 h-6 text-yellow-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>

                {/* Title with gradient */}
                <DialogTitle className="text-3xl font-extrabold text-center bg-gradient-to-r from-green-600 via-green-500 to-green-600 dark:from-green-400 dark:via-green-300 dark:to-green-400 bg-clip-text text-transparent animate-in fade-in slide-in-from-top-4 duration-700">
                  {t("achievements.unlocked.title")}
                </DialogTitle>

                {/* Icon with enhanced animation */}
                <div className="relative mt-2">
                  {/* Outer glow rings */}
                  <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse" />
                  <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl animate-ping" style={{ animationDuration: "2s" }} />
                  
                  {/* Icon container */}
                  <div className="relative bg-gradient-to-br from-green-500/20 to-green-600/20 dark:from-green-500/10 dark:to-green-600/10 rounded-full p-8 border-4 border-green-500/30 shadow-2xl backdrop-blur-sm">
                    <IconComponent className="w-20 h-20 text-green-500 dark:text-green-400 animate-in zoom-in-95 duration-700" />
                  </div>
                  
                  {/* Sparkle effects around icon */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-60px)`,
                        animation: `sparkle 2s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>

                {/* Achievement Name with glow */}
                <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                  <h3 className="text-2xl font-bold text-foreground drop-shadow-lg">
                    {achievementName}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    {achievementDescription}
                  </p>
                </div>

                {/* Unlock Message */}
                <div className="text-center px-4 py-3 bg-green-500/10 dark:bg-green-500/5 rounded-xl border border-green-500/20 backdrop-blur-sm animate-in fade-in duration-700 delay-300">
                  <DialogDescription className="text-base font-medium text-foreground m-0">
                    {isTeamAchievement
                      ? t("achievements.unlocked.team", { achievementName })
                      : t("achievements.unlocked.individual", {
                          playerName,
                          achievementName,
                        })}
                  </DialogDescription>
                </div>

                {/* XP Badge with enhanced design */}
                <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500/20 to-green-600/20 dark:from-green-500/10 dark:to-green-600/10 rounded-full border-2 border-green-500/30 shadow-lg backdrop-blur-sm animate-in zoom-in-95 duration-700 delay-400">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-spin" style={{ animationDuration: "3s" }} />
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {t("achievements.unlocked.xpEarned", { xp: achievement.xp })}
                  </span>
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-spin" style={{ animationDuration: "3s", animationDirection: "reverse" }} />
                </div>
              </div>
            </DialogHeader>

            <div className="flex justify-center px-6 pb-6 pt-2">
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold w-full shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in duration-700 delay-500"
                size="lg"
              >
                {t("achievements.unlocked.close")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

