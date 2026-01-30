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
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing user" }, { status: 401 });

  const supabase = await supabaseServer();

  // Role check: editor or owner
  const { data: mapRow, error: mapErr } = await supabase
    .from("maps")
    .select("id,campaign_id,width,height")
    .eq("id", parsed.data.mapId)
    .single();

  if (mapErr || !mapRow) return NextResponse.json({ error: "Map not found" }, { status: 404 });

  const { data: member } = await supabase
    .from("campaign_members")
    .select("role")
    .eq("campaign_id", mapRow.campaign_id)
    .eq("user_id", userId)
    .single();

  if (!member || (member.role !== "owner" && member.role !== "editor")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (parsed.data.x >= mapRow.width || parsed.data.y >= mapRow.height) {
    return NextResponse.json({ error: "Out of bounds" }, { status: 400 });
  }

  const { data: placement, error: pErr } = await supabase
    .from("placements")
    .upsert({
      map_id: parsed.data.mapId,
      x: parsed.data.x,
      y: parsed.data.y,
      kind: parsed.data.kind,
      rotation: parsed.data.rotation,
      placed_by: userId,
    })
    .select()
    .single();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Audit log
  await supabase.from("actions").insert({
    campaign_id: mapRow.campaign_id,
    user_id: userId,
    type: "PLACE",
    payload_json: { mapId: parsed.data.mapId, x: parsed.data.x, y: parsed.data.y, kind: parsed.data.kind },
  });

  return NextResponse.json({ placement });
}
