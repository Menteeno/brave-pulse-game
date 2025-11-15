"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "nextjs-toploader/app"
import { PlayerCard } from "@/components/PlayerCard"
import { AddPlayerDrawer } from "@/components/AddPlayerDrawer"
import { EditPlayerDrawer } from "@/components/EditPlayerDrawer"
import { PlayButton } from "@/components/PlayButton"
import { getAllUsers, addUser, deleteUser } from "@/lib/dataService"
import { hasSeenOnboarding } from "@/components/Onboarding"
import type { User } from "@/lib/types"

export default function PlayersPage() {
  const { t } = useTranslation("common")
  const router = useRouter()
  const [players, setPlayers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check if user has seen onboarding
  useEffect(() => {
    if (!hasSeenOnboarding()) {
      router.push("/")
      return
    }
  }, [router])

  // Load users from storage on mount (optimistic)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true)
        // Load from cache first (instant)
        const users = await getAllUsers()
        // Show immediately
        setPlayers(users)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to load users:", error)
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleAddPlayer = async (userData: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    try {
      // Check if email already exists
      const emailExists = players.some(
        (player) => player.email.toLowerCase() === userData.email.toLowerCase()
      )
      if (emailExists) {
        return { error: t("players.emailExists") }
      }

      // Generate a unique ID for the user (using email as base + timestamp for uniqueness)
      const userId = `user_${Date.now()}_${userData.email.replace(/[^a-zA-Z0-9]/g, "_")}`
      const now = new Date().toISOString()

      const newUser: User = {
        id: userId,
        ...userData,
        createdAt: now,
        updatedAt: now,
      }

      // Save to storage via service
      await addUser(newUser)

      // Update local state
      setPlayers((prev) => [...prev, newUser])
      return { success: true }
    } catch (error) {
      console.error("Failed to add user:", error)
      return { error: t("players.addError") }
    }
  }

  const handleUpdatePlayer = async (updatedUser: User) => {
    try {
      // Check if email already exists (excluding current user)
      const emailExists = players.some(
        (player) =>
          player.id !== updatedUser.id &&
          player.email.toLowerCase() === updatedUser.email.toLowerCase()
      )
      if (emailExists) {
        return { error: t("players.emailExists") }
      }

      // Save to storage via service
      await addUser(updatedUser)

      // Update local state
      setPlayers((prev) =>
        prev.map((player) => (player.id === updatedUser.id ? updatedUser : player))
      )
      return { success: true }
    } catch (error) {
      console.error("Failed to update user:", error)
      return { error: t("players.updateError") }
    }
  }

  const handleDeletePlayer = async (userId: string) => {
    if (!confirm(t("players.deleteConfirm"))) {
      return
    }

    try {
      // Delete from storage via service
      await deleteUser(userId)

      // Update local state
      setPlayers((prev) => prev.filter((player) => player.id !== userId))
    } catch (error) {
      console.error("Failed to delete user:", error)
    }
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-2">
        {t("players.title")}
      </h1>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
        {t("players.subtitle")}
      </p>

      <div className="w-full pb-4">
        <div className="flex gap-4 items-start justify-center min-w-max px-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">{t("game.loading")}</div>
          ) : (
            players.map((player) => (
              <EditPlayerDrawer
                key={player.id}
                user={player}
                onUpdate={handleUpdatePlayer}
                trigger={
                  <div className="relative">
                    <PlayerCard
                      name={`${player.firstName} ${player.lastName}`}
                      firstName={player.firstName}
                      lastName={player.lastName}
                      email={player.email}
                      userId={player.id}
                      onDelete={() => handleDeletePlayer(player.id)}
                    />
                  </div>
                }
              />
            ))
          )}
          {players.length < 4 && (
            <AddPlayerDrawer onAdd={handleAddPlayer} />
          )}
        </div>
      </div>

      <div className="mt-auto pt-8 pb-4 flex flex-col items-center">
        <PlayButton disabled={players.length < 2} />
      </div>
    </div>
  )
}

