import { ICT } from "../constants.js";
import { fetchGuildMembers } from "../discord-api.js";
import { jsonResponse } from "../utils.js";
import type { Env, DiscordInteraction } from "../types.js";

export async function handleAssigneeAutocomplete(
  interaction: DiscordInteraction,
  env: Env,
): Promise<Response> {
  try {
    const guildId = interaction.guild_id ?? "";
    const focused = interaction.data?.options?.find(o => o.focused)?.value ?? "";
    const query   = String(focused).trim();

    // 「全員」は常に先頭
    const choices: Array<{ name: string; value: string }> = [
      { name: "👥 全員", value: "everyone" },
    ];

    // 文字が入力されたときだけメンバー検索
    if (guildId && query) {
      const members = await fetchGuildMembers(guildId, env.DISCORD_TOKEN, query, 24);
      for (const m of members) {
        const displayName = m.nick ?? m.user.global_name ?? m.user.username;
        choices.push({ name: displayName, value: `${m.user.id}|${displayName}` });
        if (choices.length >= 25) break;
      }
    }

    return jsonResponse({ type: ICT.AUTOCOMPLETE, data: { choices } });
  } catch {
    return jsonResponse({ type: ICT.AUTOCOMPLETE, data: { choices: [{ name: "👥 全員", value: "everyone" }] } });
  }
}
