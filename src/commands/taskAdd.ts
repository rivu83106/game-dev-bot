import { ICT, CT, BS } from "../constants.js";
import { shortId, jsonResponse } from "../utils.js";
import { calStartYearMessage } from "../calendar.js";
import type { Env, DiscordInteraction, TaskSession } from "../types.js";

export async function handleTaskAdd(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const opts = interaction.data?.options ?? [];
  const get  = (name: string) => opts.find(o => o.name === name)?.value;

  const title      = String(get("title")    ?? "");
  const category   = String(get("category") ?? "other");
  const priority   = String(get("priority") ?? "medium");
  const note       = String(get("note")     ?? "");
  const assigneeId = get("assignee") ? String(get("assignee")) : null;

  const guildId  = interaction.guild_id ?? "dm";
  const member   = interaction.member;
  const userName = member?.nick ?? member?.user?.global_name ?? member?.user?.username ?? "Unknown";

  const session: TaskSession & { assign_everyone?: boolean } = {
    title, category, priority, note,
    assignee_ids:   [],
    assignee_names: [],
    guild_id:       guildId,
    user_name:      userName,
  };

  // assignee オプションが指定されていればセレクターをスキップ
  if (assigneeId) {
    const resolved = interaction.data?.resolved;
    const resolvedUser   = resolved?.users?.[assigneeId];
    const resolvedMember = resolved?.members?.[assigneeId];
    const assigneeName   = resolvedMember?.nick ?? resolvedUser?.global_name ?? resolvedUser?.username ?? assigneeId;
    session.assignee_ids   = [assigneeId];
    session.assignee_names = [assigneeName];
    session.assign_everyone = false;

    const sessionKey = shortId();
    await env.KV.put(`session:${sessionKey}`, JSON.stringify(session), { expirationTtl: 900 });

    return jsonResponse({
      type: ICT.CHANNEL_MESSAGE,
      data: { ...calStartYearMessage(sessionKey), flags: 64 },
    });
  }

  // 担当者は次のステップで選ばせる
  const sessionKey = shortId();
  await env.KV.put(`session:${sessionKey}`, JSON.stringify(session), { expirationTtl: 900 });

  return jsonResponse({
    type: ICT.CHANNEL_MESSAGE,
    data: {
      content: "👥 **担当者を選択してください**\nメンバーを直接選ぶか、「全員」ボタンで全員指定できます。",
      flags: 64,
      components: [
        {
          type: CT.ACTION_ROW,
          components: [
            {
              type: 5, // USER_SELECT
              custom_id: `assignee:${sessionKey}`,
              placeholder: "担当者を選択（複数選択可）...",
              min_values: 1,
              max_values: 10,
            },
          ],
        },
        {
          type: CT.ACTION_ROW,
          components: [
            {
              type: CT.BUTTON,
              style: BS.SECONDARY,
              custom_id: `assignee_all:${sessionKey}`,
              label: "👥 全員を担当者にする",
            },
          ],
        },
      ],
    },
  });
}
