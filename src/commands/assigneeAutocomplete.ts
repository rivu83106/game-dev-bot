import { ICT } from "../constants.js";
import { fetchGuildMembers } from "../discord-api.js";
import { jsonResponse } from "../utils.js";
import type { Env, DiscordInteraction } from "../types.js";

export async function handleAssigneeAutocomplete(
  interaction: DiscordInteraction,
  env: Env,
): Promise<Response> {
  const guildId = interaction.guild_id ?? "";
  const focused = interaction.data?.options?.find(o => o.focused)?.value ?? "";
  const query   = String(focused).trim();

  const choices: Array<{ name: string; value: string }> = [];

  // 「全員」は常に先頭に表示（検索語が "全" を含む、または空のとき）
  if (!query || "全員".includes(query) || query === "all" || query === "everyone") {
    choices.push({ name: "👥 全員", value: "everyone" });
  }

  if (guildId) {
    const members = await fetchGuildMembers(guildId, env.DISCORD_TOKEN, query, 24);
    for (const m of members) {
      const displayName = m.nick ?? m.user.global_name ?? m.user.username;
      // value = "userId|displayName" でハンドラー側でも名前を復元できるようにする
      choices.push({ name: displayName, value: `${m.user.id}|${displayName}` });
      if (choices.length >= 25) break;
    }
  }

  return jsonResponse({ type: ICT.AUTOCOMPLETE, data: { choices } });
}
