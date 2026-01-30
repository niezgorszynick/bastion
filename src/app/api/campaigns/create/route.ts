import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const Body = z.object({
  name: z.string().min(1).max(80),
  width: z.number().int().min(16).max(256).default(64),
  height: z.number().int().min(16).max(256).default(64),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // NOTE: For a real app, you'd validate the user via JWT/cookies.
  // For MVP simplicity, pass user id from client after auth (or add middleware later).
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Missing user" }, { status: 401 });

  const supabase = supabaseServer();

  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .insert({ name: parsed.data.name, owner_id: userId })
    .select()
    .single();

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  await supabase.from("campaign_members").insert({
    campaign_id: campaign.id,
    user_id: userId,
    role: "owner",
  });

  const { data: map, error: mErr } = await supabase
    .from("maps")
    .insert({
      campaign_id: campaign.id,
      width: parsed.data.width,
      height: parsed.data.height,
      theme: "grasslands",
    })
    .select()
    .single();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  return NextResponse.json({ campaign, map });
}
