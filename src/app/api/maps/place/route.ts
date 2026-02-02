import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  mapId: z.string().uuid(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  kind: z.string().min(1).max(40),
  rotation: z.number().int().min(0).max(3).default(0),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supabase = await supabaseServer();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  // 1) Fetch map
  const { data: mapRow, error: mapErr } = await supabase
    .from("maps")
    .select("id,width,height,campaign_id")
    .eq("id", parsed.data.mapId)
    .maybeSingle();

  if (mapErr) {
    return NextResponse.json({ error: "Map query failed", details: mapErr.message }, { status: 500 });
  }
  if (!mapRow) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  // 2) Fetch campaign owner
  const { data: campaignRow, error: cErr } = await supabase
    .from("campaigns")
    .select("owner_id")
    .eq("id", mapRow.campaign_id)
    .maybeSingle();

  if (cErr) {
    return NextResponse.json({ error: "Campaign query failed", details: cErr.message }, { status: 500 });
  }
  if (!campaignRow) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // 3) Ownership check
  if (campaignRow.owner_id !== userId) {
    return NextResponse.json({ error: "Forbidden: You are not the owner" }, { status: 403 });
  }

  // 4) Bounds check
  if (parsed.data.x >= mapRow.width || parsed.data.y >= mapRow.height) {
    return NextResponse.json({ error: "Out of bounds" }, { status: 400 });
  }

  // 5) Upsert placement
  const { data: placement, error: pErr } = await supabase
    .from("placements")
    .upsert({
      map_id: mapRow.id,
      x: parsed.data.x,
      y: parsed.data.y,
      kind: parsed.data.kind,
      rotation: parsed.data.rotation,
      placed_by: userId,
    })
    .select()
    .single();

if (pErr) {
  return NextResponse.json(
    { error: "placements upsert failed", details: pErr.message, hint: (pErr as any).hint ?? null },
    { status: 500 }
  );
}

  return NextResponse.json({ placement });
}
