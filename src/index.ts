import { IT, ICT } from "./constants.js";
import { verifyDiscordRequest } from "./verify.js";
import { handleComponent } from "./components.js";
import { handleModal } from "./modals.js";
import { runReminder } from "./reminder.js";
import { handleTaskAdd } from "./commands/taskAdd.js";
import { handleTaskList } from "./commands/taskList.js";
import { handleTaskEdit } from "./commands/taskEdit.js";
import { handleSchedule } from "./commands/schedule.js";
import { handleMyTasks } from "./commands/myTasks.js";
import { handleSetup } from "./commands/setup.js";
import { handleHelp } from "./commands/help.js";
import { handleTaskDepends } from "./commands/taskDepends.js";
import { handleAssigneeAutocomplete } from "./commands/assigneeAutocomplete.js";
import { jsonResponse } from "./utils.js";
import type { Env, DiscordInteraction } from "./types.js";

export default {
  // HTTP リクエストハンドラー（Discord Interactions Endpoint）
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { valid, body } = await verifyDiscordRequest(request, env.DISCORD_PUBLIC_KEY);
    if (!valid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const interaction: DiscordInteraction = JSON.parse(body);

    // PING
    if (interaction.type === IT.PING) {
      return jsonResponse({ type: ICT.PONG });
    }

    // スラッシュコマンド
    if (interaction.type === IT.APP_COMMAND) {
      return routeCommand(interaction, env);
    }

    // オートコンプリート
    if (interaction.type === IT.AUTOCOMPLETE) {
      return handleAssigneeAutocomplete(interaction, env);
    }

    // コンポーネント（ボタン・セレクトメニュー）
    if (interaction.type === IT.MESSAGE_COMPONENT) {
      return handleComponent(interaction, env);
    }

    // モーダル送信
    if (interaction.type === IT.MODAL_SUBMIT) {
      return handleModal(interaction, env);
    }

    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ 未対応の操作です。", flags: 64 } });
  },

  // Cronトリガー（毎日UTC 0:00 = JST 9:00）
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runReminder(env));
  },
};

async function routeCommand(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const name = interaction.data?.name ?? "";

  switch (name) {
    case "task_add":     return handleTaskAdd(interaction, env);
    case "task_list":    return handleTaskList(interaction, env);
    case "task_edit":    return handleTaskEdit(interaction, env);
    case "task_depends": return handleTaskDepends(interaction, env);
    case "schedule":     return handleSchedule(interaction, env);
    case "my_tasks":     return handleMyTasks(interaction, env);
    case "setup":        return handleSetup(interaction, env);
    case "help_game":    return handleHelp(interaction);
    default:
      return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: `❌ 不明なコマンド: ${name}`, flags: 64 } });
  }
}
