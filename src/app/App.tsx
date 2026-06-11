import { animate } from "animejs";
import type { Entity, World } from "koota";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type AudioDebugState,
  createToneAudioEngine,
  type ToneAudioEngine,
} from "../audio/toneEngine";
import ui from "../config/ui.json";
import { classes, engine } from "../lib/config";
import { getCharacter, getDialogueBank, getMap, getProp, getShop } from "../lib/content/registry";
import type { DialogueNode, MapDef } from "../lib/content/types";
import {
  getSaveRepository,
  type SaveRepository,
  type SaveSlotSummary,
} from "../persistence/saveRepository";
import {
  DEFAULT_SETTINGS,
  type GameSettings,
  loadSettings,
  saveSettings,
} from "../persistence/settings";
import {
  classifyDeviceProfile,
  type DeviceProfile,
  readViewport,
  resolveDeviceProfile,
} from "../platform/deviceProfile";
import { GameStage } from "../render/GameStage";
import {
  emitDialogueChoice,
  emitDialogueSeen,
  resolveDialogue,
  resolveDialogueSlot,
} from "../sim/dialogue";
import { pushEvent } from "../sim/events";
import { createGameWorld, instantiateMap } from "../sim/factories";
import { applyEffects, autoStartQuests, questLogLines } from "../sim/quests";
import { buyShopListing, type ShopTransactionResult, sellShopListing } from "../sim/shop";
import { playerAbility, playerAttack } from "../sim/systems/combat";
import { SIM_DT, step } from "../sim/tick";
import {
  AimDirection,
  Facing,
  FlagState,
  Health,
  Interactable,
  Inventory,
  IsEnemy,
  IsNpc,
  IsPlayer,
  Level,
  MapRuntime,
  MoveIntent,
  Outbox,
  PlayerGold,
  Projectile,
  PropRef,
  QuestLog,
  Transform,
} from "../sim/traits";
import "./App.css";

type Mode = "landing" | "title" | "playing" | "victory" | "gameover";
type Direction = "up" | "down" | "left" | "right";

interface DialogueState {
  bankId: string;
  nodeKey: string;
  node: DialogueNode;
  speaker: string;
  lines: string[];
}

interface ReadablePropHit {
  entity: Entity;
  interaction: {
    verb: string;
    once: boolean;
    used: boolean;
    sfx: string;
    dialogueBank: string;
    dialogueSlot: string;
  };
}

interface UiSnapshot {
  mapId: string;
  mapName: string;
  classId: string;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  nextXp: number;
  gold: number;
  inventory: Record<string, number>;
  playerX: number;
  playerY: number;
  enemies: number;
  projectiles: number;
  questLines: string[];
  runtime: {
    cols: number;
    rows: number;
    grid: string[][];
  };
  explored: Set<string>;
}

interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

function emptyInput(): InputState {
  return { up: false, down: false, left: false, right: false };
}

interface StartOptions {
  classId?: string;
  mapId?: string;
  spawnId?: string;
  playerX?: number;
  playerY?: number;
  level?: number;
  hp?: number;
  maxHp?: number;
  gold?: number;
  inventory?: Record<string, number>;
}

interface ShopState {
  shopId: string;
  selectedIndex: number;
  message: string;
}

const EMPTY_SNAPSHOT: UiSnapshot = {
  mapId: "",
  mapName: "",
  classId: "knight",
  hp: 0,
  maxHp: 1,
  level: 1,
  xp: 0,
  nextXp: 1,
  gold: 0,
  inventory: {},
  playerX: 0,
  playerY: 0,
  enemies: 0,
  projectiles: 0,
  questLines: [],
  runtime: { cols: 0, rows: 0, grid: [] },
  explored: new Set(),
};

const keyMap: Record<string, Direction | "a" | "b" | "pause" | undefined> = {};
const AUTO_SAVE_INTERVAL_MS = ui.persistence.autosaveIntervalMs;
for (const key of ui.controls.keyboard.up) keyMap[key] = "up";
for (const key of ui.controls.keyboard.down) keyMap[key] = "down";
for (const key of ui.controls.keyboard.left) keyMap[key] = "left";
for (const key of ui.controls.keyboard.right) keyMap[key] = "right";
for (const key of ui.controls.keyboard.actionA) keyMap[key] = "a";
for (const key of ui.controls.keyboard.actionB) keyMap[key] = "b";
keyMap.Escape = "pause";
keyMap.p = "pause";

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function directionVector(input: InputState) {
  return {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0),
  };
}

function playerOf(world: World): Entity | undefined {
  return world.queryFirst(IsPlayer);
}

function interpolateLine(world: World, line: string): string {
  return line.replace(/\{([^}]+)\}/g, (_, token: string) => {
    const [questId, counter] = token.split(".");
    if (questId && counter) {
      return String(world.get(QuestLog)?.active[questId]?.counters[counter] ?? 0);
    }
    return token;
  });
}

function cleanInventory(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, number> = {};
  for (const [itemId, value] of Object.entries(input)) {
    if (!itemId.startsWith("item:")) continue;
    const count = Number(value);
    if (Number.isFinite(count) && count > 0) out[itemId] = Math.floor(count);
  }
  return out;
}

function parseSavedSnapshot(json: string): Pick<StartOptions, "gold" | "inventory"> {
  try {
    const parsed = JSON.parse(json) as { gold?: unknown; inventory?: unknown };
    return {
      gold: Number.isFinite(Number(parsed.gold)) ? Number(parsed.gold) : undefined,
      inventory: cleanInventory(parsed.inventory),
    };
  } catch {
    return {};
  }
}

