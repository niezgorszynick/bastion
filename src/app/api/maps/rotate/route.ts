import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  mapId: z.string().uuid(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  // if omitted, we rotate +1
  rotation: z.number().int().min(0).max(3).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing user" }, { status: 401 });

  const supabase = await supabaseServer();

  // Load map -> campaign for role check
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

  // Read existing placement to rotate it
  const { data: placement, error: pErr } = await supabase
    .from("placements")
    .select("id,rotation,kind")
    .eq("map_id", parsed.data.mapId)
    .eq("x", parsed.data.x)
    .eq("y", parsed.data.y)
    .single();

  if (pErr || !placement) return NextResponse.json({ error: "No building on that tile" }, { status: 404 });

  const nextRotation =
    parsed.data.rotation !== undefined
      ? parsed.data.rotation
      : (((placement.rotation ?? 0) + 1) % 4);

  const { data: updated, error: uErr } = await supabase
    .from("placements")
    .update({ rotation: nextRotation })
    .eq("id", placement.id)
    .select("x,y,kind,rotation")
    .single();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  await supabase.from("actions").insert({
    campaign_id: mapRow.campaign_id,
    user_id: userId,
    type: "ROTATE",
    payload_json: { mapId: parsed.data.mapId, x: parsed.data.x, y: parsed.data.y, rotation: nextRotation },
  });

  return NextResponse.json({ placement: updated });
}
