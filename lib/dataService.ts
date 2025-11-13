/**
 * Data Service - Local Storage Abstraction Layer
 * 
 * This service provides a clean interface for data persistence using localStorage.
 * The implementation is designed to be easily replaceable with a real backend API
 * in the future without changing component code.
 */

import { User, GameStage, GameProgress, GameState } from "./types"

// Storage keys for different collections
const STORAGE_KEYS = {
  USERS: "bravery_game_users",
  GAME_STAGES: "bravery_game_stages",
  GAME_PROGRESS: "bravery_game_progress",
  GAME_STATE: "bravery_game_state",
  CHECKPOINT: "bravery_game_checkpoint",
} as const

/**
 * Error handler for localStorage operations
 */
function handleStorageError(operation: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[DataService] Error during ${operation}:`, error.message)
  } else if (typeof error === "string") {
    console.error(`[DataService] Error during ${operation}:`, error)
  } else {
    console.error(`[DataService] Unknown error during ${operation}:`, error)
  }
}

/**
 * Safe localStorage getter
 */
function getFromStorage<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") {
      // Server-side rendering guard
      return null
    }

    const item = localStorage.getItem(key)
    if (item === null) {
      return null
    }

    return JSON.parse(item) as T
  } catch (error) {
    handleStorageError(`getFromStorage(${key})`, error)
    return null
  }
}

/**
 * Safe localStorage setter
 */
function setToStorage<T>(key: string, value: T): boolean {
  try {
    if (typeof window === "undefined") {
      // Server-side rendering guard
      return false
    }

    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    handleStorageError(`setToStorage(${key})`, error)
    return false
  }
}

/**
 * Load initial game stages
 * Returns default stages if none are found in storage
 */
export async function loadInitialStages(): Promise<GameStage[]> {
  try {
    const stored = getFromStorage<GameStage[]>(STORAGE_KEYS.GAME_STAGES)
    
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored
    }

    // Return default stages if none exist
    const defaultStages: GameStage[] = [
      {
        id: "stage_1",
        name: "Stage 1",
        description: "The beginning of your journey",
        order: 1,
        isActive: true,
      },
      {
        id: "stage_2",
        name: "Stage 2",
        description: "Building courage",
        order: 2,
        isActive: true,
      },
      {
        id: "stage_3",
        name: "Stage 3",
        description: "Facing challenges",
        order: 3,
        isActive: true,
      },
    ]

    // Save default stages for future use
    setToStorage(STORAGE_KEYS.GAME_STAGES, defaultStages)
    
    return defaultStages
  } catch (error) {
    handleStorageError("loadInitialStages", error)
    return []
  }
}

/**
 * Retrieves all registered users from storage
 * Returns an empty array if none are found
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS)
    return users && Array.isArray(users) ? users : []
  } catch (error) {
    handleStorageError("getAllUsers", error)
    return []
  }
}

/**
 * Retrieves a single user by their ID
 * Returns null if user is not found
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const users = await getAllUsers()
    return users.find((user) => user.id === userId) || null
  } catch (error) {
    handleStorageError(`getUserById(${userId})`, error)
    return null
  }
}

/**
 * Adds a new user to storage or updates an existing user
 * If a user with the same ID already exists, it updates their details
 */
export async function addUser(user: User): Promise<void> {
  try {
    const users = await getAllUsers()
    const existingIndex = users.findIndex((u) => u.id === user.id)

    const now = new Date().toISOString()
    const userToSave: User = {
      ...user,
      updatedAt: now,
      createdAt: existingIndex >= 0 ? users[existingIndex].createdAt : now,
    }

    if (existingIndex >= 0) {
      // Update existing user
      users[existingIndex] = userToSave
    } else {
      // Add new user
      users.push(userToSave)
    }

    const success = setToStorage(STORAGE_KEYS.USERS, users)
    if (!success) {
      throw new Error("Failed to save user to storage")
    }
  } catch (error) {
    handleStorageError(`addUser(${user.id})`, error)
    throw error
  }
}

/**
 * Saves or updates the game progress for the specified user ID
 */
export async function saveProgress(progress: GameProgress): Promise<void> {
  try {
    const allProgress = getFromStorage<GameProgress[]>(STORAGE_KEYS.GAME_PROGRESS) || []
    const existingIndex = allProgress.findIndex((p) => p.userId === progress.userId)

    const progressToSave: GameProgress = {
      ...progress,
      lastPlayedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      // Update existing progress
      allProgress[existingIndex] = progressToSave
    } else {
      // Add new progress
      allProgress.push(progressToSave)
    }

    const success = setToStorage(STORAGE_KEYS.GAME_PROGRESS, allProgress)
    if (!success) {
      throw new Error("Failed to save progress to storage")
    }
  } catch (error) {
    handleStorageError(`saveProgress(${progress.userId})`, error)
    throw error
  }
}

/**
 * Retrieves the progress for a specific user
 * Returns null if progress is not found
 */
export async function getProgressByUserId(userId: string): Promise<GameProgress | null> {
  try {
    const allProgress = getFromStorage<GameProgress[]>(STORAGE_KEYS.GAME_PROGRESS) || []
    return allProgress.find((p) => p.userId === userId) || null
  } catch (error) {
    handleStorageError(`getProgressByUserId(${userId})`, error)
    return null
  }
}

/**
 * Deletes a user from storage by their ID
 */
export async function deleteUser(userId: string): Promise<void> {
  try {
    const users = await getAllUsers()
    const filteredUsers = users.filter((user) => user.id !== userId)

    const success = setToStorage(STORAGE_KEYS.USERS, filteredUsers)
    if (!success) {
      throw new Error("Failed to delete user from storage")
    }
  } catch (error) {
    handleStorageError(`deleteUser(${userId})`, error)
    throw error
  }
}

/**
 * Saves the current game state
 */
export async function saveGameState(gameState: GameState): Promise<void> {
  try {
    const success = setToStorage(STORAGE_KEYS.GAME_STATE, gameState)
    if (!success) {
      throw new Error("Failed to save game state to storage")
    }

    // Also save checkpoint for redirect
    const checkpoint = {
      route: "/game",
      timestamp: new Date().toISOString(),
    }
    setToStorage(STORAGE_KEYS.CHECKPOINT, checkpoint)
  } catch (error) {
    handleStorageError("saveGameState", error)
    throw error
  }
}

/**
 * Retrieves the current game state
 */
export async function getGameState(): Promise<GameState | null> {
  try {
    return getFromStorage<GameState>(STORAGE_KEYS.GAME_STATE)
  } catch (error) {
    handleStorageError("getGameState", error)
    return null
  }
}

/**
 * Gets the last checkpoint route
 */
export async function getCheckpoint(): Promise<string | null> {
  try {
    const checkpoint = getFromStorage<{ route: string; timestamp: string }>(
      STORAGE_KEYS.CHECKPOINT
    )
    return checkpoint?.route || null
  } catch (error) {
    handleStorageError("getCheckpoint", error)
    return null
  }
}

/**
 * Save checkpoint for a specific route
 */
export async function saveCheckpoint(route: string): Promise<void> {
  try {
    const checkpoint = {
      route,
      timestamp: new Date().toISOString(),
    }
    const success = setToStorage(STORAGE_KEYS.CHECKPOINT, checkpoint)
    if (!success) {
      throw new Error("Failed to save checkpoint to storage")
    }
  } catch (error) {
    handleStorageError("saveCheckpoint", error)
    throw error
  }
}

/**
 * Clears game state and checkpoint
 */
export async function clearGameState(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.GAME_STATE)
      localStorage.removeItem(STORAGE_KEYS.CHECKPOINT)
    }
  } catch (error) {
    handleStorageError("clearGameState", error)
  }
}

