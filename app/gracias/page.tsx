"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

type PollData = {
  live_status?: string
  status?: "queued" | "processing" | "completed" | "failed" | "cancelled" | "api_error"
  outputs?: Array<{ url?: string; image_url?: string; result_url?: string; [key: string]: any }>
  progress?: number
  queue_position?: number | null
  error?: any
}

export default function ThankYouPage() {
  const search = useSearchParams()
  const runId = search.get("runId")
  const userEmail = search.get("userEmail") || ""
  const nombreApellido = search.get("nombreApellido") || ""
  const destino = search.get("destino") || ""

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const emailSentRef = useRef<boolean>(false)

  useEffect(() => {
    if (!runId) return

    const clearPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    const extractImageUrl = (outputs?: any[]): string | null => {
      if (!outputs || !Array.isArray(outputs)) return null

      const pick = (o: any): string | null => {
        if (!o || typeof o !== "object") return null
        if (typeof o.url === "string") return o.url
        if (typeof o.image_url === "string") return o.image_url
        if (typeof o.result_url === "string") return o.result_url

        const d = o.data
        if (d && typeof d === "object") {
          // Comunes en ComfyDeploy
          if (Array.isArray(d.images) && d.images.length) {
            const img = d.images[0]
            if (typeof img === "string") return img
            if (img && typeof img === "object") {
              if (typeof img.url === "string") return img.url
              if (typeof img.image_url === "string") return img.image_url
              if (typeof img.result_url === "string") return img.result_url
            }
          }
          if (Array.isArray(d.files) && d.files.length) {
            const f = d.files[0]
            if (typeof f === "string") return f
            if (f && typeof f === "object") {
              if (typeof f.url === "string") return f.url
              if (typeof f.file_url === "string") return f.file_url
              if (typeof f.download_url === "string") return f.download_url
            }
          }
          if (typeof d.image === "string") return d.image
          if (typeof d.output_image === "string") return d.output_image
          if (typeof d.result === "string") return d.result
        }
        return null
      }

      for (const o of outputs) {
        const u = pick(o)
        if (u) return u
      }
      return null
    }

    const fetchAndPoll = async () => {
      try {
        const res = await fetch(`/api/poll?runId=${encodeURIComponent(runId)}`, { cache: "no-store" })
        const data: PollData = await res.json()

        // Estados terminales típicos
        const terminal = new Set(["completed", "failed", "cancelled"])

        if (data.status && terminal.has(data.status)) {
          clearPolling()
        }

        // Disparar emails una sola vez al completar
        if (data.status === "completed" && !emailSentRef.current) {
          const foundUrl = extractImageUrl(data.outputs)
          if (foundUrl) {
            try {
              emailSentRef.current = true // candado para evitar duplicados
              await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userEmail, imageUrl: foundUrl, nombreApellido, destino }),
              })
            } catch {
              // Silencioso: si el envío falla, no rompemos la pantalla de gracias
              emailSentRef.current = false // opcional: permitir reintento si deseas
            }
          }
        }
      } catch {
        // Errores de polling silenciosos: no interrumpen la UI
      }
    }

    // Primer intento y luego intervalos
    fetchAndPoll()
    pollIntervalRef.current = setInterval(fetchAndPoll, 2000)

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [runId, userEmail, nombreApellido, destino])

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-6">
        <div className="flex justify-center mb-8">
          <Image src="/images/geely-logo.png" alt="Geely" width={600} height={240} className="h-40 w-auto" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold">¡Gracias por participar!</h1>
        <p className="text-base md:text-lg text-muted-foreground">
          Estamos generando tu imagen personalizada. La recibirás en tu correo en cuanto esté lista.
        </p>
      </div>
    </main>
  )
}