// PixiJS renderer for Nebula Conquest.
// Draws a parallax starfield, glowing planets, animated fleets and capture
// effects, and handles all input (mouse + touch + pinch-zoom + pan) so the game
// is fully playable on phones, tablets, laptops and desktops alike.

import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  colorForSlot,
  planetTheme,
  shipShape,
  trailKind,
  EMOTE_GLYPHS,
  EVENT,
} from '../config';
import type { GameEvent, Snapshot, StartPayload, WorldPlanet } from '../types';
import type { Loadout } from '../config';

interface SlotInfo {
  color: number;
  name: string;
  loadout: Loadout;
  id: string;
  isBot: boolean;
}

interface PlanetView extends WorldPlanet {
  container: Container;
  glow: Graphics;
  theme: Graphics;
  body: Graphics;
  selRing: Graphics;
  label: Text;
  ownerSlot: number;
  targetShips: number;
  displayShips: number;
  renderedOwner: number;
  renderedTheme: string;
}

interface FleetView {
  container: Container;
  body: Graphics;
  trail: Graphics;
  label: Text;
  ownerSlot: number;
  // interpolation
  px: number;
  py: number;
  cx: number;
  cy: number;
  angle: number;
  ships: number;
  history: { x: number; y: number }[];
}

interface Effect {
  gfx: Container;
  life: number;
  maxLife: number;
  kind: 'capture' | 'defend' | 'emote';
  vy?: number;
}

const INTERP_DELAY = 100; // ms render delay for smooth fleet interpolation

function lighten(color: number, amt: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const lr = Math.round(r + (255 - r) * amt);
  const lg = Math.round(g + (255 - g) * amt);
  const lb = Math.round(b + (255 - b) * amt);
  return (lr << 16) | (lg << 8) | lb;
}

export class Renderer {
  app: Application;
  private bgStars!: Graphics;
  private world!: Container;
  private nebula!: Container;
  private worldStars!: Graphics;
  private planetLayer!: Container;
  private fleetLayer!: Container;
  private fxLayer!: Container;
  private overlay!: Graphics; // drag-to-send line, in world space

  private planets = new Map<number, PlanetView>();
  private fleets = new Map<number, FleetView>();
  private effects: Effect[] = [];
  private slots = new Map<number, SlotInfo>();
  private idToSlot = new Map<string, number>();
  private youSlot = -1;

  // camera
  private zoom = 0.3;
  private minZoom = 0.12;
  private maxZoom = 2.5;

  // snapshots for interpolation
  private prevSnap: { snap: Snapshot; recv: number } | null = null;
  private curSnap: { snap: Snapshot; recv: number } | null = null;

  // input
  private pointers = new Map<number, { x: number; y: number }>();
  private dragStart: { x: number; y: number; t: number } | null = null;
  private panLast: { x: number; y: number } | null = null;
  private dragSource: number | null = null;
  private dragging = false;
  private pinchDist = 0;
  private selected: number | null = null;

  // callbacks to React
  onSend: (from: number, to: number, ratio: number) => void = () => {};
  onSelect: (planetId: number | null, info: { ships: number; ownerSlot: number } | null) => void = () => {};
  getRatio: () => number = () => 0.5;

  private destroyed = false;
  private boundTick = (ticker: { deltaMS: number }) => this.tick(ticker.deltaMS);

  constructor() {
    this.app = new Application();
  }

  async mount(el: HTMLElement) {
    await this.app.init({
      background: 0x05060f,
      antialias: true,
      resizeTo: el,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      powerPreference: 'high-performance',
    });
    el.appendChild(this.app.canvas);
    (this.app.canvas.style as CSSStyleDeclaration).touchAction = 'none';

    this.bgStars = new Graphics();
    this.app.stage.addChild(this.bgStars);

    this.world = new Container();
    this.app.stage.addChild(this.world);

    this.nebula = new Container();
    this.worldStars = new Graphics();
    this.planetLayer = new Container();
    this.fleetLayer = new Container();
    this.fxLayer = new Container();
    this.overlay = new Graphics();
    this.world.addChild(this.nebula, this.worldStars, this.overlay, this.planetLayer, this.fleetLayer, this.fxLayer);

    this.drawNebula();
    this.drawWorldStars();
    this.drawBgStars();
    this.fitCamera();
    this.attachInput();

    this.app.ticker.add(this.boundTick);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    this.drawBgStars();
    this.clampCamera();
  };

