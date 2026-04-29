import { ICT, CT, TIS } from "../constants.js";
import { calStartYearMessage } from "../calendar.js";
import { shortId, jsonResponse } from "../utils.js";
import type { Env, DiscordInteraction, TaskSession } from "../types.js";

export async function handleTaskAdd(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const opts = interaction.data?.options ?? [];
  const get = (name: string) => opts.find(o => o.name === name)?.value;

  const title        = String(get("title") ?? "");
  const category     = String(get("category") ?? "other");
  const priority     = String(get("priority") ?? "medium");
  const note         = String(get("note") ?? "");
  const everyoneOpt  = get("assign_everyone");
  const assignEveryone = everyoneOpt === true || everyoneOpt === "true";

  // 担当者の解決
  let assigneeIds: string[]   = [];
  let assigneeNames: string[] = [];

  if (assignEveryone) {
    assigneeIds   = [];
    assigneeNames = [];
  } else {
    const rawUser = opts.find(o => o.name === "assignee");
    if (rawUser) {
      const userId = String(rawUser.value);
      assigneeIds.push(userId);
      const resolved = interaction.resolved?.users?.[userId];
      const member   = interaction.resolved?.members?.[userId];
      const name     = member?.nick ?? resolved?.global_name ?? resolved?.username ?? userId;
      assigneeNames.push(name);
    }
  }

  const guildId  = interaction.guild_id ?? "dm";
  const member   = interaction.member;
  const userName = member?.nick ?? member?.user?.global_name ?? member?.user?.username ?? "Unknown";

  const session: TaskSession = {
    title, category, priority, note,
    assignee_ids:   assignEveryone ? [] : assigneeIds,
    assignee_names: assignEveryone ? [] : assigneeNames,
    guild_id: guildId,
    user_name: userName,
  };

  const sessionKey = shortId();
  await env.KV.put(
    `session:${sessionKey}`,
    JSON.stringify({ ...session, assign_everyone: assignEveryone }),
    { expirationTtl: 900 } // 15分
  );

  const msg = calStartYearMessage(sessionKey);
  return jsonResponse({
    type: ICT.CHANNEL_MESSAGE,
    data: { ...msg, flags: 64 }, // ephemeral
  });
}

// カレンダー選択後に呼ばれるモーダル表示（不要になったが互換用）
export async function openTaskModal(sessionKey: string, startDate: string, dueDate: string): Promise<Response> {
  return jsonResponse({
    type: ICT.MODAL,
    data: {
      title: "タスク詳細",
      custom_id: `task_modal:${sessionKey}:${startDate}:${dueDate}`,
      components: [
        {
          type: CT.ACTION_ROW,
          components: [{
            type: CT.TEXT_INPUT,
            custom_id: "title",
            label: "タスク名",
            style: TIS.SHORT,
            max_length: 100,
            required: true,
          }],
        },
      ],
    },
  });
}
