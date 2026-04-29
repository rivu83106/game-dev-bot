import type { Task, GuildSettings, Env } from "./types.js";

// ===== Tasks =====

export async function getAllTasks(env: Env, guildId: string): Promise<Task[]> {
  const { results } = await env.DB
    .prepare("SELECT * FROM tasks WHERE guild_id = ? ORDER BY due_date ASC, priority DESC")
    .bind(guildId)
    .all<Task>();
  return results ?? [];
}

export async function getTask(env: Env, id: number): Promise<Task | null> {
  return env.DB
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .bind(id)
    .first<Task>();
}

export async function addTask(env: Env, data: Omit<Task, "id">): Promise<number> {
  const res = await env.DB
    .prepare(`
      INSERT INTO tasks
        (guild_id, title, assignee_ids, assignee_names, category, start_date, due_date, status, priority, note, created_by, created_at)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?)
    `)
    .bind(
      data.guild_id, data.title, data.assignee_ids, data.assignee_names,
      data.category, data.start_date, data.due_date, data.priority,
      data.note, data.created_by, data.created_at
    )
    .run();
  return res.meta.last_row_id as number;
}

export async function updateTaskStatus(env: Env, id: number, status: string): Promise<void> {
  await env.DB
    .prepare("UPDATE tasks SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();
}

export async function updateTaskPriority(env: Env, id: number, priority: string): Promise<void> {
  await env.DB
    .prepare("UPDATE tasks SET priority = ? WHERE id = ?")
    .bind(priority, id)
    .run();
}

export async function updateTaskTitle(env: Env, id: number, title: string): Promise<void> {
  await env.DB
    .prepare("UPDATE tasks SET title = ? WHERE id = ?")
    .bind(title, id)
    .run();
}

export async function updateTaskDates(env: Env, id: number, startDate: string, dueDate: string): Promise<void> {
  await env.DB
    .prepare("UPDATE tasks SET start_date = ?, due_date = ? WHERE id = ?")
    .bind(startDate, dueDate, id)
    .run();
}

export async function updateTaskNote(env: Env, id: number, note: string): Promise<void> {
  await env.DB
    .prepare("UPDATE tasks SET note = ? WHERE id = ?")
    .bind(note, id)
    .run();
}

export async function updateTaskCategory(env: Env, id: number, category: string): Promise<void> {
  await env.DB
    .prepare("UPDATE tasks SET category = ? WHERE id = ?")
    .bind(category, id)
    .run();
}

export async function updateTaskAssignees(
  env: Env, id: number,
  assigneeIds: string, assigneeNames: string
): Promise<void> {
  await env.DB
    .prepare("UPDATE tasks SET assignee_ids = ?, assignee_names = ? WHERE id = ?")
    .bind(assigneeIds, assigneeNames, id)
    .run();
}

// ===== Dependencies =====

export async function addDependency(env: Env, taskId: number, dependsOn: number): Promise<void> {
  await env.DB
    .prepare("INSERT OR IGNORE INTO task_dependencies (task_id, depends_on) VALUES (?, ?)")
    .bind(taskId, dependsOn)
    .run();
}

export async function removeDependency(env: Env, taskId: number, dependsOn: number): Promise<void> {
  await env.DB
    .prepare("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on = ?")
    .bind(taskId, dependsOn)
    .run();
}

export async function getDependencies(env: Env, taskId: number): Promise<number[]> {
  const { results } = await env.DB
    .prepare("SELECT depends_on FROM task_dependencies WHERE task_id = ?")
    .bind(taskId)
    .all<{ depends_on: number }>();
  return (results ?? []).map(r => r.depends_on);
}

export async function getDependents(env: Env, taskId: number): Promise<number[]> {
  const { results } = await env.DB
    .prepare("SELECT task_id FROM task_dependencies WHERE depends_on = ?")
    .bind(taskId)
    .all<{ task_id: number }>();
  return (results ?? []).map(r => r.task_id);
}

// ===== Guild Settings =====

export async function getGuildSettings(env: Env, guildId: string): Promise<GuildSettings> {
  const row = await env.DB
    .prepare("SELECT * FROM guild_settings WHERE guild_id = ?")
    .bind(guildId)
    .first<GuildSettings>();
  return row ?? { guild_id: guildId, remind_channel_id: null };
}

export async function setRemindChannel(env: Env, guildId: string, channelId: string): Promise<void> {
  await env.DB
    .prepare(`
      INSERT INTO guild_settings (guild_id, remind_channel_id)
      VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET remind_channel_id = excluded.remind_channel_id
    `)
    .bind(guildId, channelId)
    .run();
}

export async function getAllGuildSettings(env: Env): Promise<GuildSettings[]> {
  const { results } = await env.DB
    .prepare("SELECT * FROM guild_settings WHERE remind_channel_id IS NOT NULL")
    .all<GuildSettings>();
  return results ?? [];
}

// リマインド用：全ギルドの未完了タスクを締切日で絞り込む
export async function getTasksDueOn(env: Env, guildId: string, date: string): Promise<Task[]> {
  const { results } = await env.DB
    .prepare("SELECT * FROM tasks WHERE guild_id = ? AND due_date = ? AND status != 'done'")
    .bind(guildId, date)
    .all<Task>();
  return results ?? [];
}
