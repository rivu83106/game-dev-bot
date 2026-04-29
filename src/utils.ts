import { CATEGORIES, PRIORITIES, STATUSES, STATUS_COLORS, PRIORITY_ORDER } from "./constants.js";
import type { Task } from "./types.js";

export function getAssigneeIds(task: Task): string[] {
  if (task.assignee_ids === "everyone") return [];
  try { return JSON.parse(task.assignee_ids); } catch { return []; }
}

export function getAssigneeNames(task: Task): string {
  if (task.assignee_names === "全員") return "全員";
  try {
    const names: string[] = JSON.parse(task.assignee_names);
    return names.join(", ");
  } catch { return task.assignee_names; }
}

export function makeMentions(task: Task): string {
  if (task.assignee_ids === "everyone") return "@everyone";
  const ids = getAssigneeIds(task);
  return ids.map(id => `<@${id}>`).join(" ");
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00Z");
  return Math.floor((due.getTime() - today.getTime()) / 86400000);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function todayJST(): string {
  // UTC+9
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  return now.toISOString().slice(0, 10);
}

export function nowJST(): string {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  return now.toISOString().slice(0, 16).replace("T", " ");
}

export function makeTaskEmbed(task: Task, deps?: number[]) {
  const color = STATUS_COLORS[task.status] ?? 0x99aab5;
  const fields = [
    { name: "担当者",   value: getAssigneeNames(task),                   inline: true },
    { name: "ステータス", value: STATUSES[task.status] ?? task.status,    inline: true },
    { name: "優先度",   value: PRIORITIES[task.priority] ?? task.priority, inline: true },
    { name: "カテゴリ", value: CATEGORIES[task.category] ?? task.category, inline: true },
    { name: "開始日",   value: task.start_date,                           inline: true },
    { name: "締切日",   value: task.due_date,                             inline: true },
    { name: "ID",       value: `#${task.id}`,                             inline: true },
  ];

  if (task.note) fields.push({ name: "メモ", value: task.note, inline: false });
  if (deps && deps.length > 0) {
    fields.push({ name: "依存タスク", value: deps.map(d => `#${d}`).join(", "), inline: false });
  }

  return { title: task.title, color, fields };
}

export function deadlineTag(task: Task): string {
  if (task.status === "done") return "";
  const days = daysUntil(task.due_date);
  if (days < 0)    return " 🚨**期限切れ**";
  if (days === 0)  return " ⚠️今日締切";
  if (days <= 3)   return ` ⚠️残${days}日`;
  if (days <= 7)   return ` 🔔残${days}日`;
  return ` (${task.due_date})`;
}

export function prioritySort(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) =>
    (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0)
  );
}

// 短いランダムID（KVセッションキー用）
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// JSON response helper
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
