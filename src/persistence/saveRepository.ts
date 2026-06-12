import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, type capSQLiteValues } from "@capacitor-community/sqlite";
import { defineCustomElements as defineJeepSqlite } from "jeep-sqlite/loader";
import { SAVE_DB_NAME, SAVE_DB_VERSION, SAVE_MIGRATIONS } from "./migrations";
import type { NewSaveEventRow, NewSaveSlotRow, SaveSlotRow } from "./schema";

type SqlValue = string | number | null;
type SqlRow = Record<string, SqlValue>;

export interface SaveSlotSummary {
  id: number;
  classId: string;
  mapId: string;
  playerX: number;
  playerY: number;
  level: number;
  hp: number;
  maxHp: number;
  questSummary: string;
  snapshotJson: string;
  updatedAt: number;
}

export interface SaveRepository {
  initialize(): Promise<void>;
  latestSlot(): Promise<SaveSlotSummary | null>;
  upsertSlot(row: NewSaveSlotRow): Promise<void>;
  recordEvent(row: NewSaveEventRow): Promise<void>;
}

function toSummary(row: SqlRow): SaveSlotSummary {
  return {
    id: Number(row.id),
    classId: String(row.class_id),
    mapId: String(row.map_id),
    playerX: Number(row.player_x),
    playerY: Number(row.player_y),
    level: Number(row.level),
    hp: Number(row.hp),
    maxHp: Number(row.max_hp),
    questSummary: String(row.quest_summary),
    snapshotJson: String(row.snapshot_json ?? "{}"),
    updatedAt: Number(row.updated_at),
  };
}

function queryRows(result: capSQLiteValues): SqlRow[] {
  return (result.values ?? []) as SqlRow[];
}

let jeepDefined = false;

function ensureJeepSqliteElement() {
  if (typeof window === "undefined" || jeepDefined) return;
  defineJeepSqlite(window);
  if (!document.querySelector("jeep-sqlite")) {
    document.body.appendChild(document.createElement("jeep-sqlite"));
  }
  jeepDefined = true;
}

function isExistingConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already|exist|connection/i.test(message);
}

export class CapacitorSaveRepository implements SaveRepository {
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initializePromise ??= this.openAndMigrate().finally(() => {
      this.initializePromise = null;
    });
    await this.initializePromise;
  }

  private async openAndMigrate(): Promise<void> {
    if (Capacitor.getPlatform() === "web") {
      ensureJeepSqliteElement();
      await customElements.whenDefined("jeep-sqlite");
      await CapacitorSQLite.initWebStore();
    }
    try {
      await CapacitorSQLite.createConnection({
        database: SAVE_DB_NAME,
        version: SAVE_DB_VERSION,
        encrypted: false,
        mode: "no-encryption",
      });
    } catch (error) {
      // Vite HMR can recreate this repository while the native/web connection still exists.
      if (!isExistingConnectionError(error)) throw error;
    }
    await CapacitorSQLite.open({ database: SAVE_DB_NAME });
    for (const statement of SAVE_MIGRATIONS) {
      await CapacitorSQLite.execute({ database: SAVE_DB_NAME, statements: statement });
    }
    this.initialized = true;
  }

  private enqueueWrite(write: () => Promise<void>): Promise<void> {
    const next = this.writeQueue.then(write, write);
    this.writeQueue = next.catch(() => {});
    return next;
  }

  async latestSlot(): Promise<SaveSlotSummary | null> {
    await this.initialize();
    await this.writeQueue;
    const result = await CapacitorSQLite.query({
      database: SAVE_DB_NAME,
      statement:
        "SELECT id, class_id, map_id, player_x, player_y, level, hp, max_hp, quest_summary, snapshot_json, updated_at FROM save_slots ORDER BY updated_at DESC LIMIT 1",
    });
    return queryRows(result).map(toSummary)[0] ?? null;
  }

  async upsertSlot(row: NewSaveSlotRow): Promise<void> {
    await this.enqueueWrite(async () => {
      await this.initialize();
      await CapacitorSQLite.run({
        database: SAVE_DB_NAME,
        statement: `INSERT INTO save_slots (
        id, class_id, map_id, player_x, player_y, level, hp, max_hp, quest_summary, snapshot_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        class_id = excluded.class_id,
        map_id = excluded.map_id,
        player_x = excluded.player_x,
        player_y = excluded.player_y,
        level = excluded.level,
        hp = excluded.hp,
        max_hp = excluded.max_hp,
        quest_summary = excluded.quest_summary,
        snapshot_json = excluded.snapshot_json,
        updated_at = excluded.updated_at`,
        values: [
          row.id,
          row.classId,
          row.mapId,
          row.playerX,
          row.playerY,
          row.level,
          row.hp,
          row.maxHp,
          row.questSummary,
          row.snapshotJson,
          row.updatedAt instanceof Date ? row.updatedAt.getTime() : row.updatedAt,
        ],
      });
      if (Capacitor.getPlatform() === "web")
        await CapacitorSQLite.saveToStore({ database: SAVE_DB_NAME });
    });
  }

  async recordEvent(row: NewSaveEventRow): Promise<void> {
    await this.enqueueWrite(async () => {
      await this.initialize();
      await CapacitorSQLite.run({
        database: SAVE_DB_NAME,
        statement:
          "INSERT INTO save_events (slot_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?)",
        values: [
          row.slotId,
          row.eventType,
          row.payloadJson,
          row.createdAt instanceof Date ? row.createdAt.getTime() : row.createdAt,
        ],
      });
      if (Capacitor.getPlatform() === "web")
        await CapacitorSQLite.saveToStore({ database: SAVE_DB_NAME });
    });
  }
}

export class MemorySaveRepository implements SaveRepository {
  private slots = new Map<number, SaveSlotRow>();
  private events: NewSaveEventRow[] = [];

  async initialize(): Promise<void> {}

  async latestSlot(): Promise<SaveSlotSummary | null> {
    const latest = [...this.slots.values()].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    )[0];
    return latest
      ? {
          id: latest.id,
          classId: latest.classId,
          mapId: latest.mapId,
          playerX: latest.playerX,
          playerY: latest.playerY,
          level: latest.level,
          hp: latest.hp,
          maxHp: latest.maxHp,
          questSummary: latest.questSummary,
          snapshotJson: latest.snapshotJson,
          updatedAt: latest.updatedAt.getTime(),
        }
      : null;
  }

  async upsertSlot(row: NewSaveSlotRow): Promise<void> {
    const id = Number(row.id ?? 1);
    this.slots.set(id, {
      id,
      classId: String(row.classId),
      mapId: String(row.mapId),
      playerX: Number(row.playerX),
      playerY: Number(row.playerY),
      level: Number(row.level),
      hp: Number(row.hp),
      maxHp: Number(row.maxHp),
      questSummary: String(row.questSummary),
      snapshotJson: String(row.snapshotJson),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
    });
  }

  async recordEvent(row: NewSaveEventRow): Promise<void> {
    this.events.push(row);
  }
}

let repository: SaveRepository | null = null;

export function getSaveRepository(): SaveRepository {
  repository ??=
    typeof window === "undefined" ? new MemorySaveRepository() : new CapacitorSaveRepository();
  return repository;
}

export function setSaveRepositoryForTests(next: SaveRepository | null): void {
  repository = next;
}