function dialogueFromResolved(
  world: World,
  resolved: ReturnType<typeof resolveDialogue> | ReturnType<typeof resolveDialogueSlot>,
): DialogueState {
  const bank = getDialogueBank(resolved.bankId);
  const speaker = getCharacter(bank.speaker).name;
  return {
    bankId: resolved.bankId,
    nodeKey: resolved.nodeKey,
    node: resolved.node,
    speaker,
    lines: resolved.node.lines.map((line) => interpolateLine(world, line)),
  };
}

function openMapIntro(world: World, mapId: string, seen: Set<string>): DialogueState | null {
  const map = getMap(mapId);
  for (const entry of map.onEnter ?? []) {
    const key = `${mapId}:${entry.dialogue}:${entry.slot}`;
    if (entry.once && seen.has(key)) continue;
    seen.add(key);
    return dialogueFromResolved(world, resolveDialogueSlot(entry.dialogue, entry.slot));
  }
  return null;
}

function updateExplored(snapshot: UiSnapshot, exploredByMap: Map<string, Set<string>>) {
  if (!snapshot.mapId || snapshot.runtime.cols === 0) return snapshot.explored;
  let explored = exploredByMap.get(snapshot.mapId);
  if (!explored) {
    explored = new Set();
    exploredByMap.set(snapshot.mapId, explored);
  }
  const tileX = Math.floor(snapshot.playerX / engine.tileSize);
  const tileY = Math.floor(snapshot.playerY / engine.tileSize);
  for (let y = tileY - 5; y <= tileY + 5; y++) {
    for (let x = tileX - 5; x <= tileX + 5; x++) {
      if (x >= 0 && y >= 0 && x < snapshot.runtime.cols && y < snapshot.runtime.rows) {
        explored.add(`${x},${y}`);
      }
    }
  }
  return new Set(explored);
}

function readSnapshot(world: World, exploredByMap: Map<string, Set<string>>): UiSnapshot {
  const runtime = world.get(MapRuntime);
  const player = playerOf(world);
  const playerTag = player?.get(IsPlayer);
  const health = player?.get(Health);
  const level = player?.get(Level);
  const gold = player?.get(PlayerGold);
  const inventory = player?.get(Inventory);
  const transform = player?.get(Transform);
  const mapId = runtime?.mapId ?? "";
  const base: UiSnapshot = {
    mapId,
    mapName: mapId ? getMap(mapId).name : "",
    classId: playerTag?.classId ?? "knight",
    hp: health?.hp ?? 0,
    maxHp: health?.maxHp ?? 1,
    level: level?.level ?? 1,
    xp: level?.xp ?? 0,
    nextXp: level?.nextXp ?? 1,
    gold: gold?.value ?? 0,
    inventory: { ...(inventory?.items ?? {}) },
    playerX: transform?.x ?? 0,
    playerY: transform?.y ?? 0,
    enemies: [...world.query(IsEnemy)].length,
    projectiles: [...world.query(Projectile)].length,
    questLines: questLogLines(world),
    runtime: {
      cols: runtime?.cols ?? 0,
      rows: runtime?.rows ?? 0,
      grid: runtime?.grid ?? [],
    },
    explored: new Set(),
  };
  base.explored = updateExplored(base, exploredByMap);
  return base;
}

function saveRowFromSnapshot(current: UiSnapshot) {
  return {
    id: 1,
    classId: current.classId,
    mapId: current.mapId,
    playerX: Math.round(current.playerX),
    playerY: Math.round(current.playerY),
    level: current.level,
    hp: Math.max(0, Math.ceil(current.hp)),
    maxHp: current.maxHp,
    questSummary: current.questLines[0] ?? "The road begins.",
    snapshotJson: JSON.stringify({
      classId: current.classId,
      mapId: current.mapId,
      playerX: current.playerX,
      playerY: current.playerY,
      gold: current.gold,
      inventory: current.inventory,
      questLines: current.questLines,
    }),
    updatedAt: new Date(),
  };
}

function nearestDialogue(world: World): DialogueState | null {
  const player = playerOf(world);
  const pt = player?.get(Transform);
  if (!pt) return null;
  let best: { entity: Entity; dist: number } | null = null;
  for (const entity of world.query(IsNpc, Transform)) {
    const npc = entity.get(IsNpc);
    const t = entity.get(Transform);
    if (!npc || !t) continue;
    const dialogue = getCharacter(npc.charId).dialogue;
    if (!dialogue) continue;
    const dist = Math.hypot(t.x - pt.x, t.y - pt.y);
    if (dist < 34 && (!best || dist < best.dist)) best = { entity, dist };
  }
  if (!best) return null;
  const npc = best.entity.get(IsNpc);
  if (!npc) return null;
  return dialogueFromResolved(
    world,
    resolveDialogue(world, getCharacter(npc.charId).dialogue as string),
  );
}

function nearestReadableProp(world: World): ReadablePropHit | null {
  const player = playerOf(world);
  const pt = player?.get(Transform);
  if (!pt) return null;
  let best: (ReadablePropHit & { dist: number }) | null = null;
  for (const entity of world.query(PropRef, Interactable, Transform)) {
    const propRef = entity.get(PropRef);
    const interaction = entity.get(Interactable);
    const t = entity.get(Transform);
    if (!propRef || !interaction || !t) continue;
    if (!interaction.dialogueBank || !interaction.dialogueSlot) continue;
    if (interaction.once && interaction.used) continue;
    const prop = getProp(propRef.propId);
    if (!prop.interaction?.dialogue) continue;
    const dist = Math.hypot(t.x - pt.x, t.y - pt.y);
    if (dist < 34 && (!best || dist < best.dist)) best = { entity, interaction, dist };
  }
  return best;
}

