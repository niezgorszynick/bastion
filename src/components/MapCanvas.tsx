"use client";

import { BUILDINGS, BuildingKind } from "@/lib/game/buildings";
import { useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Placement = { x: number; y: number; kind: string; rotation: number };

const TILE = 16;
const ZOOMS = [1, 1.5, 2, 2.5, 3, 4] as const;

function key(x: number, y: number) {
  return `${x},${y}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const MapCanvas = forwardRef(function MapCanvas({
  mapId,
  width,
  height,
  userId,
  selectedKind = "workshop",
  rotation = 0,
  onTileContextMenu,
  rotateIntent,
  removeIntent,
}: {
  mapId: string;
  width: number;
  height: number;
  userId: string;
  selectedKind?: string;
  rotation?: number;
  rotateIntent?: { x:number; y:number; t:number } | null;
  removeIntent?: { x:number; y:number; t:number } | null;
  onTileContextMenu?: (args: { clientX: number; clientY: number; tx: number; ty: number; hasPlacement: boolean; buildingKind?: string; }) => void;
}, ref) {

  // 1. Core Refs defined at the top
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef({ x: 40, y: 40 });
  const dragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({
    dragging: false,
    lastX: 0,
    lastY: 0,
  });
  const hoverRef = useRef<{ x: number; y: number } | null>(null);
  const tilesImgRef = useRef<HTMLImageElement | null>(null);

  // 2. State
  const [zoomIndex, setZoomIndex] = useState(1); // start at 2x
  const zoom = ZOOMS[zoomIndex];
  const [placements, setPlacements] = useState<Map<string, Placement>>(new Map());
  const placementsRef = useRef(placements);
  placementsRef.current = placements;
  const [tilesReady, setTilesReady] = useState(false);

  // 3. Sync Logic
  const rotationRef = useRef(rotation);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);

  const selectedKindRef = useRef(selectedKind);
  useEffect(() => { selectedKindRef.current = selectedKind; }, [selectedKind]);

  // 4. Exposed Imperative Handlers
  const centerMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;


    const bestZoomIndex = ZOOMS.findIndex(z => (width * TILE * z) > canvas.clientWidth * 0.8);
      setZoomIndex(clamp(bestZoomIndex === -1 ? 0 : bestZoomIndex, 0, 1)); // Default to a lower zoom
    const tileSizePx = TILE * zoom;
    const mapPixelWidth = width * tileSizePx;
    const mapPixelHeight = height * tileSizePx;

    cameraRef.current = {
      x: Math.round((canvas.clientWidth / 2) - (mapPixelWidth / 2)),
      y: Math.round((canvas.clientHeight / 2) - (mapPixelHeight / 2)),
    };
  };

  useImperativeHandle(ref, () => ({
    centerMap
  }));

  // Trigger initial center when tiles are loaded
  useEffect(() => {
    if (tilesReady) {
      requestAnimationFrame(() => centerMap());
    }
  }, [tilesReady]);

  // 5. Unified Sprite Lookup
  const tileUV = useMemo(() => {
    const uv = (tx: number, ty: number) => ({
      sx: tx * TILE,
      sy: ty * TILE,
      sw: TILE,
      sh: TILE,
    });
    return {
      grass: uv(0, 0),
      selector: uv(1, 0),
      workshop: uv(2, 0),
    };
  }, []);

  const kindToUV = (kind: string) => {
    const building = BUILDINGS[kind as BuildingKind];
    if (building) {
      return {
        sx: building.sprite[0] * TILE,
        sy: building.sprite[1] * TILE,
        sw: TILE,
        sh: TILE,
      };
    }
    return tileUV.workshop; // Fallback
  };

  // --- Supabase: initial placements + realtime
  useEffect(() => {
    const supabase = supabaseBrowser();
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("placements")
        .select("x,y,kind,rotation")
        .eq("map_id", mapId);

      if (!alive) return;
      if (error) return console.error(error);

      const m = new Map<string, Placement>();
      for (const r of data ?? []) m.set(key(r.x, r.y), r as Placement);
      setPlacements(m);
    })();

    const channel = supabase
      .channel(`placements:${mapId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "placements", filter: `map_id=eq.${mapId}` },
        (payload) => {
          const next = new Map(placementsRef.current);

          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as any;
            next.delete(key(oldRow.x, oldRow.y));
          } else {
            const row = payload.new as any;
            next.set(key(row.x, row.y), {
              x: row.x,
              y: row.y,
              kind: row.kind,
              rotation: row.rotation,
            });
          }
          setPlacements(next);
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [mapId]);

  // --- Load tiles.png
  useEffect(() => {
    const img = new Image();
    img.src = "/assets/tiles.png";
    img.onload = () => {
      tilesImgRef.current = img;
      setTilesReady(true);
    };
    img.onerror = () => {
      console.error("Failed to load /assets/tiles.png");
    };
  }, []);

  // --- Rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    const drawTile = (uv: { sx: number; sy: number; sw: number; sh: number }, dx: number, dy: number) => {
      const img = tilesImgRef.current;
      if (!img) return;
      ctx.drawImage(img, uv.sx, uv.sy, uv.sw, uv.sh, dx, dy, TILE * zoom, TILE * zoom);
    };

    const drawTileRotated = (
      uv: { sx: number; sy: number; sw: number; sh: number },
      dx: number,
      dy: number,
      rot: number
    ) => {
      const img = tilesImgRef.current;
      if (!img) return;

      const tileSizePx = TILE * zoom;
      const cx = Math.round(dx + tileSizePx / 2);
      const cy = Math.round(dy + tileSizePx / 2);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rot % 4) * (Math.PI / 2));
      ctx.translate(-Math.round(tileSizePx / 2), -Math.round(tileSizePx / 2));
      ctx.drawImage(img, uv.sx, uv.sy, uv.sw, uv.sh, 0, 0, tileSizePx, tileSizePx);
      ctx.restore();
    };

    const render = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      ctx.clearRect(0, 0, cw, ch);
      const cam = cameraRef.current;

      const tileSizePx = TILE * zoom;
      const x0 = Math.floor((-cam.x) / tileSizePx) - 1;
      const y0 = Math.floor((-cam.y) / tileSizePx) - 1;
      const x1 = Math.ceil((cw - cam.x) / tileSizePx) + 1;
      const y1 = Math.ceil((ch - cam.y) / tileSizePx) + 1;

      const minX = clamp(x0, 0, width - 1);
      const minY = clamp(y0, 0, height - 1);
      const maxX = clamp(x1, 0, width - 1);
      const maxY = clamp(y1, 0, height - 1);

      if (tilesReady) {
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            const dx = Math.round(cam.x + x * tileSizePx);
            const dy = Math.round(cam.y + y * tileSizePx);
            drawTile(tileUV.grass, dx, dy);
          }
        }
      } else {
        ctx.fillStyle = "#2a7b2a";
        ctx.fillRect(0, 0, cw, ch);
      }

      if (tilesReady) {
        for (const p of placementsRef.current.values()) {
          if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) continue;
          const dx = Math.round(cam.x + p.x * tileSizePx);
          const dy = Math.round(cam.y + p.y * tileSizePx);
          const uv = kindToUV(p.kind);
          drawTileRotated(uv, dx, dy, p.rotation ?? 0);
        }
      }

      // Ghost preview
      const hover = hoverRef.current;
      if (tilesReady && hover) {
        const k = key(hover.x, hover.y);
        const occupied = placementsRef.current.has(k);
        const dx = Math.round(cam.x + hover.x * tileSizePx);
        const dy = Math.round(cam.y + hover.y * tileSizePx);

        if (!occupied) {
          ctx.save();
          ctx.globalAlpha = 0.6;
          // Unified dynamic lookup for the ghost preview
          const ghostUV = kindToUV(selectedKindRef.current);
          const ghostRot = rotationRef.current;
          drawTileRotated(ghostUV, dx, dy, ghostRot);
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = "red";
          ctx.fillRect(dx, dy, tileSizePx, tileSizePx);
          ctx.restore();
        }
        drawTile(tileUV.selector, dx, dy);
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [tilesReady, zoom, width, height, tileUV]);

  // --- Interaction handlers (keep existing logic) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toTile = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cam = cameraRef.current;
      const tileSizePx = TILE * zoom;
      const tx = Math.floor((x - cam.x) / tileSizePx);
      const ty = Math.floor((y - cam.y) / tileSizePx);
      return { tx, ty };
    };

    const onMove = (e: MouseEvent) => {
      const { tx, ty } = toTile(e.clientX, e.clientY);
      if (tx >= 0 && ty >= 0 && tx < width && ty < height) {
        hoverRef.current = { x: tx, y: ty };
      } else {
        hoverRef.current = null;
      }
      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        cameraRef.current.x += dx;
        cameraRef.current.y += dy;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
      }
    };

    const onDown = (e: MouseEvent) => {
      if (e.button === 2) {
        dragRef.current.dragging = true;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
      }
    };

    const onUp = (e: MouseEvent) => {
      if (e.button === 2) dragRef.current.dragging = false;
    };

    const onClick = async (e: MouseEvent) => {
      if (e.button !== 0) return;
      const { tx, ty } = toTile(e.clientX, e.clientY);
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) return;

      if (e.shiftKey) {
        const next = new Map(placementsRef.current);
        next.delete(key(tx, ty));
        setPlacements(next);
        await fetch("/api/maps/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mapId, x: tx, y: ty }),
        });
        return;
      }

      const kind = selectedKindRef.current;
      const rot = rotationRef.current;
      const next = new Map(placementsRef.current);
      next.set(key(tx, ty), { x: tx, y: ty, kind, rotation: rot });
      setPlacements(next);

      await fetch("/api/maps/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapId, x: tx, y: ty, kind, rotation: rot }),
      });
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
        if (Math.abs(e.deltaY) < 10) return;
      setZoomIndex((z) => {
        const dir = e.deltaY > 0 ? -1 : 1;
        return clamp(z + dir, 0, ZOOMS.length - 1);
      });
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const { tx, ty } = toTile(e.clientX, e.clientY);
      if (tx < 0 || ty < 0 || tx >= width || ty >= height) return;
      const placement = placementsRef.current.get(key(tx, ty));
      onTileContextMenu?.({ clientX: e.clientX, clientY: e.clientY, tx, ty, hasPlacement: !!placement, buildingKind: placement?.kind });
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onContextMenu);

    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("wheel", onWheel as any);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [mapId, userId, selectedKind, zoom, width, height]);

  return (
    <div className="w-full h-full min-h-0 relative overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />
    </div>
  );
});