"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Target, Users, TrendingUp, AlertTriangle, Shield, Heart, CheckCircle } from "lucide-react"

export default function GameIntroPage() {
  const { t } = useTranslation("common")
  const router = useRouter()

  return (
    <div className="flex flex-col items-center px-4 py-8 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-2">
        {t("gameIntro.title")}
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {t("gameIntro.subtitle")}
      </p>

      <div className="w-full max-w-md space-y-6">
        {/* Game Objectives */}
        <Card className="p-4 space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            {t("gameIntro.objective")}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">{t("gameIntro.objectiveTeam")}</p>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">{t("gameIntro.objectiveIndividual")}</p>
            </div>
          </div>
        </Card>

        {/* KPIs */}
        <Card className="p-4 space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            {t("gameIntro.kpis")}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-medium">{t("gameIntro.kpiSelfRespect")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="font-medium">{t("gameIntro.kpiRelationship")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="font-medium">{t("gameIntro.kpiGoal")}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("gameIntro.kpiStart")}
            </p>
          </div>
        </Card>

        {/* Reaction Cards */}
        <Card className="p-4 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            {t("gameIntro.reactionCards")}
          </h2>

          {/* Passive Card */}
          <div className="border-s-4 border-gray-400 ps-3 space-y-1">
            <h3 className="font-semibold text-gray-700">{t("gameIntro.cardPassive")}</h3>
            <div className="text-xs space-y-0.5">
              <p className="text-green-600">✓ {t("gameIntro.cardPassiveBenefit")}</p>
              <p className="text-red-600">✗ {t("gameIntro.cardPassiveCost")}</p>
            </div>
          </div>

          {/* Aggressive Card */}
          <div className="border-s-4 border-orange-400 ps-3 space-y-1">
            <h3 className="font-semibold text-orange-700">{t("gameIntro.cardAggressive")}</h3>
            <div className="text-xs space-y-0.5">
              <p className="text-green-600">✓ {t("gameIntro.cardAggressiveBenefit")}</p>
              <p className="text-red-600">✗ {t("gameIntro.cardAggressiveCost")}</p>
            </div>
          </div>

          {/* Assertive Card */}
          <div className="border-s-4 border-green-500 ps-3 space-y-1">
            <h3 className="font-semibold text-green-700">{t("gameIntro.cardAssertive")}</h3>
            <div className="text-xs space-y-0.5">
              <p className="text-green-600">✓ {t("gameIntro.cardAssertiveBenefit")}</p>
              <p className="text-red-600">✗ {t("gameIntro.cardAssertiveCost")}</p>
            </div>
          </div>
        </Card>

        {/* Burnout Mechanic */}
        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <AlertTitle className="text-lg font-semibold text-red-700 dark:text-red-400">
            {t("gameIntro.burnout")}
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            {t("gameIntro.burnoutDescription")}
          </AlertDescription>
        </Alert>

        {/* Game Flow */}
        <Card className="p-4 space-y-3">
          <h2 className="text-xl font-semibold">{t("gameIntro.gameFlow")}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </div>
              <p className="text-muted-foreground">{t("gameIntro.roundSituation")}</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </div>
              <p className="text-muted-foreground">{t("gameIntro.roundDecision")}</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </div>
              <p className="text-muted-foreground">{t("gameIntro.roundResolution")}</p>
            </div>
          </div>
        </Card>

        {/* Strategy */}
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
          <Heart className="w-5 h-5 text-green-500" />
          <AlertTitle className="text-lg font-semibold text-green-700 dark:text-green-400">
            {t("gameIntro.strategy")}
          </AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            {t("gameIntro.strategyDescription")}
          </AlertDescription>
        </Alert>
      </div>

      <div className="mt-8 pt-4 w-full max-w-md">
        <Button
          onClick={() => router.push("/game")}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-lg font-semibold"
        >
          {t("gameIntro.letsGo")}
        </Button>
      </div>
    </div>
  )
}
