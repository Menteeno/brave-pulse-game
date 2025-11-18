"use client"

import React, { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "nextjs-toploader/app"
import {
  Trophy,
  ArrowLeft,
  RefreshCcw,
  PartyPopper,
  Medal,
  Crown,
  Sparkles,
  TrendingUp,
  Award,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getAllUsers, getGameState } from "@/lib/dataService"
import type { User as UserType, GameState, PlayerScores } from "@/lib/types"
import { useAchievements } from "@/lib/hooks/useAchievements"
import { AchievementUnlockedModal } from "@/components/AchievementUnlockedModal"

interface PlayerFinalScore extends PlayerScores {
  totalScore: number
  assertivenessScore: number // selfRespect + goalAchievement
  user: UserType
}

const fallbackAvatar = "https://unavatar.io/placeholder"

function getAvatarSrc(email?: string | null) {
  if (email && typeof email === "string" && /^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    return `https://unavatar.io/${encodeURIComponent(email)}`
  }
  return fallbackAvatar
}

// Confetti component
function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute w-2 h-2 rounded-full",
            i % 5 === 0 ? "bg-yellow-400" : i % 5 === 1 ? "bg-green-400" : i % 5 === 2 ? "bg-blue-400" : i % 5 === 3 ? "bg-pink-400" : "bg-purple-400"
          )}
          style={{
            left: `${Math.random() * 100}%`,
            top: "-10px",
            animation: `confetti ${2 + Math.random() * 2}s ease-out forwards`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  )
}

// Animated counter component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const startTime = Date.now()
    const startValue = 0
    const endValue = value

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const current = Math.floor(startValue + (endValue - startValue) * progress)
      setDisplayValue(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration])

  return (
    <span className={cn("font-bold", isAnimating && "scale-110 transition-transform")}>
      {displayValue}
    </span>
  )
}

// Progress bar component for KPIs
function KPIProgressBar({
  label,
  value,
  maxValue = 15,
  color = "green",
}: {
  label: string
  value: number
  maxValue?: number
  color?: "green" | "blue" | "purple"
}) {
  const percentage = Math.min((value / maxValue) * 100, 100)
  const colorClasses = {
    green: "bg-green-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-bold text-foreground">{value}</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Medal component for rankings
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="relative">
        <Crown className="w-8 h-8 text-yellow-500 animate-pulse" />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-yellow-900">
          1
        </span>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="relative">
        <Medal className="w-8 h-8 text-gray-400" />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
          2
        </span>
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="relative">
        <Medal className="w-8 h-8 text-amber-600" />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-amber-900">
          3
        </span>
      </div>
    )
  }
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-sm text-muted-foreground">
      {rank}
    </div>
  )
}

// Enhanced Player Row component
type PlayerRowProps = {
  player: PlayerFinalScore
  index: number
  isWinner?: boolean
  delay?: number
  t: (key: string) => string
}

