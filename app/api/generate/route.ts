import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const apiToken = formData.get("apiToken") as string

    if (!apiToken) {
      return NextResponse.json({ error: "API token is required" }, { status: 400 })
    }

    const inputs: Record<string, any> = {}

    for (const [key, value] of formData.entries()) {
      if (key === "apiToken") continue

      if (value instanceof File) {
        // Convert image file to base64 for ComfyDeploy
        const buffer = await value.arrayBuffer()
        const base64 = Buffer.from(buffer).toString("base64")
        inputs[key] = `data:${value.type};base64,${base64}`
      } else {
        inputs[key] = value
      }
    }

    const res = await fetch("https://api.comfydeploy.com/api/run/deployment/queue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        deployment_id: "001d2253-28b5-4cc5-9a63-1cc73e30618e",
        inputs: inputs,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("ComfyDeploy API error:", res.status, errorText)
      return NextResponse.json(
        {
          error: `ComfyDeploy API error: ${res.status} - ${errorText}`,
        },
        { status: res.status },
      )
    }

    // Check if response is JSON
    const contentType = res.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await res.text()
      console.error("Non-JSON response from ComfyDeploy:", responseText)
      return NextResponse.json(
        {
          error: "Invalid response format from ComfyDeploy API",
        },
        { status: 500 },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in generate API:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
