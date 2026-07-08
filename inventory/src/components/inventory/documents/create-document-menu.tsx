"use client"

import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { DOCUMENT_TYPE_OPTIONS } from "@/config/document-types"
import { useCreateDocument } from "./create-document-context"

interface CreateDocumentMenuProps {
  trigger: React.ReactElement
}

export function CreateDocumentMenu({ trigger }: CreateDocumentMenuProps) {
  const { openCreate } = useCreateDocument()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          {DOCUMENT_TYPE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.docType}
              onClick={() => {
                if (option.enabled) {
                  openCreate(option.docType)
                } else {
                  toast("Скоро будет доступно")
                }
              }}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
