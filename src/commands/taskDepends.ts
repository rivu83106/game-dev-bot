import { ICT } from "../constants.js";
import { getTask, addDependency, removeDependency, getDependencies } from "../db.js";
import { jsonResponse } from "../utils.js";
import type { Env, DiscordInteraction } from "../types.js";

export async function handleTaskDepends(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const guildId = interaction.guild_id ?? "dm";
  const opts    = interaction.data?.options ?? [];
  const getOpt  = (name: string) => opts.find(o => o.name === name)?.value;

  const action    = String(getOpt("action") ?? "add");
  const taskId    = Number(getOpt("id"));
  const dependsOn = Number(getOpt("depends_on"));

  if (!taskId || !dependsOn) {
    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ IDを正しく指定してください。", flags: 64 } });
  }
  if (taskId === dependsOn) {
    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ 自分自身を依存先にはできません。", flags: 64 } });
  }

  const task   = await getTask(env, taskId);
  const target = await getTask(env, dependsOn);

  if (!task || task.guild_id !== guildId) {
    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: `❌ タスク #${taskId} が見つかりません。`, flags: 64 } });
  }
  if (!target || target.guild_id !== guildId) {
    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: `❌ タスク #${dependsOn} が見つかりません。`, flags: 64 } });
  }

  if (action === "add") {
    // 循環依存チェック
    const existingDeps = await getDependencies(env, dependsOn);
    if (existingDeps.includes(taskId)) {
      return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ 循環依存になるため追加できません。", flags: 64 } });
    }
    await addDependency(env, taskId, dependsOn);

    const warn = target.status !== "done" ? `\n⚠️ タスク #${dependsOn} はまだ完了していません。` : "";
    return jsonResponse({
      type: ICT.CHANNEL_MESSAGE,
      data: {
        content: `✅ タスク **#${taskId}「${task.title}」** は **#${dependsOn}「${target.title}」** に依存するように設定しました。${warn}`,
        flags: 64,
      },
    });
  }

  if (action === "remove") {
    await removeDependency(env, taskId, dependsOn);
    return jsonResponse({
      type: ICT.CHANNEL_MESSAGE,
      data: {
        content: `✅ タスク **#${taskId}** から **#${dependsOn}** への依存関係を削除しました。`,
        flags: 64,
      },
    });
  }

  if (action === "list") {
    const deps = await getDependencies(env, taskId);
    if (deps.length === 0) {
      return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: `📋 タスク #${taskId} には依存関係はありません。`, flags: 64 } });
    }
    const lines = await Promise.all(deps.map(async d => {
      const t = await getTask(env, d);
      return t ? `• #${d} ${t.title} (${t.status})` : `• #${d}`;
    }));
    return jsonResponse({
      type: ICT.CHANNEL_MESSAGE,
      data: {
        content: `📋 **#${taskId}「${task.title}」** の依存タスク:\n${lines.join("\n")}`,
        flags: 64,
      },
    });
  }

  return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ 不明なアクションです。", flags: 64 } });
}
