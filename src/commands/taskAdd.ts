import { ICT } from "../constants.js";
import { shortId, jsonResponse } from "../utils.js";
import { calStartYearMessage } from "../calendar.js";
import type { Env, DiscordInteraction, TaskSession } from "../types.js";

export async function handleTaskAdd(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const opts = interaction.data?.options ?? [];
  const get  = (name: string) => opts.find(o => o.name === name)?.value;

  const title    = String(get("title")    ?? "");
  const assignee = String(get("assignee") ?? "");
  const category = String(get("category") ?? "other");
  const priority = String(get("priority") ?? "medium");
  const note     = String(get("note")     ?? "");

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

  if (assignee === "everyone") {
    session.assign_everyone = true;
  } else if (assignee.includes("|")) {
    // オートコンプリートから選択: "userId|displayName"
    const [userId, ...nameParts] = assignee.split("|");
    session.assignee_ids   = [userId];
    session.assignee_names = [nameParts.join("|")];
    session.assign_everyone = false;
  } else if (assignee) {
    // 万が一 userId のみの場合
    session.assignee_ids   = [assignee];
    session.assignee_names = [assignee];
    session.assign_everyone = false;
  }

  const sessionKey = shortId();
  await env.KV.put(`session:${sessionKey}`, JSON.stringify(session), { expirationTtl: 900 });

  return jsonResponse({
    type: ICT.CHANNEL_MESSAGE,
    data: { ...calStartYearMessage(sessionKey), flags: 64 },
  });
}
