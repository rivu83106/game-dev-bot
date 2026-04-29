CREATE TABLE IF NOT EXISTS tasks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id      TEXT    NOT NULL,
  title         TEXT    NOT NULL,
  assignee_ids  TEXT    NOT NULL DEFAULT '[]',
  assignee_names TEXT   NOT NULL DEFAULT '[]',
  category      TEXT    NOT NULL,
  start_date    TEXT    NOT NULL,
  due_date      TEXT    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'todo',
  priority      TEXT    NOT NULL DEFAULT 'medium',
  note          TEXT             DEFAULT '',
  created_by    TEXT,
  created_at    TEXT
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id    INTEGER NOT NULL,
  depends_on INTEGER NOT NULL,
  PRIMARY KEY (task_id, depends_on),
  FOREIGN KEY (task_id)    REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id          TEXT PRIMARY KEY,
  remind_channel_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_guild    ON tasks(guild_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due      ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
