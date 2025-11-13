/**
 * Game Service - Handles game logic, card loading, and state management
 */

import {
  SituationCard,
  GameState,
  ReactionType,
  PlayerReaction,
  RoundReactions,
} from "./types"
import { saveGameState, getGameState } from "./dataService"

// Load situation cards from JSON based on language
let situationCardsCache: { [key: string]: SituationCard[] } = {}

export async function loadSituationCards(language: string = "en"): Promise<SituationCard[]> {
  const lang = language === "fa" ? "fa" : "en"
  
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
    situationCardsCache[lang] = cards.default as SituationCard[]
    return situationCardsCache[lang]
  } catch (error) {
    console.error(`Failed to load situation cards for ${lang}:`, error)
    return []
  }
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
 */
export async function saveReactions(
  reactions: Record<string, ReactionType>
): Promise<void> {
  const gameState = await getGameState()
  if (!gameState || !gameState.currentCardId) {
    throw new Error("Game state or current card not found")
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

  // Add to existing reactions array or create new one
  const existingReactions = gameState.reactions || []
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

