"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

type PollData = {
  live_status?: string
  status?: "queued" | "processing" | "completed" | "failed" | "cancelled" | "api_error"
  outputs?: Array<{ url?: string; image_url?: string; result_url?: string; [key: string]: any }>
}

export default function ThankYouPage() {
  const search = useSearchParams()
  const runId = search.get("runId")
  const userEmail = search.get("userEmail") || ""
  const nombreApellido = search.get("nombreApellido") || ""
  const destino = search.get("destino") || ""

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [emailSent, setEmailSent] = useState<boolean>(false)

  useEffect(() => {
    if (!runId) return

    const clearPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }

    const extractImageUrl = (outputs: any[]): string | null => {
      const pick = (o: any): string | null => {
        if (o?.url) return o.url
        if (o?.image_url) return o.image_url
        if (o?.result_url) return o.result_url
        const d = o?.data
        if (d?.images?.length) {
          const img = d.images[0]
          if (typeof img === "string") return img
          if (img?.url) return img.url
          if (img?.image_url) return img.image_url
        }
        if (d?.files?.length) {
          const f = d.files[0]
          if (typeof f === "string") return f
          if (f?.url) return f.url
          if (f?.file_url) return f.file_url
        }
        if (d?.image) return d.image
        if (d?.output_image) return d.output_image
        if (d?.result) return d.result
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
        const apiToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlcl8ycFBrZlZQQ3E1U3BManhPd2J4ZmhDWmNuTVkiLCJpYXQiOjE3NTYwODY2MDYsIm9yZ19pZCI6Im9yZ18yYzdCNHJ4ck5zVmpqNnFiQkNYVDRmN1poU3UifQ.yftleLo4kUf11LhTPWQdS0_EsqjlS4Xo6eU4T-4UeiQ"
        const pollUrl = new URL(`/api/poll`, window.location.origin)
        pollUrl.searchParams.set("runId", runId)
        pollUrl.searchParams.set("apiToken", apiToken)
        const res = await fetch(pollUrl.toString(), { cache: "no-store" })
        const data: PollData = await res.json()

        if (data.status === "completed" && !emailSent) {
          clearPolling()
          const found = extractImageUrl(data.outputs || [])
          if (found) {
            try {
              await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userEmail, imageUrl: found, nombreApellido, destino }),
              })
              setEmailSent(true)
            } catch {
              // fallo silencioso, no mostramos nada en la UI
            }
          }
        }
        if (data.status === "failed") {
          clearPolling()
        }
      } catch {
        // errores de polling silenciosos
      }
    }

    fetchAndPoll()
    pollIntervalRef.current = setInterval(fetchAndPoll, 2000)

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [runId, userEmail, nombreApellido, destino, emailSent])

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center space-y-6">
        <div className="flex justify-center mb-8">
          <Image src="/images/geely-logo.png" alt="Geely" width={600} height={240} className="h-40 w-auto" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold">¡Gracias por participar!</h1>
        <p className="text-base md:text-lg text-muted-foreground">
          En los próximos 10 minutos recibirás tu imagen personalizada en el email que ingresaste en el formulario.
        </p>
      </div>
    </main>
  )
}
