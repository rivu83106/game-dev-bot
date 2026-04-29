import { ICT, CT, BS, TIS, CATEGORIES, STATUSES, PRIORITIES } from "../constants.js";
import { getTask, getDependencies } from "../db.js";
import { makeTaskEmbed, shortId, jsonResponse } from "../utils.js";
import { editStartYearMessage } from "../calendar.js";
import type { Env, DiscordInteraction, EditSession } from "../types.js";

export async function handleTaskEdit(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const guildId = interaction.guild_id ?? "dm";
  const taskId  = Number(interaction.data?.options?.find(o => o.name === "id")?.value);

  if (!taskId) {
    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ IDを指定してください。", flags: 64 } });
  }

  const task = await getTask(env, taskId);
  if (!task || task.guild_id !== guildId) {
    return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ タスクが見つかりません。", flags: 64 } });
  }

  const deps  = await getDependencies(env, taskId);
  const embed = makeTaskEmbed(task, deps);

  const sessionKey = shortId();
  const editSession: EditSession = { task_id: taskId };
  await env.KV.put(`edit:${sessionKey}`, JSON.stringify(editSession), { expirationTtl: 900 });

  return jsonResponse({
    type: ICT.CHANNEL_MESSAGE,
    data: {
      content: `✏️ **タスク #${taskId}** を編集します。変更したい項目を選んでください。`,
      embeds: [embed],
      flags: 64,
      components: [
        {
          type: CT.ACTION_ROW,
          components: [
            { type: CT.BUTTON, style: BS.PRIMARY,   custom_id: `edit_title:${sessionKey}`,    label: "📝 タイトル変更" },
            { type: CT.BUTTON, style: BS.PRIMARY,   custom_id: `edit_dates:${sessionKey}`,    label: "📅 日程変更" },
            { type: CT.BUTTON, style: BS.SECONDARY, custom_id: `edit_note:${sessionKey}`,     label: "📋 メモ変更" },
          ],
        },
        {
          type: CT.ACTION_ROW,
          components: [
            {
              type: CT.STRING_SELECT,
              custom_id: `edit_status:${sessionKey}`,
              placeholder: "ステータスを変更...",
              options: Object.entries(STATUSES).map(([k, v]) => ({ label: v, value: k })),
            },
          ],
        },
        {
          type: CT.ACTION_ROW,
          components: [
            {
              type: CT.STRING_SELECT,
              custom_id: `edit_priority:${sessionKey}`,
              placeholder: "優先度を変更...",
              options: Object.entries(PRIORITIES).map(([k, v]) => ({ label: v, value: k })),
            },
          ],
        },
        {
          type: CT.ACTION_ROW,
          components: [
            {
              type: CT.STRING_SELECT,
              custom_id: `edit_category:${sessionKey}`,
              placeholder: "カテゴリを変更...",
              options: Object.entries(CATEGORIES).map(([k, v]) => ({ label: v, value: k })),
            },
          ],
        },
      ],
    },
  });
}

// タイトル変更モーダル
export function titleEditModal(sessionKey: string, currentTitle: string): Response {
  return jsonResponse({
    type: ICT.MODAL,
    data: {
      title: "タイトル変更",
      custom_id: `modal_title:${sessionKey}`,
      components: [{
        type: CT.ACTION_ROW,
        components: [{
          type: CT.TEXT_INPUT,
          custom_id: "title",
          label: "新しいタイトル",
          style: TIS.SHORT,
          value: currentTitle,
          max_length: 100,
          required: true,
        }],
      }],
    },
  });
}

// メモ変更モーダル
export function noteEditModal(sessionKey: string, currentNote: string): Response {
  return jsonResponse({
    type: ICT.MODAL,
    data: {
      title: "メモ変更",
      custom_id: `modal_note:${sessionKey}`,
      components: [{
        type: CT.ACTION_ROW,
        components: [{
          type: CT.TEXT_INPUT,
          custom_id: "note",
          label: "新しいメモ",
          style: TIS.PARAGRAPH,
          value: currentNote,
          max_length: 500,
          required: false,
        }],
      }],
    },
  });
}
