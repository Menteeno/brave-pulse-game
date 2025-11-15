/**
 * Game Service - Handles game logic, card loading, and state management
 */

import {
  SituationCard,
  GameState,
  ReactionType,
  PlayerReaction,
  RoundReactions,
  ReactionFeedback,
} from "./types"
import { saveGameState, getGameState } from "./dataService"

// Load situation cards from JSON based on language
// Using a persistent cache that survives module reloads
const CACHE_KEY_PREFIX = "bravery_game_cards_cache_"

// In-memory cache for instant access
let situationCardsCache: { [key: string]: SituationCard[] } = {}

// Load cache from localStorage on module init (if available)
if (typeof window !== "undefined") {
  try {
    const cachedEn = localStorage.getItem(`${CACHE_KEY_PREFIX}en`)
    const cachedFa = localStorage.getItem(`${CACHE_KEY_PREFIX}fa`)
    if (cachedEn) {
      situationCardsCache.en = JSON.parse(cachedEn)
    }
    if (cachedFa) {
      situationCardsCache.fa = JSON.parse(cachedFa)
    }
  } catch (error) {
    // Ignore cache load errors
  }
}

export async function loadSituationCards(language: string = "en"): Promise<SituationCard[]> {
  const lang = language === "fa" ? "fa" : "en"

  // Check in-memory cache first (instant)
  if (situationCardsCache[lang]) {
    return situationCardsCache[lang]
  }

  try {
    // In Next.js, we need to use dynamic import with explicit path
    let cards
    if (lang === "fa") {
      cards = await import("@/data/situation-cards/fa.json")
    } else {
      cards = await import("@/data/situation-cards/en.json")
    }

    const cardsArray = cards.default as SituationCard[]

    // Update both in-memory and localStorage cache
    situationCardsCache[lang] = cardsArray

    // Persist to localStorage for next page load (non-blocking)
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${CACHE_KEY_PREFIX}${lang}`, JSON.stringify(cardsArray))
      } catch (error) {
        // Ignore localStorage errors (might be full)
      }
    }

    return cardsArray
  } catch (error) {
    console.error(`Failed to load situation cards for ${lang}:`, error)
    return []
  }
}

/**
 * Preload cards for a language (call this early for instant access)
 */
export async function preloadSituationCards(language: string = "en"): Promise<void> {
  await loadSituationCards(language)
}

/**
 * Initialize game state with card order
 */
export async function initializeGameState(
  playerIds: string[],
  randomOrder: boolean = false,
  language: string = "en"
): Promise<GameState> {
  const cards = await loadSituationCards(language)
  let cardOrder: string[] = cards.map((card) => card.id)

  if (randomOrder) {
    // Shuffle array using Fisher-Yates algorithm
    cardOrder = [...cardOrder]
    for (let i = cardOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
        ;[cardOrder[i], cardOrder[j]] = [cardOrder[j], cardOrder[i]]
    }
  }

  const gameState: GameState = {
    currentRound: 1,
    currentCardIndex: 0,
    cardOrder,
    currentCardId: null,
    activePlayerId: playerIds[0] || null,
    players: playerIds,
    isCardRevealed: false,
    selectedCardId: null,
    teamScore: playerIds.length * 10, // Initial team score = number of players × 10
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  }

  await saveGameState(gameState)
  return gameState
}

/**
 * Get current card from game state
 */
export async function getCurrentCard(language: string = "en"): Promise<SituationCard | null> {
  const gameState = await getGameState()
  if (!gameState || gameState.currentCardIndex >= gameState.cardOrder.length) {
    return null
  }

  const cards = await loadSituationCards(language)
  const currentCardId = gameState.cardOrder[gameState.currentCardIndex]
  return cards.find((card) => card.id === currentCardId) || null
}

/**
 * Reveal card (move from stack to front)
 */
export async function revealCard(): Promise<void> {
  const gameState = await getGameState()
  if (!gameState) return

  const updatedState: GameState = {
    ...gameState,
    isCardRevealed: true,
    currentCardId: gameState.cardOrder[gameState.currentCardIndex] || null,
    lastUpdatedAt: new Date().toISOString(),
  }

  await saveGameState(updatedState)
}

/**
 * Select a card (for viewing details)
 */
export async function selectCard(cardId: string): Promise<void> {
  const gameState = await getGameState()
  if (!gameState) return

  const updatedState: GameState = {
    ...gameState,
    selectedCardId: cardId,
    lastUpdatedAt: new Date().toISOString(),
  }

  await saveGameState(updatedState)
}

/**
 * Save reactions for current round
 * Only saves if reactions for this round don't already exist
 */
export async function saveReactions(
  reactions: Record<string, ReactionType>
): Promise<void> {
  const gameState = await getGameState()
  if (!gameState || !gameState.currentCardId) {
    throw new Error("Game state or current card not found")
  }

  // Check if reactions for this round already exist
  const existingReactions = gameState.reactions || []
  const existingRoundReaction = existingReactions.find(
    (r) => r.round === gameState.currentRound
  )

  if (existingRoundReaction) {
    // Reactions already exist for this round, don't save again
    return
  }

  // Convert reactions object to PlayerReaction array
  const playerReactions: PlayerReaction[] = Object.entries(reactions).map(
    ([playerId, reaction]) => ({
      playerId,
      reaction,
    })
  )

  const roundReaction: RoundReactions = {
    round: gameState.currentRound,
    cardId: gameState.currentCardId,
    reactions: playerReactions,
  }

  const updatedReactions = [...existingReactions, roundReaction]

  const updatedState: GameState = {
    ...gameState,
    reactions: updatedReactions,
    lastUpdatedAt: new Date().toISOString(),
  }

  await saveGameState(updatedState)
}

/**
 * Move to next round
 */
export async function nextRound(): Promise<GameState | null> {
  const gameState = await getGameState()
  if (!gameState) return null

  const nextCardIndex = gameState.currentCardIndex + 1
  const nextPlayerIndex =
    (gameState.players.indexOf(gameState.activePlayerId || "") + 1) %
    gameState.players.length

  const updatedState: GameState = {
    ...gameState,
    currentRound: gameState.currentRound + 1,
    currentCardIndex: nextCardIndex,
    currentCardId: null,
    activePlayerId: gameState.players[nextPlayerIndex] || null,
    isCardRevealed: false,
    selectedCardId: null,
    lastUpdatedAt: new Date().toISOString(),
  }

  await saveGameState(updatedState)
  return updatedState
}

/**
 * Save feedback for a player's reaction
 * Merges with existing feedback if it exists
 */
export async function saveReactionFeedback(
  playerId: string,
  feedback: ReactionFeedback
): Promise<void> {
  const gameState = await getGameState()
  if (!gameState || !gameState.reactions || gameState.reactions.length === 0) {
    throw new Error("Game state or reactions not found")
  }

  const lastRoundReactions = gameState.reactions[gameState.reactions.length - 1]
  const existingFeedback = lastRoundReactions.feedback || []

  // Check if feedback for this player already exists
  const existingPlayerFeedbackIndex = existingFeedback.findIndex(
    (f) => f.playerId === playerId
  )

  let updatedFeedback: ReactionFeedback[]

  if (existingPlayerFeedbackIndex >= 0) {
    // Feedback already exists - merge with existing feedback
    const existingPlayerFeedback = existingFeedback[existingPlayerFeedbackIndex]
    const mergedFeedback: ReactionFeedback = {
      ...existingPlayerFeedback,
      ...feedback,
      playerId, // Ensure playerId is preserved
    }

    // Replace existing feedback with merged feedback
    updatedFeedback = [...existingFeedback]
    updatedFeedback[existingPlayerFeedbackIndex] = mergedFeedback

    console.log(`[saveReactionFeedback] Merging feedback for player ${playerId}:`, {
      existing: existingPlayerFeedback,
      new: feedback,
      merged: mergedFeedback
    })
  } else {
    // Add new feedback
    updatedFeedback = [...existingFeedback, feedback]

    console.log(`[saveReactionFeedback] Adding new feedback for player ${playerId}:`, feedback)
  }

  const updatedReactions = [...gameState.reactions]
  updatedReactions[updatedReactions.length - 1] = {
    ...lastRoundReactions,
    feedback: updatedFeedback,
  }

  const updatedState: GameState = {
    ...gameState,
    reactions: updatedReactions,
    lastUpdatedAt: new Date().toISOString(),
  }

  await saveGameState(updatedState)

  console.log(`[saveReactionFeedback] Saved feedback for player ${playerId}. Total feedbacks:`, updatedFeedback.length)
}

