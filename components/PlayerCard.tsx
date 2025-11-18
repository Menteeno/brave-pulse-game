"use client"

import React from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface PlayerCardProps {
  name: string
  firstName?: string
  lastName?: string
  email?: string
  userId?: string
  onDelete?: () => void
}

export function PlayerCard({
  name,
  firstName,
  lastName,
  email,
  userId,
  onDelete
}: PlayerCardProps) {
  const displayName = firstName && lastName ? `${firstName} ${lastName}` : name
  // Use unavatar.io with email if available, otherwise use placeholder as per rule
  const avatarUrl = email
    ? `https://unavatar.io/${email}`
    : "https://unavatar.io/placeholder"

  return (
    <div className="flex flex-col items-center flex-shrink-0 relative group">
      <Avatar className="w-16 h-16 rounded-full">
        <AvatarImage
          src={avatarUrl}
          alt={displayName}
        />
        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xl font-semibold">
          {displayName.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span className="mt-2 text-sm text-center">{displayName}</span>

      {/* Delete button - shown on hover */}
      {onDelete && (
        <div className="absolute -top-2 -end-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 rounded-full shadow-md bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground/90"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