function aimAtNearestEnemy(world: World, maxDistance = 340) {
  const player = playerOf(world);
  const pt = player?.get(Transform);
  if (!player || !pt) return;
  let best: { dx: number; dy: number; dist: number } | null = null;
  for (const enemy of world.query(IsEnemy, Transform)) {
    const et = enemy.get(Transform);
    if (!et) continue;
    const dx = et.x - pt.x;
    const dy = et.y - pt.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= maxDistance && (!best || dist < best.dist)) best = { dx, dy, dist };
  }
  if (!best) return;
  player.set(AimDirection, { x: best.dx, y: best.dy });
  if (best.dx !== 0) player.set(Facing, { dir: best.dx > 0 ? 1 : -1 });
}

function applyInputToWorld(world: World, input: InputState) {
  const player = playerOf(world);
  if (!player) return;
  const intent = directionVector(input);
  player.set(MoveIntent, intent);
  if (intent.x !== 0 || intent.y !== 0) player.set(AimDirection, intent);
}

function insideZone(map: MapDef, x: number, y: number, triggerId: string): boolean {
  const trigger = map.triggers?.find((entry) => entry.id === triggerId);
  const zone = trigger?.zone;
  return !!zone && x >= zone.x0 && x <= zone.x1 && y >= zone.y0 && y <= zone.y1;
}

function handleZoneTriggers(world: World, entered: Set<string>) {
  const runtime = world.get(MapRuntime);
  const player = playerOf(world);
  const pt = player?.get(Transform);
  if (!runtime || !pt || !runtime.mapId) return;
  const map = getMap(runtime.mapId);
  const flags = world.get(FlagState)?.values ?? {};
  for (const trigger of map.triggers ?? []) {
    if (!trigger.zone) continue;
    if (trigger.requiresFlag && !flags[trigger.requiresFlag]) continue;
    if (!insideZone(map, pt.x, pt.y, trigger.id)) continue;
    const key = `${runtime.mapId}:${trigger.id}`;
    if (entered.has(key)) continue;
    entered.add(key);
    pushEvent(world, { type: "zone:entered", mapId: runtime.mapId, triggerId: trigger.id });
    step(world, 0);
    if (trigger.kind === "portal" && trigger.toMap) {
      const outbox = world.get(Outbox);
      if (outbox) {
        outbox.mapLoad = { mapId: trigger.toMap, spawnId: trigger.toSpawn };
        if (trigger.sfx) outbox.sfx.push(trigger.sfx);
      }
    } else {
      applyEffects(world, trigger.effects ?? []);
    }
  }
}

function usePanelEntrance(signature: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    panel.dataset.motionSignature = signature;
    const animation = animate(panel, {
      opacity: [0, 1],
      translateY: [10, 0],
      scale: [0.985, 1],
      duration: 220,
      ease: "outSine",
    });
    return () => {
      animation.cancel();
    };
  }, [signature]);
  return ref;
}

function TitleScreen({
  selected,
  onSelect,
  onStart,
}: {
  selected: string;
  onSelect: (classId: string) => void;
  onStart: () => void;
}) {
  const panelRef = usePanelEntrance("title");
  return (
    <section className="title-screen" data-testid="title-screen">
      <div className="title-panel" data-testid="title-panel" ref={panelRef}>
        <h1>A GOOD OLD FASHIONED ADVENTURE</h1>
        <p className="dialogue-line">Choose your class. Press A to begin.</p>
        <div className="class-row">
          {classes.roster.map((classId) => (
            <button
              className="class-button"
              data-testid={`class-${classId}`}
              type="button"
              key={classId}
              aria-pressed={selected === classId}
              onClick={() => onSelect(classId)}
            >
              {classId.toUpperCase()}
            </button>
          ))}
        </div>
        <button className="menu-button" data-testid="start-button" type="button" onClick={onStart}>
          A START
        </button>
      </div>
    </section>
  );
}

