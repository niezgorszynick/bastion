"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { MapCanvas } from "@/components/MapCanvas";
import { BUILDINGS, BuildingKind } from "@/lib/game/buildings";

type MenuState = null | {
  x: number;
  y: number;
  tx: number;
  ty: number;
  hasPlacement: boolean;
  buildingKind?: string;
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

    fetchMap(); 
  }, [campaignId]); 

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
    <div className="h-full flex bg-slate-100 overflow-hidden"> 
  <aside className="w-80 min-w-[320px] max-w-[320px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col p-6 shadow-sm z-10">
    <header className="mb-8">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bastion Architect</h1>
      <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">
        ID: {campaignId.slice(0, 8)}
      </p>
    </header>

    <section className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Facilities
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {(Object.keys(BUILDINGS) as BuildingKind[]).map((kind) => (
            <button
              key={kind}
              onClick={() => setSelectedKind(kind)}
              className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all flex flex-col gap-1 ${
                selectedKind === kind 
                  ? "border-blue-600 bg-blue-50 shadow-sm" 
                  : "border-slate-100 hover:border-slate-300"
              }`}
            >
              <span className="font-bold text-slate-900">{BUILDINGS[kind].name}</span>
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-tighter">
                {BUILDINGS[kind].baseCost} GP
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <h3 className="text-xs font-black text-slate-900 uppercase mb-2">Facility Details</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {BUILDINGS[selectedKind].description}
        </p>
      </div>
    </section>

    <footer className="pt-6 mt-auto border-t border-slate-100">
      <div className="flex justify-between items-center text-sm mb-4">
        <span className="text-slate-500 font-medium">Placement Rotation</span>
        <span className="font-mono font-bold bg-slate-200 px-2 py-1 rounded text-slate-700">
          {rotation * 90}°
        </span>
      </div>
      <p className="text-[10px] text-slate-400 italic text-center">
        Press 'R' to rotate placement direction.
      </p>
    </footer>
  </aside>

 <main className="flex-1 flex flex-col relative bg-slate-100 p-6 overflow-hidden">
        <div className="h-full min-h-0 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-white relative">
          <MapCanvas
            mapId={map.id}
            width={map.width}
            height={map.height}
            userId={userId}
            selectedKind={selectedKind}
            rotation={rotation}
            rotateIntent={rotateIntent}
            removeIntent={removeIntent}
            onTileContextMenu={({ clientX, clientY, tx, ty, hasPlacement, buildingKind }) => {
              setMenu({ x: clientX, y: clientY, tx, ty, hasPlacement, buildingKind });
            }}
          />
        </div>
      </main>
{menu && (
  <div
    className="fixed z-50 bg-white border border-slate-300 rounded-lg shadow-2xl p-2 min-w-[180px]" // Increased padding and shadow
    style={{ left: menu.x, top: menu.y }}
    onClick={(e) => e.stopPropagation()}
  >

    {menu.hasPlacement && menu.buildingKind && (
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-md mb-2">
        <div className="font-bold text-slate-900 text-sm"> 
          {BUILDINGS[menu.buildingKind as BuildingKind]?.name}
        </div>
        <div className="text-xs text-slate-500 leading-normal"> 
          {BUILDINGS[menu.buildingKind as BuildingKind]?.description}
        </div>
      </div>
    )}

    {/* 2. Coordinates Display */}
    <div className="px-3 py-1 text-slate-400 font-mono text-xs uppercase tracking-tighter mb-2">
      Location: {menu.tx}, {menu.ty}
    </div>

    {/* 3. Action: Rotate */}
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

    {/* 4. Action: Dismantle (Renamed from 'Remove' for flavor) */}
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
      Dismantle Facility
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