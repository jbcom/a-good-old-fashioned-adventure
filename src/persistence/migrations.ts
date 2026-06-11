export const SAVE_DB_NAME = "good-old-fashioned-adventure";
export const SAVE_DB_VERSION = 1;

export const SAVE_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS save_slots (
    id INTEGER PRIMARY KEY,
    class_id TEXT NOT NULL,
    map_id TEXT NOT NULL,
    player_x INTEGER NOT NULL,
    player_y INTEGER NOT NULL,
    level INTEGER NOT NULL,
    hp INTEGER NOT NULL,
    max_hp INTEGER NOT NULL,
    quest_summary TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS save_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER NOT NULL REFERENCES save_slots(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );`,
  "CREATE INDEX IF NOT EXISTS save_slots_updated_at_idx ON save_slots(updated_at);",
  "CREATE INDEX IF NOT EXISTS save_events_slot_id_idx ON save_events(slot_id);",
];