function PlayerRow({ player, index, isWinner = false, delay = 0, t }: PlayerRowProps) {
  const displayName = `${player.user.firstName} ${player.user.lastName}`
  const maxKPI = 15

  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-500",
        isWinner
          ? "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-400 shadow-xl ring-2 ring-yellow-400/50"
          : "bg-card border-border shadow-sm hover:shadow-md",
        "animate-in fade-in slide-in-from-bottom-4"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-4">
        <RankMedal rank={index + 1} />
        <Avatar className={cn("rounded-full", isWinner ? "w-14 h-14 ring-2 ring-yellow-400" : "w-12 h-12")}>
          <AvatarImage
            src={getAvatarSrc(player.user.email)}
            alt={displayName}
            className="rounded-full"
          />
          <AvatarFallback
            className={cn(
              "text-white font-bold",
              isWinner
                ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-lg"
                : "bg-gradient-to-br from-green-400 to-green-600"
            )}
          >
            {player.user.firstName?.charAt(0)}
            {player.user.lastName?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-bold text-base truncate flex items-center gap-2",
              isWinner ? "text-yellow-700 dark:text-yellow-400" : "text-foreground"
            )}
          >
            {displayName}
            {isWinner && <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Trophy className={cn("w-4 h-4", isWinner ? "text-yellow-500" : "text-muted-foreground")} />
            <span className={cn("text-lg font-extrabold", isWinner ? "text-yellow-700 dark:text-yellow-400" : "text-foreground")}>
              <AnimatedCounter value={player.totalScore} />
            </span>
            <span className="text-xs text-muted-foreground ms-1">{t("game.finalResults.totalScore")}</span>
          </div>
        </div>
        {isWinner && (
          <div className="flex-shrink-0">
            <div className="relative">
              <Crown className="w-8 h-8 text-yellow-500 animate-bounce" />
              <Star className="absolute -top-1 -end-1 w-3 h-3 text-yellow-400 animate-pulse" />
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border/50">
        <KPIProgressBar
          label={t("gameIntro.kpiSelfRespect")}
          value={player.selfRespect}
          maxValue={maxKPI}
          color="green"
        />
        <KPIProgressBar
          label={t("gameIntro.kpiRelationship")}
          value={player.relationshipHealth}
          maxValue={maxKPI}
          color="blue"
        />
        <KPIProgressBar
          label={t("gameIntro.kpiGoal")}
          value={player.goalAchievement}
          maxValue={maxKPI}
          color="purple"
        />
      </div>
    </div>
  )
}

// Main Page Component
export default function FinalResultsPage() {
  const { t, i18n } = useTranslation("common")
  const router = useRouter()
  const currentLanguage = i18n.language || "fa"

  const [finalScores, setFinalScores] = useState<PlayerFinalScore[]>([])
  const [finalTeamScore, setFinalTeamScore] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(false)
  const isInitializedRef = useRef(false)

  // Achievement management
  const {
    checkAndUnlockAchievements,
    nextUnlocked,
    removeFirstUnlockedAchievement,
  } = useAchievements()

  useEffect(() => {
    if (isInitializedRef.current) return

    const initializePage = async () => {
      try {
        isInitializedRef.current = true
        setIsLoading(true)
        const [users, state] = await Promise.all([
          getAllUsers(),
          getGameState(),
        ])
        if (users.length === 0) {
          router.push("/players")
          return
        }
        if (!state) {
          router.push("/game")
          return
        }
        const maxRounds = parseInt(process.env.NEXT_PUBLIC_MAX_ROUNDS || "8", 10)
        if (state.currentRound < maxRounds) {
          router.push("/game")
          return
        }
        const lastRoundScores = state.scores?.[state.scores.length - 1]
        if (!lastRoundScores) {
          router.push("/game")
          return
        }
        const playerScoresWithTotal: PlayerFinalScore[] = lastRoundScores.playerScores
          .map((playerScore) => {
            const user = users.find((u) => u.id === playerScore.playerId)
            if (!user) return null
            const totalScore =
              playerScore.selfRespect +
              playerScore.relationshipHealth +
              playerScore.goalAchievement
            const assertivenessScore = playerScore.selfRespect + playerScore.goalAchievement
            return {
              ...playerScore,
              totalScore,
              assertivenessScore,
              user,
            }
          })
          .filter((score): score is PlayerFinalScore => score !== null)

        // Sort: first by totalScore, then by assertivenessScore if totalScore is equal
        playerScoresWithTotal.sort((a, b) => {
          if (b.totalScore !== a.totalScore) {
            return b.totalScore - a.totalScore
          }
          // If totalScore is equal, sort by assertivenessScore
          return b.assertivenessScore - a.assertivenessScore
        })
        setFinalScores(playerScoresWithTotal)
        setFinalTeamScore(lastRoundScores.teamScore)

        // Check achievements for game_end trigger
        checkAndUnlockAchievements("game_end", state, {
          finalScores: lastRoundScores.playerScores,
        }).catch((error) => {
          console.error("Error checking achievements:", error)
        })

        // Show confetti after a short delay
        setTimeout(() => setShowConfetti(true), 500)
      } catch (error) {
        console.error("Failed to initialize final results page:", error)
        router.push("/game")
      } finally {
        setIsLoading(false)
      }
    }
    initializePage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLanguage])

  if (isLoading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10">
        <div className="flex flex-col items-center gap-5">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-medium text-muted-foreground">
            {t("game.loading")}
          </p>
        </div>
      </main>
    )
  }

  // Get winners: players with the highest totalScore and assertivenessScore
  const topScore = finalScores[0]?.totalScore ?? 0
  const topAssertiveness = finalScores[0]?.assertivenessScore ?? 0
  const winners = finalScores.filter(
    (score) => score.totalScore === topScore && score.assertivenessScore === topAssertiveness
  )
  const winner = winners[0] // For display purposes, use first winner
  const isMultipleWinners = winners.length > 1
  const maxKPI = 15

  return (
    <>
      {showConfetti && <Confetti />}
      <main className="flex flex-col items-center min-h-screen w-full max-w-md mx-auto px-4 py-6 bg-gradient-to-br from-green-50 via-background to-green-50 dark:from-green-950/10 dark:via-background dark:to-green-950/10">
        {/* Celebration Header */}
        <div className="w-full mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400 animate-bounce" />
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-600 bg-clip-text text-transparent">
                {t("game.finalResults.title")}
              </h1>
              <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400 animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {t("game.finalResults.subtitle")}
            </p>
          </div>
        </div>

        {/* Team Score Card with Animation */}
        <Card className="w-full mb-6 border-2 border-primary shadow-2xl animate-in fade-in zoom-in-95 duration-700 delay-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-lg font-bold flex items-center justify-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              {t("game.finalResults.teamScore")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-3">
              <Medal className="w-10 h-10 text-yellow-500 animate-pulse" />
              <div className="text-center">
                <div className="text-5xl font-black text-primary mb-1">
                  <AnimatedCounter value={finalTeamScore} duration={2500} />
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>{t("game.teamScore")}</span>
                </div>
              </div>
              <Medal className="w-10 h-10 text-yellow-500 animate-pulse" style={{ animationDelay: "0.5s" }} />
            </div>
          </CardContent>
        </Card>

        {/* Winner Celebration Section */}
        {winner && (
          <Card className="w-full mb-6 border-0 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 opacity-90 dark:opacity-80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.3),transparent)]" />
            <div className="relative z-10">
              <CardHeader className="flex flex-col items-center pb-4 pt-6">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-50 animate-pulse" />
                  <Trophy className="relative w-16 h-16 text-yellow-700 dark:text-yellow-900 drop-shadow-lg animate-bounce" />
                </div>
                <CardTitle className="text-center text-2xl font-black text-yellow-900 dark:text-yellow-950 mb-2">
                  {isMultipleWinners
                    ? t("game.finalResults.winners", { count: winners.length })
                    : t("game.finalResults.winner")}
                </CardTitle>
                <div className="text-xl font-bold text-yellow-800 dark:text-yellow-900 text-center">
                  {isMultipleWinners
                    ? winners
                      .map((w) => `${w.user.firstName} ${w.user.lastName}`)
                      .join(" & ")
                    : `${winner.user.firstName} ${winner.user.lastName}`}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pb-6">
                {isMultipleWinners ? (
                  // Multiple winners - show all avatars
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {winners.map((w, index) => (
                      <div key={w.playerId} className="relative">
                        <div className="absolute inset-0 bg-yellow-300 rounded-full blur-xl opacity-60 animate-pulse" />
                        <Avatar className="relative w-20 h-20 rounded-full border-4 border-yellow-200 dark:border-yellow-300 shadow-2xl">
                          <AvatarImage
                            src={getAvatarSrc(w.user.email)}
                            alt={`${w.user.firstName} ${w.user.lastName}`}
                            className="rounded-full"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-2xl font-black">
                            {w.user.firstName?.charAt(0)}
                            {w.user.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-1 -end-1">
                          <Crown className="w-6 h-6 text-yellow-600 animate-bounce" style={{ animationDelay: `${index * 0.1}s` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single winner
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-300 rounded-full blur-xl opacity-60 animate-pulse" />
                    <Avatar className="relative w-28 h-28 rounded-full border-4 border-yellow-200 dark:border-yellow-300 shadow-2xl">
                      <AvatarImage
                        src={getAvatarSrc(winner.user.email)}
                        alt={`${winner.user.firstName} ${winner.user.lastName}`}
                        className="rounded-full"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-4xl font-black">
                        {winner.user.firstName?.charAt(0)}
                        {winner.user.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-2 -end-2">
                      <Crown className="w-8 h-8 text-yellow-600 animate-bounce" />
                    </div>
                  </div>
                )}
                <div className="w-full space-y-3">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-900 mb-1">
                      {t("game.finalResults.totalScore")}
                    </div>
                    <div className="text-4xl font-black text-yellow-900 dark:text-yellow-950">
                      <AnimatedCounter value={winner.totalScore} />
                    </div>
                  </div>
                  {!isMultipleWinners && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/70 dark:bg-yellow-950/50 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-900 mb-1">
                          {t("gameIntro.kpiSelfRespect")}
                        </div>
                        <div className="text-2xl font-black text-yellow-900 dark:text-yellow-950">
                          {winner.selfRespect}
                        </div>
                      </div>
                      <div className="bg-white/70 dark:bg-yellow-950/50 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-900 mb-1">
                          {t("gameIntro.kpiRelationship")}
                        </div>
                        <div className="text-2xl font-black text-yellow-900 dark:text-yellow-950">
                          {winner.relationshipHealth}
                        </div>
                      </div>
                      <div className="bg-white/70 dark:bg-yellow-950/50 rounded-xl p-3 text-center backdrop-blur-sm">
                        <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-900 mb-1">
                          {t("gameIntro.kpiGoal")}
                        </div>
                        <div className="text-2xl font-black text-yellow-900 dark:text-yellow-950">
                          {winner.goalAchievement}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </div>
          </Card>
        )}

        {/* Players Ranking */}
        <Card className="w-full mb-6 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <CardHeader>
            <CardTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              {t("game.finalResults.playersRanking")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {finalScores.map((playerScore, index) => (
                <PlayerRow
                  key={playerScore.playerId}
                  player={playerScore}
                  index={index}
                  isWinner={index === 0}
                  delay={600 + index * 100}
                  t={t}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

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
    </>
  )
}
