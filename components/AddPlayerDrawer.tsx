"use client"

import React, { useState } from "react"
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
import { Plus } from "lucide-react"
import type { User } from "@/lib/types"

interface AddPlayerDrawerProps {
  onAdd: (userData: Omit<User, "id" | "createdAt" | "updatedAt">) => Promise<{ success?: boolean; error?: string }>
}

export function AddPlayerDrawer({ onAdd }: AddPlayerDrawerProps) {
  const { t } = useTranslation("common")
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Omit<User, "id" | "createdAt" | "updatedAt">>({
    firstName: "",
    lastName: "",
    email: "",
  })
  const [error, setError] = useState<string | null>(null)

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
      const result = await onAdd(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setFormData({ firstName: "", lastName: "", email: "" })
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
          setFormData({ firstName: "", lastName: "", email: "" })
        }
      }}
    >
      <DrawerTrigger asChild>
        <button className="flex flex-col items-center flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-400">
            <Plus className="w-6 h-6 text-gray-600" />
          </div>
          <span className="mt-2 text-sm">{t("players.add")}</span>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("players.addTeammate")}</DrawerTitle>
          <DrawerDescription>
            {t("players.addTeammateSubtitle")}
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
              {t("players.addTeammateButton")}
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

