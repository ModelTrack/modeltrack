export const dynamic = "force-dynamic";

const HISTORY_URL = process.env.MONITOR_HISTORY_URL || "https://gethistory-aoeg7lkx3a-uc.a.run.app";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const model = searchParams.get("model");
  const hours = searchParams.get("hours") || "24";

  try {
    const res = await fetch(
      `${HISTORY_URL}?provider=${provider}&model=${model}&hours=${hours}`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, s-maxage=60" },
    });
  } catch {
    return new Response(JSON.stringify({ pings: [] }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
