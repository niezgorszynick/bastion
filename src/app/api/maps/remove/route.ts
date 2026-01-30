import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  mapId: z.string().uuid(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing user" }, { status: 401 });

  const supabase = await supabaseServer();

  // load map -> campaign for role check
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

  const { error: delErr } = await supabase
    .from("placements")
    .delete()
    .eq("map_id", parsed.data.mapId)
    .eq("x", parsed.data.x)
    .eq("y", parsed.data.y);

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await supabase.from("actions").insert({
    campaign_id: mapRow.campaign_id,
    user_id: userId,
    type: "REMOVE",
    payload_json: { mapId: parsed.data.mapId, x: parsed.data.x, y: parsed.data.y },
  });

  return NextResponse.json({ ok: true });
}
