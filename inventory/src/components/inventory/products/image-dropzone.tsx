"use client"

import { useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { cn } from "@/lib/utils"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

interface ImageDropzoneProps {
  preview: string | null
  onFileSelected: (file: File | null) => void
}

export function ImageDropzone({ preview, onFileSelected }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) return
    onFileSelected(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
      className={cn(
        "group relative flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input bg-[#f4f7f8] p-[18px] transition-colors hover:border-ring",
        isDragOver && "border-primary bg-accent"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {preview ? (
        <div className="relative size-10 flex-shrink-0 overflow-hidden rounded-[10px] border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="size-full object-cover" />
          <button
            type="button"
            aria-label="Удалить фото"
            onClick={(e) => {
              e.stopPropagation()
              onFileSelected(null)
            }}
            className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="size-2.5" />
          </button>
        </div>
      ) : (
        <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
          <ImagePlus className="size-5" />
        </div>
      )}

      <div>
        <p className="text-[13px] font-semibold">
          Перетащите изображение или <span className="text-primary">выберите файл</span>
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">JPG, PNG, WEBP или GIF до 5 МБ</p>
      </div>
    </div>
  )
}