  // ---------------- Background ----------------
  private drawBgStars() {
    const g = this.bgStars;
    g.clear();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const count = Math.floor((w * h) / 6000);
    for (let i = 0; i < count; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.2 + 0.2;
      const a = Math.random() * 0.5 + 0.1;
      g.circle(x, y, r).fill({ color: 0xffffff, alpha: a });
    }
  }

  private drawWorldStars() {
    const g = this.worldStars;
    g.clear();
    for (let i = 0; i < 700; i++) {
      const x = Math.random() * WORLD_WIDTH;
      const y = Math.random() * WORLD_HEIGHT;
      const r = Math.random() * 1.8 + 0.3;
      const a = Math.random() * 0.6 + 0.15;
      const tint = Math.random() > 0.85 ? 0x9bd0ff : 0xffffff;
      g.circle(x, y, r).fill({ color: tint, alpha: a });
    }
  }

  private drawNebula() {
    const colors = [0x3a0ca3, 0x7209b7, 0x0b486b, 0x4361ee, 0xb5179e];
    for (let i = 0; i < 7; i++) {
      const blob = new Graphics();
      const cx = Math.random() * WORLD_WIDTH;
      const cy = Math.random() * WORLD_HEIGHT;
      const baseR = 400 + Math.random() * 600;
      const color = colors[i % colors.length];
      for (let layer = 5; layer >= 1; layer--) {
        blob.circle(cx, cy, (baseR * layer) / 5).fill({ color, alpha: 0.03 });
      }
      blob.blendMode = 'add';
      this.nebula.addChild(blob);
    }
  }

  // ---------------- Camera ----------------
  private fitCamera() {
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const pad = 1.1;
    const scale = Math.min(sw / (WORLD_WIDTH * pad), sh / (WORLD_HEIGHT * pad));
    this.minZoom = scale * 0.6;
    this.zoom = scale;
    this.world.scale.set(this.zoom);
    this.world.position.set((sw - WORLD_WIDTH * this.zoom) / 2, (sh - WORLD_HEIGHT * this.zoom) / 2);
  }

