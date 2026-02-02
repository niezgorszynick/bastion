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

  // Sync User and Map Data
  useEffect(() => {
    if (!campaignId) return;
    const supabase = supabaseBrowser();

    // 1. Fetch User
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });

    // 2. Fetch Map (Safe Async Version)
    const fetchMap = async () => {
      const { data, error } = await supabase
        .from("maps")
        .select("id, width, height")
        .eq("campaign_id", campaignId)
        .maybeSingle();

      if (error) {
        console.error("Fetch error: " + error.message);
        return;
      }

      if (data) {
        setMap(data);
      } else {
        // Attempt to initialize, but use 'onConflict' to handle the race condition
        const { data: newMap, error: initError } = await supabase
          .from("maps")
          .upsert({ 
            campaign_id: campaignId, 
            grid_data: [],
            width: 64, 
            height: 64 
          }, { onConflict: 'campaign_id' }) 
          .select()
          .single();

        if (initError) {
          console.error("Initialization failed: " + initError.message);
        } else {
          setMap(newMap);
        }
      }
    };

    fetchMap(); // <--- YOU NEEDED THIS CALL
  }, [campaignId]); // <--- YOU NEEDED THIS CLOSING BRACE

  if (!userId) return <div className="p-6 text-slate-600">Checking authentication...</div>;
  if (!map) return (
    <div className="p-6 space-y-4">
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
      <p className="text-slate-400">Loading Bastion map data...</p>
    </div>
  );

  return (
    <div className="h-screen p-4 flex flex-col gap-3 bg-slate-50">
      <header className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800">Bastion Architect</h1>
        <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded text-slate-600">
          ID: {campaignId.slice(0, 8)}...
        </span>
      </header>

      <div className="flex gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
        <button
          type="button"
          {...paletteBtn(selectedKind === "workshop")}
          onClick={() => setSelectedKind("workshop")}
        >
          Workshop
        </button>

        <button
          type="button"
          {...paletteBtn(selectedKind === "barracks")}
          onClick={() => setSelectedKind("barracks")}
        >
          Barracks
        </button>

        <div className="h-6 w-[1px] bg-slate-200 mx-2" />
        <span className="text-sm text-slate-600 font-medium">
          Rotation: {rotation * 90}° <kbd className="ml-1 px-1 bg-slate-100 border rounded text-xs">R</kbd>
        </span>
      </div>

      <div className="flex-1 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-white relative">
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

      <footer className="flex justify-between items-center text-xs text-slate-500">
        <p>Left-click: Build | Shift+Click: Remove | Right-click: Menu</p>
        <p>Right-drag: Pan | Wheel: Zoom</p>
      </footer>

      {menu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-1 text-sm min-w-[120px]"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-slate-400 border-b mb-1 font-mono text-[10px]">
            Coords: {menu.tx}, {menu.ty}
          </div>

          <button
            className="block w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-600 rounded disabled:opacity-30 transition-colors"
            disabled={!menu.hasPlacement}
            onClick={async () => {
              setRemoveIntent({ x: menu.tx, y: menu.ty, t: Date.now() });
              setMenu(null);

              const res = await fetch("/api/maps/remove", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mapId: map.id, x: menu.tx, y: menu.ty }),
              });

              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Remove failed");
              }
            }}
          >
            Remove Facility
          </button>

          <button
            className="block w-full text-left px-3 py-2 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
            disabled={!menu.hasPlacement}
            onClick={async () => {
              setRotateIntent({ x: menu.tx, y: menu.ty, t: Date.now() });
              setMenu(null);

              const res = await fetch("/api/maps/rotate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
            className="block w-full text-left px-3 py-2 hover:bg-slate-100 rounded text-slate-400 border-t mt-1"
            onClick={() => setMenu(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}