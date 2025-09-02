"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Upload, Camera } from "lucide-react"

function WorkflowForm() {
  const router = useRouter()
  const apiToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8ycFBrZlZQQ3E1U3BManhPd2J4ZmhDWmNuTVkiLCJpYXQiOjE3NTYwODY2MDYsIm9yZ19pZCI6Im9yZ18yYzdCNHJ4ck5zVmpqNnFiQkNYVDRmN1poU3UifQ.yftleLo4kUf11LhTPWQdS0_EsqjlS4Xo6eU4T-4UeiQ"

  const [sujetoPreview, setSujetoPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (file.size <= 1024 * 1024) {
        resolve(file)
        return
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        const maxWidth = 1200
        const maxHeight = 1200
        let { width, height } = img

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          0.8,
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (file: File) => {
    const compressedFile = await compressImage(file)
    setSelectedFile(compressedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setSujetoPreview(result)
    }
    reader.readAsDataURL(compressedFile)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleGalleryUpload = () => {
    fileInputRef.current?.click()
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()

        const overlay = document.createElement("div")
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        `

        const video = document.createElement("video")
        video.srcObject = stream
        video.autoplay = true
        video.style.cssText = "max-width: 90%; max-height: 70%; border-radius: 8px;"

        const captureBtn = document.createElement("button")
        captureBtn.textContent = "Capturar Foto"
        captureBtn.style.cssText = `
          margin-top: 20px;
          padding: 12px 24px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
        `

        const closeBtn = document.createElement("button")
        closeBtn.textContent = "Cerrar"
        closeBtn.style.cssText = `
          margin-top: 10px;
          padding: 8px 16px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        `

        overlay.appendChild(video)
        overlay.appendChild(captureBtn)
        overlay.appendChild(closeBtn)
        document.body.appendChild(overlay)

        captureBtn.onclick = async () => {
          const canvas = document.createElement("canvas")
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(video, 0, 0)

          canvas.toBlob(
            async (blob) => {
              if (blob) {
                const file = new File([blob], "selfie.jpg", { type: "image/jpeg" })
                await handleFileSelect(file)
              }
            },
            "image/jpeg",
            0.8,
          )

          stream.getTracks().forEach((track) => track.stop())
          document.body.removeChild(overlay)
        }

        closeBtn.onclick = () => {
          stream.getTracks().forEach((track) => track.stop())
          document.body.removeChild(overlay)
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("No se pudo acceder a la cámara. Por favor, usa la opción de galería.")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append("apiToken", apiToken)

    if (selectedFile) {
      formData.append("sujeto", selectedFile)
    }

    const form = e.currentTarget
    const nombre = (form.elements.namedItem("nombre") as HTMLInputElement)?.value
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value
    const idea = (form.elements.namedItem("idea") as HTMLInputElement)?.value

    if (nombre) formData.append("nombre", nombre)
    if (email) formData.append("email", email)
    if (idea) formData.append("idea", idea)

    try {
      const response = await fetch("/images/geely-coolray.png")
      const blob = await response.blob()
      formData.append("producto", blob, "geely-coolray.png")
    } catch (error) {
      console.error("Failed to load producto image:", error)
    }

    setMutationError(null)
    setIsGenerating(true)

    try {
      setMutationError(null)
      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      })
      const responseData = await res.json()

      if (!res.ok) {
        const errorMsg = responseData.error || `API Error: ${res.status}`
        const errorDetails = responseData.details ? JSON.stringify(responseData.details) : "No details"
        throw new Error(`${errorMsg} - ${errorDetails}`)
      }

      if (responseData && typeof responseData.run_id === "string" && responseData.run_id.length > 0) {
        const params = new URLSearchParams({
          runId: responseData.run_id,
          userEmail: email || "",
          nombreApellido: nombre || "",
          destino: idea || "",
        })
        router.push(`/gracias?${params.toString()}`)
      } else {
        setMutationError(`Failed to start run: run_id missing. Response: ${JSON.stringify(responseData)}`)
      }
    } catch (error: any) {
      setMutationError(error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-semibold mb-4">Elije tu destino con tu nuevo</h1>
          <div className="flex justify-center">
            <img src="/images/geely-logo.png" alt="Geely Logo" className="h-32 w-auto object-contain" />
          </div>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="nombre">Nombre y Apellido</Label>
                <Input id="nombre" name="nombre" type="text" placeholder="Ingresa tu nombre completo" required />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Dirección email</Label>
                <Input id="email" name="email" type="email" placeholder="tu@email.com" required />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Sube tu selfie</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex items-center justify-center gap-2 text-sm bg-transparent"
                    onClick={handleGalleryUpload}
                  >
                    <Upload className="h-4 w-4" />
                    Sube selfie de tu galería
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex items-center justify-center gap-2 text-sm bg-transparent"
                    onClick={handleCameraCapture}
                  >
                    <Camera className="h-4 w-4" />
                    Tómate una selfie
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />

                <video ref={videoRef} className="hidden" />
                <canvas ref={canvasRef} className="hidden" />

                {sujetoPreview && (
                  <div className="relative mt-2">
                    <img
                      src={sujetoPreview || "/placeholder.svg"}
                      alt="Sujeto preview"
                      className="max-w-full h-32 object-cover rounded-md border"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="idea" className="flex items-center gap-1">
                  ¿Dónde te gustaría ir en tu nuevo{" "}
                  <img src="/images/geely-logo.png" alt="Geely" className="h-8 w-auto object-contain inline" />?
                </Label>
                <Input id="idea" name="idea" placeholder="Viña del Mar" defaultValue="Cajón del Maipo" />
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={isGenerating || !selectedFile}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Envía tu elección"
                  )}
                </Button>
              </div>
            </form>

            {mutationError && (
              <div className="mt-4 text-center text-sm font-medium text-red-600">Error: {mutationError}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function Page() {
  return <WorkflowForm />
}
