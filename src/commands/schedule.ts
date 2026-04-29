import { ICT, STATUSES, PRIORITIES } from "../constants.js";
import { getAllTasks } from "../db.js";
import { deadlineTag, getAssigneeNames, jsonResponse } from "../utils.js";
import { buildCalendarView, buildCalendarNav } from "../calendar.js";
import type { Env, DiscordInteraction, Task } from "../types.js";

export async function handleSchedule(
  interaction: DiscordInteraction,
  env: Env,
  year?: number,
  month?: number
): Promise<Response> {
  const data = await buildScheduleData(interaction.guild_id ?? "dm", env, year, month);
  return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data });
}

// コンポーネント（月移動ボタン）からも呼べるよう data 部分だけ返す
export async function buildScheduleData(
  guildId: string,
  env: Env,
  year?: number,
  month?: number
): Promise<Record<string, unknown>> {
  const now = new Date();
  const y   = year  ?? now.getUTCFullYear();
  const m   = month ?? (now.getUTCMonth() + 1);

  const allTasks = await getAllTasks(env, guildId);

  if (allTasks.length === 0) {
    return { content: "📭 タスクがありません。", flags: 64 };
  }

  const calGrid = buildCalendarView(allTasks, y, m);
  const nav     = buildCalendarNav(y, m);

  const monthStr   = `${y}-${String(m).padStart(2, "0")}`;
  const monthTasks = allTasks.filter(t =>
    t.start_date.startsWith(monthStr) || t.due_date.startsWith(monthStr)
  );

  const taskLines   = buildTaskLines(monthTasks);
  const total       = allTasks.length;
  const doneCount   = allTasks.filter(t => t.status === "done").length;
  const pct         = total > 0 ? Math.round(doneCount / total * 100) : 0;
  const description = calGrid + (taskLines ? `\n${taskLines}` : "\n*この月にタスクはありません*");

  return {
    embeds: [{
      title:       `📅 ${y}年${m}月 スケジュール`,
      description,
      color:       0x5865f2,
      footer:      { text: `全体進捗: ${pct}% (${doneCount}/${total} 完了)` },
    }],
    components: [nav],
  };
}

function buildTaskLines(tasks: Task[]): string {
  if (tasks.length === 0) return "";
  const lines: string[] = [];
  for (const pKey of ["urgent", "high", "medium", "low"]) {
    const group = tasks.filter(t => t.priority === pKey);
    if (group.length === 0) continue;
    lines.push(`**${PRIORITIES[pKey] ?? pKey}**`);
    for (const t of group) {
      const name = getAssigneeNames(t);
      lines.push(
        `\`#${t.id}\` ${t.title}${deadlineTag(t)}\n　　${t.start_date} 〜 ${t.due_date} ｜ ${name} ｜ ${STATUSES[t.status] ?? t.status}`
      );
    }
  }
  return lines.join("\n");
}
