import { ICT, STATUSES, PRIORITIES } from "../constants.js";
import { getAllTasks } from "../db.js";
import { deadlineTag, jsonResponse } from "../utils.js";
import type { Env, DiscordInteraction } from "../types.js";

export async function handleMyTasks(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const guildId = interaction.guild_id ?? "dm";
  const userId  = interaction.member?.user.id ?? interaction.user?.id ?? "";

  const allTasks = await getAllTasks(env, guildId);
  const tasks    = allTasks.filter(t => {
    if (t.assignee_ids === "everyone") return true;
    try { return JSON.parse(t.assignee_ids).includes(userId); } catch { return false; }
  });

  if (tasks.length === 0) {
    return jsonResponse({
      type: ICT.CHANNEL_MESSAGE,
      data: { content: "📭 あなたのタスクはありません。", flags: 64 },
    });
  }

  const total     = tasks.length;
  const doneCount = tasks.filter(t => t.status === "done").length;
  const fields: unknown[] = [];

  for (const [statusKey, statusLabel] of Object.entries(STATUSES)) {
    const group = tasks.filter(t => t.status === statusKey);
    if (group.length === 0) continue;
    const lines = group.map(t => {
      const pri = PRIORITIES[t.priority] ?? t.priority;
      return `\`#${t.id}\` ${t.title} ｜ ${pri}${deadlineTag(t)}`;
    });
    fields.push({ name: statusLabel, value: lines.join("\n"), inline: false });
  }

  const name = interaction.member?.nick ?? interaction.member?.user.global_name ?? interaction.user?.global_name ?? "あなた";

  return jsonResponse({
    type: ICT.CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: `📌 ${name} のタスク`,
        description: `進捗: ${Math.round(doneCount / total * 100)}% (${doneCount}/${total} 完了)`,
        color: 0x5865f2,
        fields,
      }],
      flags: 64, // ephemeral
    },
  });
}
