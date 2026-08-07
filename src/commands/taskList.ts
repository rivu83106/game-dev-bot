import { ICT, STATUSES, PRIORITIES, STATUS_COLORS } from "../constants.js";
import { getAllTasks } from "../db.js";
import { deadlineTag, getAssigneeNames, jsonResponse, prioritySort } from "../utils.js";
import type { Env, DiscordInteraction } from "../types.js";

export async function handleTaskList(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const guildId = interaction.guild_id ?? "dm";
  const opts    = interaction.data?.options ?? [];
  const getOpt  = (name: string) => opts.find(o => o.name === name)?.value;

  const filterStatus = String(getOpt("filter_status") ?? "all");
  const filterUser   = getOpt("filter_member") ? String(getOpt("filter_member")) : null;
  const isPublic     = getOpt("公開") === true;

  let allTasks = await getAllTasks(env, guildId);

  let tasks = allTasks;
  if (filterStatus !== "all") tasks = tasks.filter(t => t.status === filterStatus);
  if (filterUser)             tasks = tasks.filter(t => {
    if (t.assignee_ids === "everyone") return true;
    try { return JSON.parse(t.assignee_ids).includes(filterUser); } catch { return false; }
  });

  if (tasks.length === 0) {
    return jsonResponse({
      type: ICT.CHANNEL_MESSAGE,
      data: { content: "📭 タスクはありません。", flags: isPublic ? undefined : 64 },
    });
  }

  const total     = allTasks.length;
  const doneCount = allTasks.filter(t => t.status === "done").length;
  const pct       = total > 0 ? Math.round(doneCount / total * 100) : 0;

  const fields: unknown[] = [];

  for (const [statusKey, statusLabel] of Object.entries(STATUSES)) {
    const group = prioritySort(tasks.filter(t => t.status === statusKey));
    if (group.length === 0) continue;

    const lines = group.map(t => {
      const pri  = PRIORITIES[t.priority] ?? t.priority;
      const name = getAssigneeNames(t);
      return `\`#${t.id}\` ${t.title} ｜ **${name}** ｜ ${pri}${deadlineTag(t)}`;
    });

    fields.push({ name: `${statusLabel} (${group.length}件)`, value: lines.join("\n"), inline: false });
  }

  return jsonResponse({
    type: ICT.CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: "📋 タスク一覧",
        description: `**全体進捗: ${pct}% (${doneCount}/${total} 完了)**`,
        color: STATUS_COLORS["in_progress"],
        fields,
      }],
      flags: isPublic ? undefined : 64,
    },
  });
}
