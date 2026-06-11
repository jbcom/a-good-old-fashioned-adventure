import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const saveEvents = sqliteTable("save_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slotId: integer("slot_id")
    .notNull()
    .references(() => saveSlots.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type SaveSlotRow = typeof saveSlots.$inferSelect;
export type NewSaveSlotRow = typeof saveSlots.$inferInsert;
export type SaveEventRow = typeof saveEvents.$inferSelect;
export type NewSaveEventRow = typeof saveEvents.$inferInsert;
