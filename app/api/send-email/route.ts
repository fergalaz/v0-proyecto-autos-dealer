import { Resend } from "resend"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    const fromEmail = process.env.RESEND_FROM // remitente verificado en Resend
    const adminEmail = process.env.ADMIN_EMAIL

    if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 })
    if (!fromEmail) return NextResponse.json({ error: "RESEND_FROM not configured (must be a verified sender)" }, { status: 500 })
    if (!adminEmail) return NextResponse.json({ error: "ADMIN_EMAIL not configured" }, { status: 500 })

    const { userEmail, imageUrl, nombreApellido, destino } = await request.json()

    if (!userEmail || !imageUrl || !nombreApellido || !destino) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const resend = new Resend(apiKey)

    // Intentar descargar la imagen para adjuntarla; si falla, se enviará solo con link
    let attachment: { filename: string; content: Buffer; contentType?: string } | undefined

    try {
      const imgRes = await fetch(imageUrl, { cache: "no-store" })
      if (!imgRes.ok) throw new Error(`${imgRes.status} ${imgRes.statusText}`)
      const buf = Buffer.from(await imgRes.arrayBuffer())
      const safe = (s: string) => String(s).replace(/[^\w-]+/g, "_")
      attachment = {
        filename: `geely-destino-${safe(destino).toLowerCase()}.jpg`,
        content: buf,
        contentType: "image/jpeg",
      }
    } catch (e) {
      console.warn("[send-email] No se pudo adjuntar la imagen, se enviará solo con link:", e)
    }

    const userHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">¡Gracias por participar, ${nombreApellido}!</h2>
        <p>Tu aventura a <strong>${destino}</strong> con tu nuevo Geely está lista.</p>
        <p>${attachment ? "Adjuntamos tu imagen personalizada." : `Puedes descargar tu imagen aquí: <a href="${imageUrl}">${imageUrl}</a>`}</p>
        <p>¡Esperamos que disfrutes tu próximo destino!</p>
        <br>
        <p style="color: #666; font-size: 14px;">Equipo Geely<br/>nube.media</p>
      </div>
    `

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Nueva participación - Geely Destinos</h2>
        <p><strong>Participante:</strong> ${nombreApellido}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Destino elegido:</strong> ${destino}</p>
        <p>${attachment ? "Imagen generada adjunta." : `Link de la imagen: <a href="${imageUrl}">${imageUrl}</a>`}</p>
      </div>
    `

    const basePayload = (to: string, subject: string, html: string) => ({
      from: fromEmail,
      to: [to],
      subject,
      html,
      ...(attachment ? { attachments: [attachment] } : {}),
    })

    // Enviar en paralelo
    const [userRes, adminRes] = await Promise.all([
      resend.emails.send(basePayload(userEmail, `¡Tu aventura a ${destino} con Geely está lista!`, userHtml)),
      resend.emails.send(basePayload(adminEmail, `Nueva participación: ${nombreApellido} - ${destino}`, adminHtml)),
    ])

    if (userRes.error || adminRes.error) {
      console.error("RESEND ERRORS:", { userError: userRes.error, adminError: adminRes.error })
      return NextResponse.json(
        { error: "Failed to send one or more emails", details: { userError: userRes.error, adminError: adminRes.error } },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      userEmailId: userRes.data?.id ?? null,
      adminEmailId: adminRes.data?.id ?? null,
    })
  } catch (error) {
    console.error("Email sending error:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}