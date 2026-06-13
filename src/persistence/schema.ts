import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Drizzle schema for save-slot records. */
export const saveSlots = sqliteTable("save_slots", {
  id: integer("id").primaryKey(),
  classId: text("class_id").notNull(),
  mapId: text("map_id").notNull(),
  playerX: integer("player_x").notNull(),
  playerY: integer("player_y").notNull(),
  level: integer("level").notNull(),
  hp: integer("hp").notNull(),
  maxHp: integer("max_hp").notNull(),
  questSummary: text("quest_summary").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** Drizzle schema for event replay log; cascades on slot deletion. */
export const saveEvents = sqliteTable("save_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slotId: integer("slot_id")
    .notNull()
    .references(() => saveSlots.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** Inferred select type for saveSlots. */
export type SaveSlotRow = typeof saveSlots.$inferSelect;
/** Inferred insert type for saveSlots. */
export type NewSaveSlotRow = typeof saveSlots.$inferInsert;
/** Inferred select type for saveEvents. */
export type SaveEventRow = typeof saveEvents.$inferSelect;
/** Inferred insert type for saveEvents. */
export type NewSaveEventRow = typeof saveEvents.$inferInsert;
