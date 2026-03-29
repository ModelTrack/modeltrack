const MONITOR_URL =
  process.env.MONITOR_API_URL || "https://getstatus-aoeg7lkx3a-uc.a.run.app";

export async function GET() {
  try {
    const res = await fetch(MONITOR_URL, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Monitor returned ${res.status}`);

    const data = await res.json();
    return Response.json(data);
  } catch {
    // Monitor unreachable — return null so the client falls back to demo data
    return Response.json(null, { status: 503 });
  }
}
