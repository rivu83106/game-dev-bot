import { ICT } from "./constants.js";
import { getTask, updateTaskTitle, updateTaskNote } from "./db.js";
import { makeTaskEmbed, jsonResponse } from "./utils.js";
import type { Env, DiscordInteraction, EditSession } from "./types.js";

export async function handleModal(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const customId = interaction.data?.custom_id ?? "";
  const components = interaction.data?.components ?? [];

  // モーダルのフィールド値を取得
  const getValue = (fieldId: string): string => {
    for (const actionRow of components) {
      for (const comp of actionRow.components ?? []) {
        if (comp.custom_id === fieldId) return comp.value ?? "";
      }
    }
    return "";
  };

  // タイトル編集
  if (customId.startsWith("modal_title:")) {
    const sessionKey = customId.split(":")[1];
    const newTitle   = getValue("title").trim();

    if (!newTitle) {
      return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ タイトルを入力してください。", flags: 64 } });
    }

    const raw = await env.KV.get(`edit:${sessionKey}`);
    if (!raw) {
      return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ セッションが期限切れです。", flags: 64 } });
    }
    const sess: EditSession = JSON.parse(raw);
    await updateTaskTitle(env, sess.task_id, newTitle);

    const task  = await getTask(env, sess.task_id);
    const embed = task ? makeTaskEmbed(task) : null;
    return jsonResponse({
      type: ICT.CHANNEL_MESSAGE,
      data: {
        content: `✅ タスク #${sess.task_id} のタイトルを「${newTitle}」に変更しました。`,
        embeds:  embed ? [embed] : [],
        flags:   64,
      },
    });
  }

  // メモ編集
  if (customId.startsWith("modal_note:")) {
    const sessionKey = customId.split(":")[1];
    const newNote    = getValue("note").trim();

    const raw = await env.KV.get(`edit:${sessionKey}`);
    if (!raw) {
      return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ セッションが期限切れです。", flags: 64 } });
    }
    const sess: EditSession = JSON.parse(raw);
    await updateTaskNote(env, sess.task_id, newNote);

    const task  = await getTask(env, sess.task_id);
    const embed = task ? makeTaskEmbed(task) : null;
    return jsonResponse({
      type: ICT.CHANNEL_MESSAGE,
      data: {
        content: `✅ タスク #${sess.task_id} のメモを更新しました。`,
        embeds:  embed ? [embed] : [],
        flags:   64,
      },
    });
  }

  return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ 不明なモーダルです。", flags: 64 } });
}
