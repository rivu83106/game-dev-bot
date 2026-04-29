import { ICT } from "../constants.js";
import { setRemindChannel } from "../db.js";
import { jsonResponse } from "../utils.js";
import type { Env, DiscordInteraction } from "../types.js";

export async function handleSetup(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const guildId = interaction.guild_id;
  if (!guildId) {
    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ サーバー内でのみ使用できます。", flags: 64 } });
  }

  const channelId = String(interaction.data?.options?.find(o => o.name === "remind_channel")?.value ?? "");
  if (!channelId) {
    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ チャンネルを指定してください。", flags: 64 } });
  }

  await setRemindChannel(env, guildId, channelId);

  return jsonResponse({
    type: ICT.CHANNEL_MESSAGE,
    data: {
      content: `✅ リマインドチャンネルを <#${channelId}> に設定しました。\n毎日朝9時(JST)に1週間前・1日前の締切をお知らせします。`,
      flags: 64,
    },
  });
}