function LandingScreen({
  latestSave,
  settings,
  settingsOpen,
  onNewGame,
  onContinue,
  onToggleSettings,
  onToggleMute,
}: {
  latestSave: SaveSlotSummary | null;
  settings: GameSettings;
  settingsOpen: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onToggleSettings: () => void;
  onToggleMute: () => void;
}) {
  const panelRef = usePanelEntrance("landing");
  return (
    <section className="landing-screen" data-testid="landing-screen">
      <div className="storybook-sky" />
      <div className="pixel-vines" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="landing-scroll" data-testid="landing-scroll" ref={panelRef}>
        <p className="manuscript-kicker">Here begins</p>
        <h1>A Good Old-Fashioned Adventure</h1>
        <p className="landing-copy">
          A morning-gold tale of errant roads, broken bridges, and brave little vows.
        </p>
        <div className="landing-actions">
          <button
            className="menu-button"
            data-testid="new-game-button"
            type="button"
            onClick={onNewGame}
          >
            New Game
          </button>
          <button
            className="menu-button"
            data-testid="continue-button"
            type="button"
            disabled={!latestSave}
            onClick={onContinue}
          >
            Continue
          </button>
          <button
            className="menu-button"
            data-testid="settings-button"
            type="button"
            onClick={onToggleSettings}
          >
            Settings
          </button>
        </div>
        {latestSave && (
          <p className="save-line" data-testid="save-line">
            {latestSave.classId} on {latestSave.mapId.replace("map:", "")}, LV {latestSave.level}
          </p>
        )}
        {settingsOpen && (
          <div className="landing-settings" data-testid="settings-panel">
            <button
              className="menu-button compact"
              data-testid="landing-mute-toggle"
              type="button"
              onClick={onToggleMute}
            >
              {settings.muted ? "Sound: Muted" : "Sound: On"}
            </button>
            <p>Tiny text, steady pace, no glowing glass.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Hud({
  snapshot,
  audio,
  panelOpen,
  paused,
  muted,
  onTogglePanel,
  onTogglePause,
  onToggleMute,
  onRetire,
}: {
  snapshot: UiSnapshot;
  audio: AudioDebugState;
  panelOpen: boolean;
  paused: boolean;
  muted: boolean;
  onTogglePanel: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onRetire: () => void;
}) {
  const hpPercent = Math.max(0, Math.round((snapshot.hp / snapshot.maxHp) * 100));
  return (
    <div className="hud" data-testid="hud">
      <header className="top-hud" data-testid="top-hud">
        <strong>{snapshot.classId.toUpperCase()}</strong>
        <span>LV {snapshot.level}</span>
        <span>HP {hpPercent}%</span>
        <meter
          className="meter hp-meter wide-meter"
          aria-label="HP"
          min={0}
          max={snapshot.maxHp}
          value={Math.max(0, snapshot.hp)}
        />
        <meter
          className="meter xp-meter wide-meter"
          aria-label="XP"
          min={0}
          max={snapshot.nextXp}
          value={snapshot.xp}
        />
        <span>G {snapshot.gold}</span>
        <span className="map-token">{snapshot.mapName}</span>
        <button
          className="hud-menu"
          data-testid="hud-menu"
          type="button"
          aria-expanded={panelOpen}
          aria-controls="side-panel"
          onClick={onTogglePanel}
        >
          ☰
        </button>
      </header>
      <aside
        id="side-panel"
        className={`side-panel ${panelOpen ? "open" : ""}`}
        data-testid="side-panel"
      >
        <section className="quest-panel" data-testid="quest-log">
          <h2>QUEST</h2>
          {snapshot.questLines.length ? (
            snapshot.questLines.map((line) => <p key={line}>{line}</p>)
          ) : (
            <p>The road is quiet.</p>
          )}
        </section>
        <Minimap snapshot={snapshot} />
        <p className="audio-state" data-testid="audio-state">
          {audio.label} {audio.ready ? "ready" : "idle"} {audio.theme} {muted ? "muted" : "sound"}
        </p>
        <div className="menu-controls" data-testid="menu-controls">
          <button
            className="menu-button compact"
            data-testid="pause-toggle"
            type="button"
            onClick={onTogglePause}
          >
            {paused ? "RESUME" : "PAUSE"}
          </button>
          <button
            className="menu-button compact"
            data-testid="mute-toggle"
            type="button"
            aria-pressed={muted}
            onClick={onToggleMute}
          >
            {muted ? "UNMUTE" : "MUTE"}
          </button>
          <button
            className="menu-button compact danger"
            data-testid="retire-run"
            type="button"
            onClick={onRetire}
          >
            RETIRE RUN
          </button>
        </div>
      </aside>
    </div>
  );
}

function Minimap({ snapshot }: { snapshot: UiSnapshot }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!snapshot.runtime.cols || !snapshot.runtime.rows) return;
    const sx = canvas.width / snapshot.runtime.cols;
    const sy = canvas.height / snapshot.runtime.rows;
    const colors: Record<string, string> = {
      "tile:grass": ui.theme.accentGreen,
      "tile:path": "#cfa153",
      "tile:leaf-litter": "#2c6114",
      "tile:water": ui.theme.accentBlue,
      "tile:mountain": ui.theme.textMuted,
      "tile:sand": ui.theme.accentGold,
      "tile:castle-road": "#4b526d",
      "tile:wood-bridge": "#a66a2c",
      "tile:stone-floor": ui.theme.textMuted,
      "tile:shop-floor": "#946629",
      "tile:ruin-floor": "#8f7657",
      "tile:ruin-mosaic": "#8a6d3f",
      "tile:village-cobble": "#cfa153",
      "tile:stone-wall": ui.theme.shell,
      "tile:prison-bars": ui.theme.panelBorder,
    };
    for (let y = 0; y < snapshot.runtime.rows; y++) {
      for (let x = 0; x < snapshot.runtime.cols; x++) {
        const explored = snapshot.explored.has(`${x},${y}`);
        ctx.fillStyle = explored
          ? (colors[snapshot.runtime.grid[y][x]] ?? ui.theme.textBody)
          : ui.theme.background;
        ctx.fillRect(Math.floor(x * sx), Math.floor(y * sy), Math.ceil(sx), Math.ceil(sy));
      }
    }
    ctx.fillStyle = ui.theme.accentRed;
    ctx.fillRect(
      Math.floor((snapshot.playerX / engine.tileSize) * sx) - 2,
      Math.floor((snapshot.playerY / engine.tileSize) * sy) - 2,
      4,
      4,
    );
    ctx.fillStyle = ui.theme.accentGold;
    ctx.fillRect(canvas.width - 10, 4, 5, 5);
  }, [snapshot]);
  return (
    <div className="minimap-wrap">
      <canvas
        ref={canvasRef}
        className="minimap"
        data-testid="minimap"
        width={168}
        height={92}
        aria-label="Explored minimap"
      />
    </div>
  );
}

function DialogueBox({ dialogue, onAdvance }: { dialogue: DialogueState; onAdvance: () => void }) {
  return (
    <section className="dialogue-box" data-testid="dialogue-box">
      <div className="dialogue-speaker">{dialogue.speaker}</div>
      {dialogue.lines.map((line) => (
        <p className="dialogue-line" key={line}>
          {line}
        </p>
      ))}
      <div className="choice-row">
        <button className="menu-button" type="button" onClick={onAdvance}>
          {dialogue.node.choices?.[0]?.text ?? "A CONTINUE"}
        </button>
      </div>
    </section>
  );
}

function ShopPanel({
  shopState,
  snapshot,
  onBuy,
  onSell,
  onClose,
}: {
  shopState: ShopState;
  snapshot: UiSnapshot;
  onBuy: () => void;
  onSell: () => void;
  onClose: () => void;
}) {
  const shop = getShop(shopState.shopId);
  const keeper = getCharacter(shop.keeper).name;
  const selectedIndex = Math.min(shopState.selectedIndex, shop.listings.length - 1);
  return (
    <section className="shop-panel" data-testid="shop-panel">
      <header className="shop-header">
        <div>
          <p className="manuscript-kicker">{keeper}</p>
          <h2>{shop.name}</h2>
        </div>
        <button className="shop-close" data-testid="shop-close" type="button" onClick={onClose}>
          x
        </button>
      </header>
      <div className="shop-list" role="listbox" aria-label={shop.name}>
        {shop.listings.map((listing, index) => {
          const owned = snapshot.inventory[listing.item] ?? 0;
          return (
            <div
              className="shop-row"
              data-testid={`shop-row-${listing.id}`}
              aria-selected={selectedIndex === index}
              key={listing.id}
              role="option"
              tabIndex={selectedIndex === index ? 0 : -1}
            >
              <div>
                <strong>{listing.label}</strong>
                <p>{listing.description}</p>
              </div>
              <div className="shop-prices">
                <span>Buy {listing.buyPrice}g</span>
                <span>Sell {listing.sellPrice}g</span>
                <span data-testid={`shop-inventory-${listing.item}`}>x{owned}</span>
              </div>
            </div>
          );
        })}
      </div>
      <footer className="shop-footer">
        <button
          className="menu-button compact"
          data-testid="shop-buy"
          type="button"
          onClick={onBuy}
        >
          A Buy
        </button>
        <button
          className="menu-button compact"
          data-testid="shop-sell"
          type="button"
          onClick={onSell}
        >
          B Sell
        </button>
        <p className="shop-status" data-testid="shop-status">
          {shopState.message || `${snapshot.gold} gold in purse.`}
        </p>
      </footer>
    </section>
  );
}

function VirtualPad({
  setDirection,
  pressA,
  setB,
}: {
  setDirection: (dir: Direction, pressed: boolean) => void;
  pressA: () => void;
  setB: (pressed: boolean) => void;
}) {
  const bindDir = (dir: Direction) => ({
    onPointerDown: () => setDirection(dir, true),
    onPointerUp: () => setDirection(dir, false),
    onPointerCancel: () => setDirection(dir, false),
    onPointerLeave: () => setDirection(dir, false),
  });
  return (
    <div className="virtual-pad" data-testid="virtual-pad">
      <div className="dpad">
        <button className="pad-button pad-up" data-testid="pad-up" type="button" {...bindDir("up")}>
          ↑
        </button>
        <button
          className="pad-button pad-left"
          data-testid="pad-left"
          type="button"
          {...bindDir("left")}
        >
          ←
        </button>
        <button
          className="pad-button pad-right"
          data-testid="pad-right"
          type="button"
          {...bindDir("right")}
        >
          →
        </button>
        <button
          className="pad-button pad-down"
          data-testid="pad-down"
          type="button"
          {...bindDir("down")}
        >
          ↓
        </button>
      </div>
      <div className="face-buttons">
        <button
          className="face-button secondary"
          data-testid="button-b"
          type="button"
          onPointerDown={() => setB(true)}
          onPointerUp={() => setB(false)}
          onPointerCancel={() => setB(false)}
          onPointerLeave={() => setB(false)}
        >
          B
        </button>
        <button className="face-button" data-testid="button-a" type="button" onClick={pressA}>
          A
        </button>
      </div>
    </div>
  );
}

export function App({
  saveRepository = getSaveRepository(),
}: {
  saveRepository?: SaveRepository;
} = {}) {
  const repositoryRef = useRef(saveRepository);
  const [mode, setMode] = useState<Mode>("landing");
  const [selectedClass, setSelectedClass] = useState("knight");
  const [latestSave, setLatestSave] = useState<SaveSlotSummary | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [world, setWorld] = useState<World | null>(null);
  const [snapshot, setSnapshot] = useState<UiSnapshot>(EMPTY_SNAPSHOT);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [shopState, setShopState] = useState<ShopState | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(DEFAULT_SETTINGS.muted);
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile>(() =>
    classifyDeviceProfile({ platform: "web", model: "browser" }, readViewport()),
  );
  const pausePanelRef = usePanelEntrance(paused && mode === "playing" ? "pause-open" : "pause");
  const endPanelRef = usePanelEntrance(mode === "victory" || mode === "gameover" ? mode : "end");
  const [audioDebug, setAudioDebug] = useState<AudioDebugState>({
    label: "Tone",
    ready: false,
    muted: false,
    theme: "",
    sfxPlayed: 0,
  });
  const inputRef = useRef<InputState>(emptyInput());
  const snapshotRef = useRef<UiSnapshot>(EMPTY_SNAPSHOT);
  const audioRef = useRef<ToneAudioEngine | null>(null);
  const mapIntroSeenRef = useRef(new Set<string>());
  const zoneEnteredRef = useRef(new Set<string>());
  const exploredRef = useRef(new Map<string, Set<string>>());

  useEffect(() => {
    audioRef.current = createToneAudioEngine();
    setAudioDebug(audioRef.current.debugState());
    return () => audioRef.current?.dispose();
  }, []);

  useEffect(() => {
    let active = true;
    void resolveDeviceProfile().then((profile) => {
      if (active) setDeviceProfile(profile);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([loadSettings(), repositoryRef.current.latestSlot()])
      .then(([loadedSettings, slot]) => {
        if (!active) return;
        setSettings(loadedSettings);
        setMuted(loadedSettings.muted);
        setLatestSave(slot);
      })
      .catch(() => {
        if (active) setLatestSave(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(muted);
    const audio = audioRef.current;
    if (audio) setAudioDebug(audio.debugState());
    setSettings((current) => {
      if (current.muted === muted) return current;
      const next = { ...current, muted };
      void saveSettings(next);
      return next;
    });
  }, [muted]);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const persistSave = useCallback((current: UiSnapshot) => {
    if (!current.mapId) return;
    const row = saveRowFromSnapshot(current);
    void repositoryRef.current
      .upsertSlot(row)
      .then(() => {
        setLatestSave({
          id: row.id,
          classId: row.classId,
          mapId: row.mapId,
          playerX: row.playerX,
          playerY: row.playerY,
          level: row.level,
          hp: row.hp,
          maxHp: row.maxHp,
          questSummary: row.questSummary,
          snapshotJson: row.snapshotJson,
          updatedAt: row.updatedAt.getTime(),
        });
      })
      .catch(() => {
        // App saves are opportunistic and may finish after a browser/HMR teardown closes SQLite.
      });
  }, []);

  const refreshSnapshot = useCallback(
    (nextWorld: World, options: { persist?: boolean } = {}) => {
      const nextSnapshot = readSnapshot(nextWorld, exploredRef.current);
      snapshotRef.current = nextSnapshot;
      setSnapshot(nextSnapshot);
      const audio = audioRef.current;
      if (audio) setAudioDebug(audio.debugState());
      if (options.persist) persistSave(nextSnapshot);
    },
    [persistSave],
  );

  const loadMap = useCallback(
    (nextWorld: World, mapId: string, classId: string, spawnId?: string) => {
      inputRef.current = emptyInput();
      setShopState(null);
      instantiateMap(nextWorld, mapId, { classId, spawnId });
      zoneEnteredRef.current.clear();
      audioRef.current?.setTheme(getMap(mapId).bgmTheme);
      pushEvent(nextWorld, { type: "map:entered", mapId });
      step(nextWorld, 0);
      const intro = openMapIntro(nextWorld, mapId, mapIntroSeenRef.current);
      if (intro) setDialogue(intro);
      refreshSnapshot(nextWorld, { persist: true });
    },
    [refreshSnapshot],
  );

  const startGame = useCallback(
    (options: StartOptions = {}) => {
      const classId = options.classId ?? selectedClass;
      const mapId = options.mapId ?? "map:village";
      const nextWorld = createGameWorld(19);
      autoStartQuests(nextWorld);
      setWorld(nextWorld);
      setMode("playing");
      setPaused(false);
      setPanelOpen(false);
      setShopState(null);
      void audioRef.current?.resumeFromGesture().then(() => {
        audioRef.current?.setTheme(getMap(mapId).bgmTheme);
        setAudioDebug(audioRef.current?.debugState() ?? audioDebug);
      });
      loadMap(nextWorld, mapId, classId, options.spawnId);
      const player = playerOf(nextWorld);
      if (player && options.playerX !== undefined && options.playerY !== undefined) {
        player.set(Transform, { x: options.playerX, y: options.playerY });
      }
      if (player && options.hp !== undefined && options.maxHp !== undefined) {
        player.set(Health, { hp: options.hp, maxHp: options.maxHp });
      }
      if (player && options.level !== undefined) {
        const currentLevel = player.get(Level);
        player.set(Level, {
          level: options.level,
          xp: currentLevel?.xp ?? 0,
          nextXp: currentLevel?.nextXp ?? 50,
        });
      }
      if (player && options.gold !== undefined) {
        player.set(PlayerGold, { value: options.gold });
      }
      if (player && options.inventory !== undefined) {
        player.set(Inventory, { items: options.inventory });
      }
      refreshSnapshot(nextWorld, { persist: true });
    },
    [audioDebug, loadMap, refreshSnapshot, selectedClass],
  );

  const continueGame = useCallback(() => {
    if (!latestSave) return;
    const saved = parseSavedSnapshot(latestSave.snapshotJson);
    startGame({
      classId: latestSave.classId,
      mapId: latestSave.mapId,
      playerX: latestSave.playerX,
      playerY: latestSave.playerY,
      level: latestSave.level,
      hp: latestSave.hp,
      maxHp: latestSave.maxHp,
      gold: saved.gold,
      inventory: saved.inventory,
    });
  }, [latestSave, startGame]);

  const resumeGame = useCallback(() => {
    inputRef.current = emptyInput();
    setPaused(false);
    setPanelOpen(false);
    setShopState(null);
  }, []);

  const togglePause = useCallback(() => {
    if (mode !== "playing") return;
    setPanelOpen(false);
    setShopState(null);
    inputRef.current = emptyInput();
    setPaused((value) => !value);
  }, [mode]);

  const retireRun = useCallback(() => {
    setPanelOpen(false);
    setShopState(null);
    setPaused(false);
    setMode("gameover");
  }, []);

  const clearOutbox = useCallback(
    (activeWorld: World) => {
      const outbox = activeWorld.get(Outbox);
      if (!outbox) return;
      const sfx = [...outbox.sfx];
      const requestedDialogue = outbox.dialogue;
      const requestedMap = outbox.mapLoad;
      const endGame = outbox.endGame;
      activeWorld.set(Outbox, { sfx: [], dialogue: null, mapLoad: null, endGame: null });
      for (const id of sfx) audioRef.current?.playSfx(id);
      if (requestedDialogue) {
        setDialogue(
          dialogueFromResolved(
            activeWorld,
            resolveDialogueSlot(requestedDialogue.bank, requestedDialogue.slot ?? "default"),
          ),
        );
      }
      if (requestedMap) {
        const classId = playerOf(activeWorld)?.get(IsPlayer)?.classId ?? selectedClass;
        loadMap(activeWorld, requestedMap.mapId, classId, requestedMap.spawnId);
      }
      if (endGame) {
        setPanelOpen(false);
        setPaused(false);
        setMode(endGame);
      }
      refreshSnapshot(activeWorld);
    },
    [loadMap, refreshSnapshot, selectedClass],
  );

  const updateShopFromResult = useCallback((result: ShopTransactionResult) => {
    setShopState((current) =>
      current
        ? {
            ...current,
            message: result.ok ? `${result.message} ${result.gold} gold left.` : result.message,
          }
        : current,
    );
  }, []);

  const selectedShopListing = useCallback(() => {
    if (!shopState) return null;
    const shop = getShop(shopState.shopId);
    const index = Math.min(shopState.selectedIndex, shop.listings.length - 1);
    const listing = shop.listings[index];
    return listing ? { shopId: shop.id, listingId: listing.id } : null;
  }, [shopState]);

  const handleShopBuy = useCallback(() => {
    if (!world) return;
    const selected = selectedShopListing();
    if (!selected) return;
    const result = buyShopListing(world, selected.shopId, selected.listingId);
    updateShopFromResult(result);
    clearOutbox(world);
    refreshSnapshot(world, { persist: true });
  }, [clearOutbox, refreshSnapshot, selectedShopListing, updateShopFromResult, world]);

  const handleShopSell = useCallback(() => {
    if (!world) return;
    const selected = selectedShopListing();
    if (!selected) return;
    const result = sellShopListing(world, selected.shopId, selected.listingId);
    updateShopFromResult(result);
    clearOutbox(world);
    refreshSnapshot(world, { persist: true });
  }, [clearOutbox, refreshSnapshot, selectedShopListing, updateShopFromResult, world]);

  const moveShopSelection = useCallback((delta: number) => {
    setShopState((current) => {
      if (!current) return current;
      const count = getShop(current.shopId).listings.length;
      return {
        ...current,
        selectedIndex: (current.selectedIndex + delta + count) % count,
        message: current.message,
      };
    });
  }, []);

  const advanceDialogue = useCallback(() => {
    if (!world || !dialogue) return;
    void audioRef.current?.resumeFromGesture();
    const opensShop = dialogue.node.opensShop;
    const choice = dialogue.node.choices?.[0];
    if (choice) emitDialogueChoice(world, dialogue.node, choice.id);
    else emitDialogueSeen(world, dialogue.node);
    setDialogue(null);
    step(world, 0);
    clearOutbox(world);
    if (opensShop) setShopState({ shopId: opensShop, selectedIndex: 0, message: "" });
  }, [clearOutbox, dialogue, world]);

  const pressA = useCallback(() => {
    if (paused) return;
    if (mode === "landing") {
      setMode("title");
      return;
    }
    if (mode === "title" || mode === "victory" || mode === "gameover") {
      startGame();
      return;
    }
    if (!world) return;
    void audioRef.current?.resumeFromGesture();
    if (shopState) {
      handleShopBuy();
      return;
    }
    if (dialogue) {
      advanceDialogue();
      return;
    }
    const propDialogue = nearestReadableProp(world);
    if (propDialogue) {
      const outbox = world.get(Outbox);
      if (outbox) {
        if (propDialogue.interaction.sfx) outbox.sfx.push(propDialogue.interaction.sfx);
        outbox.dialogue = {
          bank: propDialogue.interaction.dialogueBank,
          slot: propDialogue.interaction.dialogueSlot,
        };
      }
      if (propDialogue.interaction.once) {
        propDialogue.entity.set(Interactable, { ...propDialogue.interaction, used: true });
      }
      clearOutbox(world);
      return;
    }
    const npcDialogue = nearestDialogue(world);
    if (npcDialogue) {
      setDialogue(npcDialogue);
      return;
    }
    aimAtNearestEnemy(world);
    playerAttack(world);
    clearOutbox(world);
  }, [
    advanceDialogue,
    clearOutbox,
    dialogue,
    handleShopBuy,
    mode,
    paused,
    shopState,
    startGame,
    world,
  ]);

  useEffect(() => {
    if (mode !== "playing" || !world) return;
    const save = () => {
      const current = snapshotRef.current;
      persistSave(current);
    };
    save();
    const timer = window.setInterval(save, AUTO_SAVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [mode, persistSave, world]);

  const setB = useCallback(
    (pressed: boolean) => {
      if (!world || mode !== "playing" || dialogue || paused) return;
      void audioRef.current?.resumeFromGesture();
      if (shopState) {
        if (pressed) handleShopSell();
        return;
      }
      playerAbility(world, pressed);
      clearOutbox(world);
    },
    [clearOutbox, dialogue, handleShopSell, mode, paused, shopState, world],
  );

  const setDirection = useCallback(
    (dir: Direction, pressed: boolean) => {
      if (shopState) {
        inputRef.current[dir] = false;
        if (pressed && dir === "up") moveShopSelection(-1);
        if (pressed && dir === "down") moveShopSelection(1);
        return;
      }
      if (paused && pressed) {
        inputRef.current[dir] = false;
        return;
      }
      inputRef.current[dir] = pressed;
    },
    [moveShopSelection, paused, shopState],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = keyMap[normalizeKey(event.key)];
      if (!action) return;
      event.preventDefault();
      if (action === "pause" && !event.repeat && mode === "playing") {
        togglePause();
      } else if (action === "a" && !event.repeat) pressA();
      else if (action === "b" && !event.repeat) setB(true);
      else if (action !== "a" && action !== "b" && action !== "pause" && !event.repeat)
        setDirection(action, true);
      if (mode === "title" && action === "left") {
        const idx = classes.roster.indexOf(selectedClass);
        setSelectedClass(classes.roster[(idx + classes.roster.length - 1) % classes.roster.length]);
      }
      if (mode === "title" && action === "right") {
        const idx = classes.roster.indexOf(selectedClass);
        setSelectedClass(classes.roster[(idx + 1) % classes.roster.length]);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const action = keyMap[normalizeKey(event.key)];
      if (!action) return;
      event.preventDefault();
      if (action === "b") setB(false);
      else if (action !== "a" && action !== "pause") setDirection(action, false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [mode, pressA, selectedClass, setB, setDirection, togglePause]);

  useEffect(() => {
    if (!world || mode !== "playing") return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frame = (now: number) => {
      const dt = Math.min(engine.maxTimestep, (now - last) / 1000);
      last = now;
      if (!dialogue && !paused && !shopState) {
        acc += dt;
        while (acc >= SIM_DT) {
          applyInputToWorld(world, inputRef.current);
          step(world, SIM_DT);
          handleZoneTriggers(world, zoneEnteredRef.current);
          clearOutbox(world);
          acc -= SIM_DT;
        }
      } else {
        playerOf(world)?.set(MoveIntent, { x: 0, y: 0 });
      }
      refreshSnapshot(world);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [clearOutbox, dialogue, mode, paused, refreshSnapshot, shopState, world]);

  const shellDataset = useMemo(
    () => ({
      "data-mode": mode,
      "data-map-id": snapshot.mapId,
      "data-class-id": snapshot.classId,
      "data-player-x": snapshot.playerX.toFixed(1),
      "data-player-y": snapshot.playerY.toFixed(1),
      "data-enemies": String(snapshot.enemies),
      "data-projectiles": String(snapshot.projectiles),
      "data-hp": String(Math.max(0, Math.ceil(snapshot.hp))),
      "data-gold": String(snapshot.gold),
      "data-inventory": JSON.stringify(snapshot.inventory),
      "data-paused": String(paused),
      "data-muted": String(muted),
      "data-device-profile": deviceProfile,
    }),
    [
      deviceProfile,
      mode,
      muted,
      paused,
      snapshot.classId,
      snapshot.enemies,
      snapshot.hp,
      snapshot.gold,
      snapshot.inventory,
      snapshot.mapId,
      snapshot.playerX,
      snapshot.playerY,
      snapshot.projectiles,
    ],
  );

  return (
    <main
      className="game-shell"
      data-testid="game-shell"
      {...shellDataset}
      style={
        {
          "--bg": ui.theme.background,
          "--panel": ui.theme.panel,
          "--panel-strong": ui.theme.panelStrong,
          "--panel-soft": ui.theme.panelSoft,
          "--panel-edge": ui.theme.panelEdge,
          "--shell": ui.theme.shell,
          "--frame": ui.theme.panelBorder,
          "--text": ui.theme.textPrimary,
          "--body": ui.theme.textBody,
          "--muted": ui.theme.textMuted,
          "--accent": ui.theme.accentGold,
          "--signal": ui.theme.accentGreen,
          "--danger": ui.theme.accentRed,
          "--danger-dark": ui.theme.accentRedDark,
          "--aether": ui.theme.accentBlue,
          "--rose": ui.theme.accentPink,
          "--font-display": ui.typography.display.family,
          "--font-body": ui.typography.body.family,
          "--font-numeric": ui.typography.numeric.family,
        } as CSSProperties
      }
    >
      {mode === "landing" && (
        <LandingScreen
          latestSave={latestSave}
          settings={settings}
          settingsOpen={settingsOpen}
          onNewGame={() => setMode("title")}
          onContinue={continueGame}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
          onToggleMute={() => setMuted((value) => !value)}
        />
      )}
      {world && (
        <div className="world-stage-shell" data-testid="world-stage-shell">
          <GameStage world={world} />
        </div>
      )}
      {mode === "title" && (
        <TitleScreen selected={selectedClass} onSelect={setSelectedClass} onStart={startGame} />
      )}
      {world && mode !== "title" && (
        <>
          <Hud
            snapshot={snapshot}
            audio={audioDebug}
            panelOpen={panelOpen}
            paused={paused}
            muted={muted}
            onTogglePanel={() => setPanelOpen((open) => !open)}
            onTogglePause={togglePause}
            onToggleMute={() => setMuted((value) => !value)}
            onRetire={retireRun}
          />
          <VirtualPad setDirection={setDirection} pressA={pressA} setB={setB} />
        </>
      )}
      {dialogue && <DialogueBox dialogue={dialogue} onAdvance={advanceDialogue} />}
      {shopState && mode === "playing" && (
        <ShopPanel
          shopState={shopState}
          snapshot={snapshot}
          onBuy={handleShopBuy}
          onSell={handleShopSell}
          onClose={() => setShopState(null)}
        />
      )}
      {paused && mode === "playing" && (
        <section className="pause-screen" data-testid="pause-screen">
          <div className="pause-panel" data-testid="pause-panel" ref={pausePanelRef}>
            <h1>PAUSED</h1>
            <button
              className="menu-button"
              data-testid="resume-button"
              type="button"
              onClick={resumeGame}
            >
              RESUME
            </button>
          </div>
        </section>
      )}
      {(mode === "victory" || mode === "gameover") && (
        <section
          className="end-screen"
          data-testid={mode === "victory" ? "victory-screen" : "gameover-screen"}
        >
          <div className="end-panel" data-testid="end-panel" ref={endPanelRef}>
            <h1>{mode === "victory" ? "VICTORY" : "GAME OVER"}</h1>
            <p className="dialogue-line">
              {mode === "victory" ? "The kingdom is saved." : "The old road claims another hero."}
            </p>
            <button className="menu-button" type="button" onClick={() => startGame()}>
              A NEW RUN
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