  private screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - this.world.x) / this.world.scale.x,
      y: (sy - this.world.y) / this.world.scale.y,
    };
  }

  private setZoom(newZoom: number, pivotX: number, pivotY: number) {
    newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    const before = this.screenToWorld(pivotX, pivotY);
    this.zoom = newZoom;
    this.world.scale.set(newZoom);
    // Keep the world point under the pivot fixed.
    this.world.position.set(pivotX - before.x * newZoom, pivotY - before.y * newZoom);
    this.clampCamera();
  }

  private clampCamera() {
    // Keep some galaxy on screen; allow generous overscroll.
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const margin = 300 * this.zoom;
    const minX = sw - WORLD_WIDTH * this.zoom - margin;
    const maxX = margin;
    const minY = sh - WORLD_HEIGHT * this.zoom - margin;
    const maxY = margin;
    this.world.position.x = Math.min(maxX, Math.max(minX, this.world.position.x));
    this.world.position.y = Math.min(maxY, Math.max(minY, this.world.position.y));
  }

  // ---------------- Input ----------------
  private canvasPos(e: PointerEvent | WheelEvent) {
    const rect = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private attachInput() {
    const c = this.app.canvas;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    c.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointercancel', this.onPointerUp);
    c.addEventListener('pointerleave', this.onPointerUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private detachInput() {
    const c = this.app.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointercancel', this.onPointerUp);
    c.removeEventListener('pointerleave', this.onPointerUp);
    c.removeEventListener('wheel', this.onWheel);
  }

  private planetAt(worldX: number, worldY: number): PlanetView | null {
    let best: PlanetView | null = null;
    let bestD = Infinity;
    for (const p of this.planets.values()) {
      const dx = p.x - worldX;
      const dy = p.y - worldY;
      const d = dx * dx + dy * dy;
      const hitR = (p.r + 14) * (p.r + 14);
      if (d < hitR && d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private onPointerDown = (e: PointerEvent) => {
    const pos = this.canvasPos(e);
    this.pointers.set(e.pointerId, pos);

    if (this.pointers.size === 2) {
      // Start pinch.
      const pts = [...this.pointers.values()];
      this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.panLast = null;
      this.dragging = false;
      this.dragSource = null;
      return;
    }

    const world = this.screenToWorld(pos.x, pos.y);
    const planet = this.planetAt(world.x, world.y);
    this.dragStart = { x: pos.x, y: pos.y, t: performance.now() };

    if (planet && planet.ownerSlot === this.youSlot && this.youSlot >= 0) {
      this.dragSource = planet.id;
      this.panLast = null;
    } else {
      this.dragSource = null;
      this.panLast = pos;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    const pos = this.canvasPos(e);
    this.pointers.set(e.pointerId, pos);

    if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.pinchDist > 0) {
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        this.setZoom(this.zoom * (dist / this.pinchDist), mid.x, mid.y);
      }
      this.pinchDist = dist;
      return;
    }

    if (this.dragSource != null && this.dragStart) {
      const moved = Math.hypot(pos.x - this.dragStart.x, pos.y - this.dragStart.y);
      if (moved > 12) this.dragging = true;
      if (this.dragging) this.drawDragLine(pos);
      return;
    }

    if (this.panLast) {
      this.world.position.x += pos.x - this.panLast.x;
      this.world.position.y += pos.y - this.panLast.y;
      this.clampCamera();
      this.panLast = pos;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    const had = this.pointers.has(e.pointerId);
    this.pointers.delete(e.pointerId);
    if (!had) return;

    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size >= 1) {
      // Other finger still down — reset gesture baselines.
      this.panLast = null;
      return;
    }

    const pos = this.canvasPos(e);
    const world = this.screenToWorld(pos.x, pos.y);
    const upPlanet = this.planetAt(world.x, world.y);

    const moved = this.dragStart ? Math.hypot(pos.x - this.dragStart.x, pos.y - this.dragStart.y) : 999;
    const dt = this.dragStart ? performance.now() - this.dragStart.t : 999;
    const isTap = moved < 12 && dt < 400;

    if (this.dragging && this.dragSource != null) {
      // Drag-to-send.
      if (upPlanet && upPlanet.id !== this.dragSource) {
        this.onSend(this.dragSource, upPlanet.id, this.getRatio());
        this.flashSelection(this.dragSource);
      }
      this.clearSelection();
    } else if (isTap) {
      this.handleTap(upPlanet);
    }

    this.overlay.clear();
    this.dragStart = null;
    this.panLast = null;
    this.dragSource = null;
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const pos = this.canvasPos(e);
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    this.setZoom(this.zoom * factor, pos.x, pos.y);
  };

  private handleTap(planet: PlanetView | null) {
    if (!planet) {
      this.clearSelection();
      return;
    }
    if (this.selected != null && planet.id !== this.selected) {
      // Send from selected source to tapped target.
      this.onSend(this.selected, planet.id, this.getRatio());
      this.flashSelection(this.selected);
      this.clearSelection();
      return;
    }
    if (planet.ownerSlot === this.youSlot && this.youSlot >= 0) {
      // Toggle selecting your own planet as source.
      if (this.selected === planet.id) this.clearSelection();
      else this.setSelection(planet.id);
    } else {
      // Tapped a neutral/enemy planet with nothing selected — just report info.
      this.onSelect(planet.id, { ships: Math.round(planet.targetShips), ownerSlot: planet.ownerSlot });
    }
  }

  private setSelection(id: number) {
    this.selected = id;
    const p = this.planets.get(id);
    this.onSelect(id, p ? { ships: Math.round(p.targetShips), ownerSlot: p.ownerSlot } : null);
  }

  private clearSelection() {
    this.selected = null;
    this.onSelect(null, null);
  }

  private flashSelection(id: number) {
    const p = this.planets.get(id);
    if (p) this.spawnEffect('defend', p.x, p.y, colorForSlot(p.ownerSlot));
  }

  private drawDragLine(pos: { x: number; y: number }) {
    if (this.dragSource == null) return;
    const src = this.planets.get(this.dragSource);
    if (!src) return;
    const w = this.screenToWorld(pos.x, pos.y);
    this.overlay.clear();
    this.overlay
      .moveTo(src.x, src.y)
      .lineTo(w.x, w.y)
      .stroke({ width: 3 / this.zoom, color: colorForSlot(this.youSlot), alpha: 0.7 });
    const target = this.planetAt(w.x, w.y);
    if (target && target.id !== this.dragSource) {
      this.overlay.circle(target.x, target.y, target.r + 8).stroke({
        width: 3 / this.zoom,
        color: 0xffffff,
        alpha: 0.8,
      });
    }
  }

  // ---------------- Match setup ----------------
  setStart(payload: StartPayload) {
    this.slots.clear();
    this.idToSlot.clear();
    for (const pl of payload.players) {
      this.slots.set(pl.slot, {
        color: colorForSlot(pl.slot),
        name: pl.name,
        loadout: pl.cosmetics || {},
        id: pl.id,
        isBot: pl.isBot,
      });
      this.idToSlot.set(pl.id, pl.slot);
    }
    this.youSlot = this.idToSlot.get(payload.youId) ?? -1;

    // Reset world objects.
    this.planetLayer.removeChildren();
    this.fleetLayer.removeChildren();
    this.fxLayer.removeChildren();
    this.planets.clear();
    this.fleets.clear();
    this.effects = [];
    this.prevSnap = null;
    this.curSnap = null;
    this.clearSelection();

    for (const wp of payload.world.planets) {
      this.createPlanet(wp);
    }
    this.fitCamera();
  }

  private createPlanet(wp: WorldPlanet) {
    const container = new Container();
    container.position.set(wp.x, wp.y);

    const glow = new Graphics();
    glow.blendMode = 'add';
    const theme = new Graphics();
    const body = new Graphics();
    const selRing = new Graphics();
    const label = new Text({
      text: '0',
      style: {
        fontFamily: 'Inter, Segoe UI, Tahoma, sans-serif',
        fontSize: Math.max(14, wp.r * 0.8),
        fontWeight: '700',
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
      },
    });
    label.anchor.set(0.5);

    container.addChild(glow, theme, body, selRing, label);
    this.planetLayer.addChild(container);

    const view: PlanetView = {
      ...wp,
      container,
      glow,
      theme,
      body,
      selRing,
      label,
      ownerSlot: -1,
      targetShips: 0,
      displayShips: 0,
      renderedOwner: -99,
      renderedTheme: '',
    };
    this.planets.set(wp.id, view);
    this.redrawPlanet(view);
  }

  private redrawPlanet(p: PlanetView) {
    const color = colorForSlot(p.ownerSlot);
    const light = lighten(color, 0.5);

    p.body.clear();
    p.body.circle(0, 0, p.r).fill({ color });
    p.body.circle(-p.r * 0.3, -p.r * 0.3, p.r * 0.55).fill({ color: light, alpha: 0.35 });
    p.body.circle(0, 0, p.r).stroke({ width: 2, color: light, alpha: 0.9 });

    p.glow.clear();
    if (p.ownerSlot >= 0) {
      p.glow.circle(0, 0, p.r * 1.7).fill({ color, alpha: 0.12 });
      p.glow.circle(0, 0, p.r * 1.3).fill({ color, alpha: 0.12 });
    } else {
      p.glow.circle(0, 0, p.r * 1.3).fill({ color, alpha: 0.06 });
    }

    // Theme decoration (owned planets only).
    p.theme.clear();
    if (p.ownerSlot >= 0) {
      const info = this.slots.get(p.ownerSlot);
      const themeKind = planetTheme(info?.loadout);
      this.drawTheme(p.theme, themeKind, p.r, color, light);
    }
    p.renderedOwner = p.ownerSlot;
    p.renderedTheme = p.ownerSlot >= 0 ? planetTheme(this.slots.get(p.ownerSlot)?.loadout) : '';
  }

  private drawTheme(g: Graphics, kind: string, r: number, color: number, light: number) {
    switch (kind) {
      case 'rings':
        g.ellipse(0, 0, r * 1.9, r * 0.7).stroke({ width: 3, color: light, alpha: 0.7 });
        g.ellipse(0, 0, r * 2.3, r * 0.85).stroke({ width: 2, color, alpha: 0.5 });
        g.rotation = -0.4;
        break;
      case 'aurora':
        for (let i = 0; i < 3; i++) {
          g.circle(0, 0, r * (1.4 + i * 0.25)).stroke({
            width: 4 - i,
            color: [0x80ed99, 0x4cc9f0, 0xb5179e][i],
            alpha: 0.35,
          });
        }
        break;
      case 'blackhole':
        g.circle(0, 0, r * 1.5).stroke({ width: 5, color: 0xffd166, alpha: 0.55 });
        g.circle(0, 0, r * 0.4).fill({ color: 0x05060f, alpha: 0.9 });
        break;
      case 'halo':
      default:
        g.circle(0, 0, r * 1.35).stroke({ width: 2, color: light, alpha: 0.5 });
        break;
    }
  }

  // ---------------- Snapshots ----------------
  applySnapshot(snap: Snapshot) {
    this.prevSnap = this.curSnap;
    this.curSnap = { snap, recv: performance.now() };

    // Apply authoritative planet state immediately (owner/ship targets).
    for (const [id, ownerSlot, ships] of snap.p) {
      const p = this.planets.get(id);
      if (!p) continue;
      const ownerChanged = p.ownerSlot !== ownerSlot;
      p.ownerSlot = ownerSlot;
      p.targetShips = ships;
      if (ownerChanged) this.redrawPlanet(p);
    }

    // Sync fleet set (create/remove); positions are interpolated in tick().
    const seen = new Set<number>();
    for (const f of snap.f) {
      const [id, ownerSlot, x, y, angle100, ships] = f;
      seen.add(id);
      let fv = this.fleets.get(id);
      if (!fv) {
        fv = this.createFleet(id, ownerSlot, x, y);
      }
      fv.ownerSlot = ownerSlot;
      fv.ships = ships;
      fv.angle = angle100 / 100;
      // shift interp targets
      fv.px = fv.cx;
      fv.py = fv.cy;
      fv.cx = x;
      fv.cy = y;
    }
    for (const [id, fv] of this.fleets) {
      if (!seen.has(id)) {
        fv.container.destroy({ children: true });
        this.fleets.delete(id);
      }
    }
  }

  private createFleet(id: number, ownerSlot: number, x: number, y: number): FleetView {
    const container = new Container();
    const trail = new Graphics();
    const body = new Graphics();
    body.blendMode = 'add';
    const label = new Text({
      text: '',
      style: {
        fontFamily: 'Inter, Segoe UI, Tahoma, sans-serif',
        fontSize: 11,
        fontWeight: '700',
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 2 },
      },
    });
    label.anchor.set(0.5);
    label.position.set(0, -16);
    container.addChild(trail, body, label);
    this.fleetLayer.addChild(container);

    const fv: FleetView = {
      container,
      body,
      trail,
      label,
      ownerSlot,
      px: x,
      py: y,
      cx: x,
      cy: y,
      angle: 0,
      ships: 0,
      history: [],
    };
    this.fleets.set(id, fv);
    return fv;
  }

  private drawFleetBody(fv: FleetView) {
    const info = this.slots.get(fv.ownerSlot);
    const color = colorForSlot(fv.ownerSlot);
    const shape = shipShape(info?.loadout);
    const s = 7 + Math.min(8, Math.log2(fv.ships + 1));
    const g = fv.body;
    g.clear();
    switch (shape) {
      case 'dart':
        g.poly([s * 1.4, 0, -s, s * 0.7, -s * 0.4, 0, -s, -s * 0.7]).fill({ color });
        break;
      case 'orb':
        g.circle(0, 0, s * 0.9).fill({ color });
        g.circle(0, 0, s * 0.5).fill({ color: lighten(color, 0.6) });
        break;
      case 'crystal':
        g.poly([s, 0, 0, s * 0.8, -s, 0, 0, -s * 0.8]).fill({ color });
        g.poly([s, 0, 0, s * 0.4, -s, 0, 0, -s * 0.4]).fill({ color: lighten(color, 0.7) });
        break;
      case 'phoenix':
        g.poly([s * 1.5, 0, -s * 0.6, s, -s, 0, -s * 0.6, -s]).fill({ color });
        g.poly([s * 0.6, 0, -s * 0.6, s * 0.5, -s * 0.6, -s * 0.5]).fill({ color: 0xffd166 });
        break;
      case 'arrow':
      default:
        g.poly([s * 1.3, 0, -s, s * 0.8, -s, -s * 0.8]).fill({ color });
        break;
    }
    fv.label.text = fv.ships >= 10 ? String(fv.ships) : '';
  }

  // ---------------- Events / effects ----------------
  pushEvent(e: GameEvent) {
    const p = e.payload || {};
    if (e.type === EVENT.CAPTURE) {
      const planet = this.planets.get(p.planet);
      const x = planet ? planet.x : p.x;
      const y = planet ? planet.y : p.y;
      const slot = this.idToSlot.get(p.to) ?? -1;
      this.spawnEffect('capture', x, y, colorForSlot(slot));
      if (p.emote && EMOTE_GLYPHS[p.emote]) this.spawnEmote(x, y, EMOTE_GLYPHS[p.emote]);
    } else if (e.type === EVENT.DEFEND) {
      const planet = this.planets.get(p.planet);
      if (planet) this.spawnEffect('defend', planet.x, planet.y, 0xff4d4d);
    }
  }

  private spawnEffect(kind: 'capture' | 'defend', x: number, y: number, color: number) {
    const g = new Graphics();
    g.position.set(x, y);
    g.circle(0, 0, 10).stroke({ width: 3, color, alpha: 0.9 });
    g.blendMode = 'add';
    this.fxLayer.addChild(g);
    this.effects.push({ gfx: g, life: 0, maxLife: kind === 'capture' ? 600 : 350, kind });
  }

  private spawnEmote(x: number, y: number, glyph: string) {
    const t = new Text({
      text: glyph,
      style: { fontSize: 42, fill: 0xffffff },
    });
    t.anchor.set(0.5);
    t.position.set(x, y - 30);
    this.fxLayer.addChild(t);
    this.effects.push({ gfx: t, life: 0, maxLife: 1400, kind: 'emote', vy: -0.04 });
  }

  // ---------------- Frame update ----------------
  private tick(deltaMS: number) {
    if (this.destroyed) return;
    const now = performance.now();

    // Fleet interpolation.
    let alpha = 1;
    if (this.prevSnap && this.curSnap) {
      const span = this.curSnap.recv - this.prevSnap.recv || 1;
      alpha = (now - INTERP_DELAY - this.prevSnap.recv) / span;
      alpha = Math.max(0, Math.min(1, alpha));
    }
    for (const fv of this.fleets.values()) {
      const x = fv.px + (fv.cx - fv.px) * alpha;
      const y = fv.py + (fv.cy - fv.py) * alpha;
      fv.container.position.set(x, y);
      fv.body.rotation = fv.angle;
      this.drawFleetBody(fv);
      this.updateTrail(fv, x, y);
    }

    // Planet ship counters ease toward target; selection pulse.
    const pulse = 0.5 + 0.5 * Math.sin(now / 250);
    for (const p of this.planets.values()) {
      const diff = p.targetShips - p.displayShips;
      p.displayShips += diff * Math.min(1, deltaMS / 120);
      if (Math.abs(diff) < 0.5) p.displayShips = p.targetShips;
      const shown = Math.round(p.displayShips);
      if (p.label.text !== String(shown)) p.label.text = String(shown);

      p.selRing.clear();
      if (this.selected === p.id) {
        p.selRing.circle(0, 0, p.r + 8 + pulse * 4).stroke({
          width: 3,
          color: 0xffffff,
          alpha: 0.4 + pulse * 0.5,
        });
      }
    }

    // Effects.
    this.effects = this.effects.filter((fx) => {
      fx.life += deltaMS;
      const k = fx.life / fx.maxLife;
      if (k >= 1) {
        fx.gfx.destroy({ children: true });
        return false;
      }
      if (fx.kind === 'emote') {
        fx.gfx.position.y += (fx.vy || 0) * deltaMS;
        fx.gfx.alpha = 1 - k;
      } else {
        const g = fx.gfx as Graphics;
        g.clear();
        const r = 10 + k * (fx.kind === 'capture' ? 70 : 35);
        g.circle(0, 0, r).stroke({ width: 3 * (1 - k), color: 0xffffff, alpha: (1 - k) * 0.9 });
      }
      return true;
    });
  }

  private updateTrail(fv: FleetView, x: number, y: number) {
    const info = this.slots.get(fv.ownerSlot);
    const kind = trailKind(info?.loadout);
    if (kind === 'none') {
      fv.trail.clear();
      return;
    }
    fv.history.push({ x: x - fv.container.x, y: y - fv.container.y });
    // store relative-to-container so we can draw in container space
    if (fv.history.length > 10) fv.history.shift();
    const g = fv.trail;
    g.clear();
    g.blendMode = 'add';
    const color = colorForSlot(fv.ownerSlot);
    for (let i = 1; i < fv.history.length; i++) {
      const a = (i / fv.history.length) * 0.5;
      let c = color;
      if (kind === 'rainbow') c = [0xf72585, 0xffd166, 0x4cc9f0, 0x80ed99][i % 4];
      if (kind === 'ember') c = i % 2 ? 0xff7b00 : 0xffd166;
      g.moveTo(fv.history[i - 1].x, fv.history[i - 1].y)
        .lineTo(fv.history[i].x, fv.history[i].y)
        .stroke({ width: 3 * a + 1, color: c, alpha: a });
    }
  }

  destroy() {
    this.destroyed = true;
    this.detachInput();
    window.removeEventListener('resize', this.onResize);
    this.app.ticker.remove(this.boundTick);
    this.app.destroy(true, { children: true });
  }
}
