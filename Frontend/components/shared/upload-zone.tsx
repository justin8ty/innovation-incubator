"use client"

import { useState, useCallback } from "react"
import { Upload, FileText, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadZoneProps {
  title: string
  subtitle: string
  acceptedTypes?: string[]
  onFileUpload?: (file: File) => void
  className?: string
  isProcessing?: boolean
}

export function UploadZone({
  title,
  subtitle,
  acceptedTypes = [".pdf", ".doc", ".docx"],
  onFileUpload,
  className,
  isProcessing: externalIsProcessing,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const isProcessing = externalIsProcessing

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = useCallback((file: File) => {
    setUploadedFile(file)
    onFileUpload?.(file)
  }, [onFileUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.02]"
          : uploadedFile && !isProcessing
          ? "border-emerald-500/50 bg-emerald-500/5"
          : "border-border hover:border-primary/50 bg-card/50",
        className
      )}
    >
      {/* Scanning Animation */}
      {isProcessing && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
        </div>
      )}

      <label className="block cursor-pointer p-8">
        <input
          type="file"
          accept={acceptedTypes.join(",")}
          onChange={handleFileSelect}
          className="sr-only"
        />

        <div className="flex flex-col items-center text-center">
          {isProcessing ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                AI Processing Document
              </h3>
              <p className="text-sm text-muted-foreground">
                Extracting structured data from {uploadedFile?.name}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-primary">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Gemini AI analyzing content...
              </div>
            </>
          ) : uploadedFile ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Document Processed
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-emerald-500">
                Data extracted successfully
              </p>
            </>
          ) : (
            <>
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                isDragging ? "bg-primary/20" : "bg-secondary"
              )}>
                {isDragging ? (
                  <FileText className="w-8 h-8 text-primary" />
                ) : (
                  <Upload className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {isDragging ? "Drop to Upload" : title}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {subtitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Supported:</span>
                {acceptedTypes.map((type) => (
                  <span
                    key={type}
                    className="px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                  >
                    {type.replace(".", "").toUpperCase()}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </label>
    </div>
  )
}
