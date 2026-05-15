export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q?.trim()) return NextResponse.json({ results: [] });

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=6&market=BR`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = (data.tracks?.items || []).map((track: any) => ({
      nome: track.name,
      artista: track.artists.map((a: { name: string }) => a.name).join(", "),
      capa: track.album.images[2]?.url || track.album.images[0]?.url || "",
      spotifyUrl: `https://open.spotify.com/track/${track.id}`,
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
