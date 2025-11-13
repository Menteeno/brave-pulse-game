"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { PlayerCard } from "@/components/PlayerCard"
import { AddPlayerDrawer } from "@/components/AddPlayerDrawer"
import { EditPlayerDrawer } from "@/components/EditPlayerDrawer"
import { PlayButton } from "@/components/PlayButton"
import { getAllUsers, addUser, deleteUser } from "@/lib/dataService"
import type { User } from "@/lib/types"

export default function PlayersPage() {
  const { t } = useTranslation("common")
  const [players, setPlayers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load users from storage on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true)
        const users = await getAllUsers()
        setPlayers(users)
      } catch (error) {
        console.error("Failed to load users:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [])

  const handleAddPlayer = async (userData: Omit<User, "id" | "createdAt" | "updatedAt">) => {
    try {
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
    } catch (error) {
      console.error("Failed to add user:", error)
      // You might want to show an error toast/notification here
    }
  }

  const handleUpdatePlayer = async (updatedUser: User) => {
    try {
      // Save to storage via service
      await addUser(updatedUser)

      // Update local state
      setPlayers((prev) =>
        prev.map((player) => (player.id === updatedUser.id ? updatedUser : player))
      )
    } catch (error) {
      console.error("Failed to update user:", error)
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

      <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
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
          <AddPlayerDrawer onAdd={handleAddPlayer} />
        </div>
      </div>

      <div className="mt-auto pt-8 pb-4 flex flex-col items-center">
        <PlayButton />
      </div>
    </div>
  )
}

