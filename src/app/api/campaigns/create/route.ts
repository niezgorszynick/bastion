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

  const supabase = await supabaseServer();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.rpc("create_campaign_with_map", {
    p_name: parsed.data.name,
    p_width: parsed.data.width,
    p_height: parsed.data.height,
    p_theme: "grasslands",
  });

  if (error) {
    return NextResponse.json({ error: "RPC failed", details: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    campaign: { id: row.campaign_id },
    map: { id: row.map_id, width: parsed.data.width, height: parsed.data.height },
  });
}
