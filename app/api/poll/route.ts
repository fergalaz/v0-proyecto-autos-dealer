import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const runId = searchParams.get("runId")

    if (!runId) {
      return NextResponse.json({ error: "Run ID is required" }, { status: 400 })
    }

    const apiToken = process.env.COMFY_API_TOKEN
    if (!apiToken) {
      return NextResponse.json(
        { error: "COMFY_API_TOKEN not configured in environment" },
        { status: 500 }
      )
    }

    const res = await fetch(`https://api.comfydeploy.com/api/run/${runId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("ComfyDeploy poll error:", res.status, errorText)
      return NextResponse.json(
        { error: `ComfyDeploy API error: ${res.status}`, details: errorText },
        { status: res.status }
      )
    }

    const json = await res.json()
    const { live_status, status, outputs, progress, queue_position } = json

    return NextResponse.json({
      live_status,
      status,
      outputs,
      progress,
      queue_position,
    })
  } catch (error) {
    console.error("Error in poll API:", error)
    return NextResponse.json({ error: "Failed to poll run status" }, { status: 500 })
  }
}