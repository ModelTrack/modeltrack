export const dynamic = "force-dynamic";

const MONITOR_URL =
  process.env.MONITOR_API_URL || "https://getstatus-aoeg7lkx3a-uc.a.run.app";

export async function GET() {
  try {
    const res = await fetch(MONITOR_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Monitor returned ${res.status}`);

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch {
    return new Response(JSON.stringify(null), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
