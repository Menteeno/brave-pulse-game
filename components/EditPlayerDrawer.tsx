"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil } from "lucide-react"
import type { User } from "@/lib/types"

interface EditPlayerDrawerProps {
  user: User
  onUpdate: (user: User) => Promise<{ success?: boolean; error?: string }>
  trigger?: React.ReactNode
}

export function EditPlayerDrawer({ user, onUpdate, trigger }: EditPlayerDrawerProps) {
  const { t } = useTranslation("common")
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Omit<User, "id" | "createdAt" | "updatedAt">>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  })
  const [error, setError] = useState<string | null>(null)

  // Update form data when user changes
  useEffect(() => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    })
    setError(null)
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.firstName && formData.lastName && formData.email) {
      setError(null)
      const updatedUser: User = {
        ...user,
        ...formData,
        updatedAt: new Date().toISOString(),
      }
      const result = await onUpdate(updatedUser)
      if (result.error) {
        setError(result.error)
      } else {
        setOpen(false)
        setError(null)
      }
    }
  }

  return (
    <Drawer 
      open={open} 
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) {
          setError(null)
        }
      }}
    >
      <div className="relative group">
        {trigger}
        <DrawerTrigger asChild>
          <button 
            className="absolute -top-2 -start-2 h-7 w-7 rounded-full bg-white shadow-md hover:bg-gray-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <Pencil className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </DrawerTrigger>
      </div>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("players.editTeammate")}</DrawerTitle>
          <DrawerDescription>
            {t("players.editTeammateSubtitle")}
          </DrawerDescription>
        </DrawerHeader>
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-4" onReset={() => setError(null)}>
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="firstName"
              placeholder={t("players.firstName")}
              value={formData.firstName}
              onChange={handleChange}
              required
            />
            <Input
              name="lastName"
              placeholder={t("players.lastName")}
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Input
              name="email"
              type="email"
              placeholder={t("players.email")}
              value={formData.email}
              onChange={handleChange}
              required
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DrawerFooter>
            <Button type="submit" className="bg-green-500 hover:bg-green-600">
              {t("players.updateTeammateButton")}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">{t("players.cancel")}</Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

