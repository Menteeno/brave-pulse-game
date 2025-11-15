"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "nextjs-toploader/app"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import {
    Target,
    Users,
    TrendingUp,
    AlertTriangle,
    Shield,
    Heart,
    CheckCircle,
    MessageSquare,
    Clock,
    ChevronRight,
    ChevronLeft,
    X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import hiGif from "@/app/assets/images/hi.gif"

const ONBOARDING_SEEN_KEY = "bravery_game_onboarding_seen"

export function markOnboardingAsSeen() {
    if (typeof window !== "undefined") {
        localStorage.setItem(ONBOARDING_SEEN_KEY, "true")
    }
}

export function hasSeenOnboarding(): boolean {
    if (typeof window === "undefined") return false
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === "true"
}

interface OnboardingProps {
    onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const { t, i18n } = useTranslation("common")
    const router = useRouter()
    const maxRounds = parseInt(process.env.NEXT_PUBLIC_MAX_ROUNDS || "8", 10)
    const [currentSlide, setCurrentSlide] = useState(0)
    const isRTL = i18n.language === "fa" || i18n.dir() === "rtl"
    const containerRef = useRef<HTMLDivElement>(null)
    const [containerWidth, setContainerWidth] = useState(0)

    // Swipe handling
    const touchStartRef = useRef<{ x: number; y: number } | null>(null)
    const touchEndRef = useRef<{ x: number; y: number } | null>(null)
    const minSwipeDistance = 50
    const slidesRef = useRef<number>(0) // Will store slides.length

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth)
            }
        }
        updateWidth()
        window.addEventListener("resize", updateWidth)
        return () => window.removeEventListener("resize", updateWidth)
    }, [])

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndRef.current = null
        touchStartRef.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY,
        }
    }

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndRef.current = {
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY,
        }
    }

    const onTouchEnd = () => {
        if (!touchStartRef.current || !touchEndRef.current) return

        const distanceX = touchEndRef.current.x - touchStartRef.current.x
        const distanceY = touchEndRef.current.y - touchStartRef.current.y
        const isLeftSwipe = distanceX < -minSwipeDistance
        const isRightSwipe = distanceX > minSwipeDistance
        const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

        // Ignore vertical swipes
        if (isVerticalSwipe) return

        const totalSlides = slidesRef.current

        if (isRTL) {
            // In RTL: swipe left (negative) goes to next (natural reading direction), swipe right (positive) goes to previous
            if (isLeftSwipe && currentSlide > 0) {
                setCurrentSlide(currentSlide - 1)
            } else if (isRightSwipe && currentSlide < totalSlides - 1) {
                setCurrentSlide(currentSlide + 1)
            }
        } else {
            // In LTR: swipe left (negative) goes to next, swipe right (positive) goes to previous
            if (isLeftSwipe && currentSlide < totalSlides - 1) {
                setCurrentSlide(currentSlide + 1)
            } else if (isRightSwipe && currentSlide > 0) {
                setCurrentSlide(currentSlide - 1)
            }
        }
    }

    const onMouseDown = (e: React.MouseEvent) => {
        touchEndRef.current = null
        touchStartRef.current = {
            x: e.clientX,
            y: e.clientY,
        }
    }

    const onMouseMove = (e: React.MouseEvent) => {
        if (!touchStartRef.current) return
        touchEndRef.current = {
            x: e.clientX,
            y: e.clientY,
        }
    }

    const onMouseUp = () => {
        if (!touchStartRef.current || !touchEndRef.current) {
            touchStartRef.current = null
            touchEndRef.current = null
            return
        }

        const distanceX = touchEndRef.current.x - touchStartRef.current.x
        const distanceY = touchEndRef.current.y - touchStartRef.current.y
        const isLeftSwipe = distanceX < -minSwipeDistance
        const isRightSwipe = distanceX > minSwipeDistance
        const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

        // Ignore vertical swipes
        if (isVerticalSwipe) {
            touchStartRef.current = null
            touchEndRef.current = null
            return
        }

        const totalSlides = slidesRef.current

        if (isRTL) {
            // In RTL: swipe left (negative) goes to next (natural reading direction), swipe right (positive) goes to previous
            if (isLeftSwipe && currentSlide > 0) {
                setCurrentSlide(currentSlide - 1)
            } else if (isRightSwipe && currentSlide < totalSlides - 1) {
                setCurrentSlide(currentSlide + 1)
            }
        } else {
            // In LTR: swipe left (negative) goes to next, swipe right (positive) goes to previous
            if (isLeftSwipe && currentSlide < totalSlides - 1) {
                setCurrentSlide(currentSlide + 1)
            } else if (isRightSwipe && currentSlide > 0) {
                setCurrentSlide(currentSlide - 1)
            }
        }

        touchStartRef.current = null
        touchEndRef.current = null
    }

    const handleSkip = () => {
        markOnboardingAsSeen()
        onComplete()
        router.push("/players")
    }

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1)
        } else {
            handleComplete()
        }
    }

    const handlePrevious = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1)
        }
    }

    const handleComplete = () => {
        markOnboardingAsSeen()
        onComplete()
        router.push("/players")
    }

    const slides = useMemo(() => [
        {
            id: "welcome",
            content: (
                <div className="flex flex-col items-center justify-center h-full space-y-6 px-4">
                    <div className="relative w-48 h-48">
                        <Image
                            src={hiGif}
                            alt="Hi"
                            fill
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                    <h1 className="text-4xl font-bold text-center">{t("gameIntro.hi")}</h1>
                    <p className="text-lg text-muted-foreground text-center">{t("gameIntro.welcomeToTheGame")}</p>
                </div>
            ),
        },
        {
            id: "objectives",
            content: (
                <div className="p-6 space-y-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Target className="w-6 h-6 text-green-500" />
                        {t("gameIntro.objective")}
                    </h2>
                    <div className="space-y-4 text-base">
                        <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-muted-foreground leading-relaxed">{t("gameIntro.objectiveTeam")}</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <TrendingUp className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                            <p className="text-muted-foreground leading-relaxed">{t("gameIntro.objectiveIndividual")}</p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: "kpis",
            content: (
                <div className="p-6 space-y-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-green-500" />
                        {t("gameIntro.kpis")}
                    </h2>
                    <div className="space-y-3 text-base">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="font-medium">{t("gameIntro.kpiSelfRespect")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-pink-500" />
                            <span className="font-medium">{t("gameIntro.kpiRelationship")}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span className="font-medium">{t("gameIntro.kpiGoal")}</span>
                        </div>
                        <p className="text-base text-muted-foreground mt-4 leading-relaxed">
                            {t("gameIntro.kpiStart")}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: "reactionCards",
            content: (
                <div className="p-6 space-y-5">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        {t("gameIntro.reactionCards")}
                    </h2>

                    <div className="space-y-4">
                        {/* Passive Card */}
                        <div className="border-s-4 border-gray-400 ps-4 space-y-2">
                            <h3 className="font-semibold text-base text-gray-700">{t("gameIntro.cardPassive")}</h3>
                            <div className="text-base space-y-1">
                                <p className="text-green-600">✓ {t("gameIntro.cardPassiveBenefit")}</p>
                                <p className="text-red-600">✗ {t("gameIntro.cardPassiveCost")}</p>
                            </div>
                        </div>

                        {/* Aggressive Card */}
                        <div className="border-s-4 border-orange-400 ps-4 space-y-2">
                            <h3 className="font-semibold text-base text-orange-700">{t("gameIntro.cardAggressive")}</h3>
                            <div className="text-base space-y-1">
                                <p className="text-green-600">✓ {t("gameIntro.cardAggressiveBenefit")}</p>
                                <p className="text-red-600">✗ {t("gameIntro.cardAggressiveCost")}</p>
                            </div>
                        </div>

                        {/* Assertive Card */}
                        <div className="border-s-4 border-green-500 ps-4 space-y-2">
                            <h3 className="font-semibold text-base text-green-700">{t("gameIntro.cardAssertive")}</h3>
                            <div className="text-base space-y-1">
                                <p className="text-green-600">✓ {t("gameIntro.cardAssertiveBenefit")}</p>
                                <p className="text-red-600">✗ {t("gameIntro.cardAssertiveCost")}</p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                {t("gameIntro.cardAssertiveNote")}
                            </p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: "teamScore",
            content: (
                <div className="p-6 space-y-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Users className="w-6 h-6 text-green-500" />
                        {t("gameIntro.teamScore")}
                    </h2>
                    <div className="space-y-3 text-base text-muted-foreground">
                        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                            <Users className="w-5 h-5 text-blue-500" />
                            <AlertDescription className="text-base text-muted-foreground">
                                {t("gameIntro.teamScoreInitial")}
                            </AlertDescription>
                        </Alert>
                        <p className="leading-relaxed">{t("gameIntro.teamScoreDescription")}</p>
                        <ul className="list-disc list-inside space-y-2 ps-2 leading-relaxed">
                            <li>{t("gameIntro.teamScoreAllAssertive")}</li>
                            <li>{t("gameIntro.teamScoreOnlyOneAssertive")}</li>
                            <li>{t("gameIntro.teamScorePerPersonAssertive")}</li>
                        </ul>
                    </div>
                </div>
            ),
        },
        {
            id: "feedback",
            content: (
                <div className="p-6 space-y-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-green-500" />
                        {t("gameIntro.feedbackMechanism")}
                    </h2>
                    <div className="space-y-4 text-base text-muted-foreground">
                        <p className="leading-relaxed">{t("gameIntro.feedbackDescription")}</p>
                        <div className="space-y-2 ps-2">
                            <p className="font-medium">{t("gameIntro.feedbackRelationship")}</p>
                            <p className="font-medium">{t("gameIntro.feedbackGoal")}</p>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: "burnout",
            content: (
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                    <AlertTitle className="text-xl font-semibold text-red-700 dark:text-red-400">
                        {t("gameIntro.burnout")}
                    </AlertTitle>
                    <AlertDescription className="text-base text-muted-foreground leading-relaxed">
                        {t("gameIntro.burnoutDescription")}
                    </AlertDescription>
                </Alert>
            ),
        },
        {
            id: "gameFlow",
            content: (
                <Card className="p-6 space-y-4">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <Clock className="w-6 h-6 text-green-500" />
                        {t("gameIntro.gameFlow")} - {maxRounds} {t("gameIntro.rounds")}
                    </h2>
                    <div className="space-y-4 text-base">
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                1
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-foreground mb-1">{t("gameIntro.roundSituation")}</p>
                                <p className="text-muted-foreground text-base leading-relaxed">{t("gameIntro.roundSituationDetail")}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                2
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-foreground mb-1">{t("gameIntro.roundDecision")}</p>
                                <p className="text-muted-foreground text-base leading-relaxed mb-2">{t("gameIntro.roundDecisionDetail")}</p>
                                <ul className="list-disc list-inside text-base text-muted-foreground space-y-1.5 ps-2 leading-relaxed">
                                    <li>{t("gameIntro.roundDecisionThinking")}</li>
                                    <li>{t("gameIntro.roundDecisionReaction")}</li>
                                    <li>{t("gameIntro.roundDecisionFeedback")}</li>
                                    <li>{t("gameIntro.roundDecisionCustomCost")}</li>
                                </ul>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                3
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-foreground mb-1">{t("gameIntro.roundResolution")}</p>
                                <p className="text-muted-foreground text-base leading-relaxed">{t("gameIntro.roundResolutionDetail")}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            ),
        },
        {
            id: "strategy",
            content: (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
                    <Heart className="w-6 h-6 text-green-500" />
                    <AlertTitle className="text-xl font-semibold text-green-700 dark:text-green-400">
                        {t("gameIntro.strategy")}
                    </AlertTitle>
                    <AlertDescription className="text-base text-muted-foreground leading-relaxed">
                        {t("gameIntro.strategyDescription")}
                    </AlertDescription>
                </Alert>
            ),
        },
    ], [t, maxRounds])

    // Store slides length in ref for use in swipe handlers
    useEffect(() => {
        slidesRef.current = slides.length
    }, [slides.length])

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Skip Button */}
            <div className="flex justify-end p-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <X className="w-4 h-4 me-2" />
                    {t("gameIntro.skip")}
                </Button>
            </div>

            {/* Slide Content */}
            <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-hidden">
                <div ref={containerRef} className="w-full max-w-md">
                    <div
                        className="relative overflow-hidden"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        style={{ touchAction: "pan-y pinch-zoom", userSelect: "none" }}
                    >
                        <div
                            className="flex items-center transition-transform duration-500 ease-in-out"
                            style={{
                                transform: containerWidth > 0
                                    ? isRTL ? `translateX(${currentSlide * containerWidth}px)` : `translateX(-${currentSlide * containerWidth}px)`
                                    : isRTL ? `translateX(${currentSlide * 100}%)` : `translateX(-${currentSlide * 100}%)`,
                                width: containerWidth > 0
                                    ? `${slides.length * containerWidth}px`
                                    : `${slides.length * 100}%`,
                            }}
                        >
                            {slides.map((slide, index) => (
                                <div
                                    key={slide.id}
                                    className="flex-shrink-0"
                                    style={{
                                        width: containerWidth > 0 ? `${containerWidth}px` : "100%",
                                        minWidth: containerWidth > 0 ? `${containerWidth}px` : "100%",
                                    }}
                                >
                                    <div className="px-2">
                                        {slide.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 px-4 pb-4">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            index === currentSlide
                                ? "bg-green-500 w-8"
                                : "bg-gray-300 dark:bg-gray-700"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            {/* Navigation Buttons */}
            <div className={cn("flex items-center justify-between gap-4 px-4 pb-8")}>
                <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentSlide === 0}
                    className="flex-1"
                >
                    <ChevronLeft className={cn("w-4 h-4 me-2", isRTL ? "rotate-180" : "")} />
                    {t("gameIntro.previous")}
                </Button>

                <Button
                    onClick={handleNext}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                >
                    {currentSlide === slides.length - 1 ? t("gameIntro.letsGo") : t("gameIntro.next")}
                    <ChevronRight className={cn("w-4 h-4 ms-2", isRTL ? "rotate-180" : "")} />
                </Button>
            </div>
        </div>
    )
}

