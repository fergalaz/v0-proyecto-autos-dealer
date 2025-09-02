import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const runId = searchParams.get("runId")
    const apiToken = searchParams.get("apiToken")

    if (!runId) {
      return NextResponse.json({ error: "Run ID is required" }, { status: 400 })
    }

    if (!apiToken) {
      return NextResponse.json({ error: "API token is required" }, { status: 400 })
    }

    const res = await fetch("https://api.comfydeploy.com/api/run/" + runId, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    })

    const json = await res.json()

    const { live_status, status, outputs, progress, queue_position } = json

    // Now you can use the run_id in your response
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
