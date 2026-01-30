"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MapCanvas } from "@/components/MapCanvas";

type MenuState = null | {
  x: number;
  y: number;
  tx: number;
  ty: number;
  hasPlacement: boolean;
};

export default function CampaignPage() {
  const params = useParams<{ id: string }>();
  const campaignId = params.id;

  const [userId, setUserId] = useState<string | null>(null);
  const [map, setMap] = useState<{ id: string; width: number; height: number } | null>(null);

  const [selectedKind, setSelectedKind] = useState<"workshop" | "barracks">("workshop");
  const [rotation, setRotation] = useState(0); // 0..3

  const [menu, setMenu] = useState<MenuState>(null);
  const [rotateIntent, setRotateIntent] = useState<null | { x: number; y: number; t: number }>(null);
  const [removeIntent, setRemoveIntent] = useState<null | { x: number; y: number; t: number }>(null);


  function paletteBtn(active: boolean) {
    return {
      className: "px-3 py-2 rounded border text-sm select-none transition active:translate-y-[1px]",
      style: {
        backgroundColor: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
        borderColor: active ? "#111" : "#d1d5db",
        boxShadow: active ? "inset 0 2px 6px rgba(0,0,0,0.35)" : "none",
      } as React.CSSProperties,
    };
  }

  // R / Shift+R rotate placement direction
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "r") return;
      setRotation((r) => (e.shiftKey ? (r + 3) % 4 : (r + 1) % 4));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Click anywhere closes context menu
  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  // Load user + map
  useEffect(() => {
    const supabase = supabaseBrowser();

    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));

    supabase
      .from("maps")
      .select("id,width,height")
      .eq("campaign_id", campaignId)
      .single()
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setMap(data);
      });
  }, [campaignId]);

  if (!userId) return <div className="p-6">Please login.</div>;
  if (!map) return <div className="p-6">Loading map…</div>;

  return (
    <div className="h-screen p-4 flex flex-col gap-3">
      <h1 className="text-xl font-semibold">Campaign</h1>

      <div className="flex gap-2 items-center">
        <button
          type="button"
          {...paletteBtn(selectedKind === "workshop")}
          aria-pressed={selectedKind === "workshop"}
          onClick={() => setSelectedKind("workshop")}
        >
          Workshop
        </button>

        <button
          type="button"
          {...paletteBtn(selectedKind === "barracks")}
          aria-pressed={selectedKind === "barracks"}
          onClick={() => setSelectedKind("barracks")}
        >
          Barracks
        </button>

        <span className="text-sm text-gray-600 ml-2">Rotation: {rotation * 90}° (R / Shift+R)</span>
      </div>

      <div className="flex-1">
        <MapCanvas
          mapId={map.id}
          width={map.width}
          height={map.height}
          userId={userId}
          selectedKind={selectedKind}
          rotation={rotation}
          rotateIntent={rotateIntent}
          removeIntent={removeIntent}
          onTileContextMenu={({ clientX, clientY, tx, ty, hasPlacement }) => {
            setMenu({ x: clientX, y: clientY, tx, ty, hasPlacement });
          }}
        />
      </div>

      <p className="text-sm text-gray-600">
        Click to build. Shift+Click to remove. Right-click for menu. Right-drag pans. Wheel zooms.
      </p>

      {menu && (
        <div
          className="fixed z-50 bg-white border rounded shadow-md p-1 text-sm"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-gray-600">
            ({menu.tx}, {menu.ty})
          </div>

          <button
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
            disabled={!menu.hasPlacement}
            onClick={async () => {
              // ✅ instant UI
              setRemoveIntent({ x: menu.tx, y: menu.ty, t: Date.now() });
              setMenu(null);

              const res = await fetch("/api/maps/remove", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": userId },
                body: JSON.stringify({ mapId: map.id, x: menu.tx, y: menu.ty }),
              });

              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Remove failed");
              }
            }}

          >
            Remove
          </button>

          <button
            className="block w-full text-left px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
            disabled={!menu.hasPlacement}
            onClick={async () => {
              // optimistic rotate (instant)
              setRotateIntent({ x: menu.tx, y: menu.ty, t: Date.now() });
              setMenu(null);

              const res = await fetch("/api/maps/rotate", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-id": userId },
                body: JSON.stringify({ mapId: map.id, x: menu.tx, y: menu.ty }),
              });

              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Rotate failed");
              }
            }}
          >
            Rotate ↻
          </button>

          <button
            className="block w-full text-left px-2 py-1 hover:bg-gray-100"
            onClick={() => setMenu(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
