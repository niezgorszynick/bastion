import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  mapId: z.string().uuid(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  rotation: z.number().int().min(0).max(3).optional(), // if omitted, rotate +1
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supabase = await supabaseServer();

  // 1) Auth via cookies/session
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  // 2) Load map
  const { data: mapRow, error: mapErr } = await supabase
    .from("maps")
    .select("id,campaign_id,width,height")
    .eq("id", parsed.data.mapId)
    .maybeSingle();

  if (mapErr) return NextResponse.json({ error: "Map query failed", details: mapErr.message }, { status: 500 });
  if (!mapRow) return NextResponse.json({ error: "Map not found" }, { status: 404 });

  // 3) Bounds check
  if (parsed.data.x >= mapRow.width || parsed.data.y >= mapRow.height) {
    return NextResponse.json({ error: "Out of bounds" }, { status: 400 });
  }

  // 4) Permission check: owner OR editor
  const { data: campaignRow, error: cErr } = await supabase
    .from("campaigns")
    .select("owner_id")
    .eq("id", mapRow.campaign_id)
    .maybeSingle();

  if (cErr) return NextResponse.json({ error: "Campaign query failed", details: cErr.message }, { status: 500 });
  if (!campaignRow) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const isOwner = campaignRow.owner_id === userId;

  const { data: member, error: memErr } = await supabase
    .from("campaign_members")
    .select("role")
    .eq("campaign_id", mapRow.campaign_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (memErr && !isOwner) {
    return NextResponse.json({ error: "Membership query failed", details: memErr.message }, { status: 500 });
  }

  const canEdit =
    isOwner ||
    (member && (member.role === "owner" || member.role === "editor"));

  if (!canEdit) {
    return NextResponse.json(
      { error: "Forbidden", debug: { isOwner, memberRole: member?.role ?? null } },
      { status: 403 }
    );
  }

  // 5) Read existing placement
  const { data: placement, error: pErr } = await supabase
    .from("placements")
    .select("id,rotation,kind")
    .eq("map_id", parsed.data.mapId)
    .eq("x", parsed.data.x)
    .eq("y", parsed.data.y)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: "Placement query failed", details: pErr.message }, { status: 500 });
  if (!placement) return NextResponse.json({ error: "No building on that tile" }, { status: 404 });

  const nextRotation =
    parsed.data.rotation !== undefined
      ? parsed.data.rotation
      : (((placement.rotation ?? 0) + 1) % 4);

  // 6) Update placement
  const { data: updated, error: uErr } = await supabase
    .from("placements")
    .update({ rotation: nextRotation })
    .eq("id", placement.id)
    .select("x,y,kind,rotation")
    .single();

  if (uErr) return NextResponse.json({ error: "Update failed", details: uErr.message }, { status: 500 });

  // 7) Log action
  const { error: aErr } = await supabase.from("actions").insert({
  campaign_id: mapRow.campaign_id,
  user_id: userId,
  type: "REMOVE",
  payload_json: { mapId: parsed.data.mapId, x: parsed.data.x, y: parsed.data.y },
});

// ✅ Do not block gameplay on logging failure
if (aErr) {
  console.error("actions insert failed:", aErr.message);
  return NextResponse.json({ ok: true, warning: "Action log failed", details: aErr.message });
}

return NextResponse.json({ ok: true });
}