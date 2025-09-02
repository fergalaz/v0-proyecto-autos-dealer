"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

type PollData = {
  live_status?: string
  status?: string
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

  // ComfyDeploy API token (igual que usas en page.tsx)
  const apiToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8ycFBrZlZQQ3E1U3BManhPd2J4ZmhDWmNuTVkiLCJpYXQiOjE3NTYwODY2MDYsIm9yZ19pZCI6Im9yZ18yYzdCNHJ4ck5zVmpqNnFiQkNYVDRmN1poU3UifQ.yftleLo4kUf11LhTPWQdS0_EsqjlS4Xo6eU4T-4UeiQ"

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const emailStartedRef = useRef<boolean>(false) // evita requests en paralelo
  const emailSentRef = useRef<boolean>(false) // registra éxito

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

    const SUCCESS = new Set(["completed", "success", "succeeded", "done", "finished"])
    const TERMINAL = new Set([
      "completed",
      "success",
      "succeeded",
      "done",
      "finished",
      "failed",
      "cancelled",
      "canceled",
    ])

    const sendEmailOnce = async (imageUrl: string) => {
      if (emailStartedRef.current || emailSentRef.current) return
      emailStartedRef.current = true // 🔒 bloquear duplicados inmediatamente
      clearPolling() // 🛑 parar el polling antes de enviar

      try {
        const resp = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail, imageUrl, nombreApellido, destino }),
        })
        const json = await resp.json().catch(() => ({}))
        console.log("[gracias] /api/send-email respuesta:", resp.status, json)

        if (resp.ok && json?.success) {
          emailSentRef.current = true
          console.log("[gracias] email enviado OK")
        } else {
          // si falla, liberar el “started” para permitir reintento
          emailStartedRef.current = false
          console.warn("[gracias] fallo al enviar email:", json)
        }
      } catch (e) {
        emailStartedRef.current = false
        console.error("[gracias] error enviando email:", e)
      }
    }

    const fetchAndPoll = async () => {
      try {
        const pollUrl = new URL("/api/poll", window.location.origin)
        pollUrl.searchParams.set("runId", runId)
        pollUrl.searchParams.set("apiToken", apiToken) // ⬅️ VOLVIÓ EL TOKEN

        const res = await fetch(pollUrl.toString(), { cache: "no-store" })
        const data: PollData = await res.json()

        console.log("[gracias] poll:", {
          status: data.status,
          live_status: data.live_status,
          outputs: Array.isArray(data.outputs) ? data.outputs.length : 0,
        })

        const st = (data.status || "").toLowerCase()
        if (st && TERMINAL.has(st)) {
          console.log("[gracias] estado terminal:", st)
          if (!SUCCESS.has(st)) clearPolling()
        }

        if (st && SUCCESS.has(st) && !emailSentRef.current) {
          const foundUrl = extractImageUrl(data.outputs)
          console.log("[gracias] éxito detectado. URL encontrada:", foundUrl)
          if (foundUrl) await sendEmailOnce(foundUrl)
        }
      } catch (e) {
        console.warn("[gracias] error en polling:", e)
      }
    }

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