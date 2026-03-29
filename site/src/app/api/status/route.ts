const MONITOR_URL =
  process.env.MONITOR_API_URL || "http://localhost:3002";

export async function GET() {
  try {
    const res = await fetch(`${MONITOR_URL}/api/status`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) throw new Error(`Monitor returned ${res.status}`);

    const data = await res.json();
    return Response.json(data);
  } catch {
    // Monitor unreachable — return null so the client falls back to demo data
    return Response.json(null, { status: 503 });
  }
}
