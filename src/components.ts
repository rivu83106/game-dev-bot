import { ICT, CT, BS, STATUSES, PRIORITIES, CATEGORIES } from "./constants.js";
import {
  getTask, addTask,
  updateTaskStatus, updateTaskPriority, updateTaskTitle,
  updateTaskDates, updateTaskNote, updateTaskCategory,
} from "./db.js";
import {
  makeTaskEmbed, jsonResponse, nowJST,
} from "./utils.js";
import { sendFollowup } from "./discord-api.js";
import {
  calStartYearMessage, calStartMonthMessage, calStartDayMessage,
  calDueYearMessage, calDueMonthMessage, calDueDayMessage, calConfirmMessage,
  editStartYearMessage, editStartMonthMessage, editStartDayMessage,
  editDueYearMessage, editDueMonthMessage, editDueDayMessage, editDatesConfirmMessage,
} from "./calendar.js";
import { titleEditModal, noteEditModal } from "./commands/taskEdit.js";
import { buildScheduleData } from "./commands/schedule.js";
import type { Env, DiscordInteraction, TaskSession, EditSession } from "./types.js";

// ===== ルーター =====

export async function handleComponent(interaction: DiscordInteraction, env: Env): Promise<Response> {
  const customId = interaction.data?.custom_id ?? "";

  // ===== 担当者選択（タスク追加の最初のステップ）=====
  if (customId.startsWith("assignee:"))     return handleAssigneeSelect(interaction, env, customId);
  if (customId.startsWith("assignee_all:")) return handleAssigneeAll(interaction, env, customId);

  // ===== カレンダーピッカー（タスク追加）=====
  if (customId.startsWith("csy:")) return handleCalStartYear(interaction, env, customId);
  if (customId.startsWith("csm:")) return handleCalStartMonth(interaction, customId);
  if (customId.startsWith("csd:")) return handleCalStartDay(interaction, customId);
  if (customId.startsWith("cdy:")) return handleCalDueYear(interaction, customId);
  if (customId.startsWith("cdm:")) return handleCalDueMonth(interaction, customId);
  if (customId.startsWith("cdd:")) return handleCalDueDay(interaction, customId);
  if (customId.startsWith("confirm:")) return handleConfirm(interaction, env, customId);

  // ===== カレンダーピッカー（日程編集）=====
  if (customId.startsWith("ecy:")) return handleEditCalStartYear(interaction, customId);
  if (customId.startsWith("ecm:")) return handleEditCalStartMonth(interaction, customId);
  if (customId.startsWith("ecd:")) return handleEditCalStartDay(interaction, env, customId);
  if (customId.startsWith("edy:")) return handleEditCalDueYear(interaction, customId);
  if (customId.startsWith("edm:")) return handleEditCalDueMonth(interaction, customId);
  if (customId.startsWith("edd:")) return handleEditCalDueDay(interaction, customId);
  if (customId.startsWith("editdates:")) return handleEditDates(interaction, env, customId);

  // ===== タスク編集ボタン =====
  if (customId.startsWith("edit_title:"))    return handleEditTitleBtn(interaction, env, customId);
  if (customId.startsWith("edit_dates:"))    return handleEditDatesBtn(interaction, env, customId);
  if (customId.startsWith("edit_note:"))     return handleEditNoteBtn(interaction, env, customId);
  if (customId.startsWith("edit_status:"))   return handleEditStatus(interaction, env, customId);
  if (customId.startsWith("edit_priority:")) return handleEditPriority(interaction, env, customId);
  if (customId.startsWith("edit_category:")) return handleEditCategory(interaction, env, customId);

  // ===== ステータスボタン（タスクカード）=====
  if (customId.startsWith("status:")) return handleStatusBtn(interaction, env, customId);

  // ===== スケジュール月移動 =====
  if (customId.startsWith("sched:")) return handleSchedNav(interaction, env, customId);

  return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ 不明な操作です。", flags: 64 } });
}

// ===== 担当者選択 =====

async function handleAssigneeSelect(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const sessionKey = customId.split(":")[1];
  const userIds    = i.data?.values ?? [];

  const raw = await env.KV.get(`session:${sessionKey}`);
  if (!raw) {
    return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: { content: "❌ セッションが期限切れです。/task_addからやり直してください。", components: [] } });
  }
  const session: TaskSession & { assign_everyone?: boolean } = JSON.parse(raw);

  // 名前を解決
  const names: string[] = userIds.map(id => {
    const resolved = i.data?.resolved?.users?.[id];
    const member   = i.data?.resolved?.members?.[id];
    return member?.nick ?? resolved?.global_name ?? resolved?.username ?? id;
  });

  session.assignee_ids    = userIds;
  session.assignee_names  = names;
  session.assign_everyone = false;
  await env.KV.put(`session:${sessionKey}`, JSON.stringify(session), { expirationTtl: 900 });

  // 開始日カレンダーへ
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: calStartYearMessage(sessionKey) });
}

async function handleAssigneeAll(_i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const sessionKey = customId.split(":")[1];

  const raw = await env.KV.get(`session:${sessionKey}`);
  if (!raw) {
    return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: { content: "❌ セッションが期限切れです。", components: [] } });
  }
  const session: TaskSession & { assign_everyone?: boolean } = JSON.parse(raw);
  session.assign_everyone = true;
  session.assignee_ids    = [];
  session.assignee_names  = [];
  await env.KV.put(`session:${sessionKey}`, JSON.stringify(session), { expirationTtl: 900 });

  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: calStartYearMessage(sessionKey) });
}

// ===== カレンダーピッカー（タスク追加）実装 =====

async function handleCalStartYear(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const [, sessionKey] = customId.split(":");
  const year = i.data?.values?.[0] ?? "";
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: calStartMonthMessage(sessionKey, year) });
}

async function handleCalStartMonth(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, year] = customId.split(":");
  const month = i.data?.values?.[0] ?? "";
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: calStartDayMessage(sessionKey, year, month) });
}

async function handleCalStartDay(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, year, month] = customId.split(":");
  const day       = i.data?.values?.[0] ?? "";
  const startDate = `${year}-${month}-${day}`;
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: calDueYearMessage(sessionKey, startDate) });
}

async function handleCalDueYear(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, startDate] = customId.split(":");
  const year = i.data?.values?.[0] ?? "";
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: calDueMonthMessage(sessionKey, startDate, year) });
}

async function handleCalDueMonth(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, startDate, year] = customId.split(":");
  const month = i.data?.values?.[0] ?? "";
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: calDueDayMessage(sessionKey, startDate, year, month) });
}

async function handleCalDueDay(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, startDate, year, month] = customId.split(":");
  const day     = i.data?.values?.[0] ?? "";
  const dueDate = `${year}-${month}-${day}`;

  if (dueDate < startDate) {
    return jsonResponse({
      type: ICT.UPDATE_MESSAGE,
      data: {
        content: "❌ 締切日は開始日以降にしてください。\n再度選択してください。",
        components: [],
      },
    });
  }
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: calConfirmMessage(sessionKey, startDate, dueDate) });
}

async function handleConfirm(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const parts     = customId.split(":");
  const sessionKey = parts[1];
  const startDate  = parts[2];
  const dueDate    = parts[3];

  const raw = await env.KV.get(`session:${sessionKey}`);
  if (!raw) {
    return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: { content: "❌ セッションが期限切れです。コマンドからやり直してください。", components: [] } });
  }
  const session: TaskSession & { assign_everyone?: boolean } = JSON.parse(raw);

  const assigneeIds   = session.assign_everyone ? "everyone" : JSON.stringify(session.assignee_ids);
  const assigneeNames = session.assign_everyone ? "全員"     : JSON.stringify(session.assignee_names);

  const taskId = await addTask(env, {
    guild_id:       session.guild_id,
    title:          session.title,
    assignee_ids:   assigneeIds,
    assignee_names: assigneeNames,
    category:       session.category,
    start_date:     startDate,
    due_date:       dueDate,
    status:         "todo",
    priority:       session.priority,
    note:           session.note,
    created_by:     session.user_name,
    created_at:     nowJST(),
  });

  await env.KV.delete(`session:${sessionKey}`);

  const task = await getTask(env, taskId);
  if (!task) {
    return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: { content: "✅ タスクを作成しました。", components: [] } });
  }

  const embed = makeTaskEmbed(task);
  embed.title = `✅ タスクを作成しました: ${task.title}`;

  // 公開オプションが有効な場合、チャンネルへ全員向けに投稿
  if (session.is_public) {
    const publicEmbed = makeTaskEmbed(task);
    publicEmbed.title = `📋 新しいタスクが追加されました: ${task.title}`;
    await sendFollowup(i.application_id, i.token, {
      embeds: [publicEmbed],
      components: [makeStatusButtons(taskId)],
    });
  }

  return jsonResponse({
    type: ICT.UPDATE_MESSAGE,
    data: {
      content: session.is_public ? "✅ タスクを作成し、チャンネルに通知しました。" : "",
      embeds: [embed],
      components: [makeStatusButtons(taskId)],
    },
  });
}

// ===== カレンダーピッカー（日程編集）実装 =====

async function handleEditCalStartYear(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey] = customId.split(":");
  const year = i.data?.values?.[0] ?? "";
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: editStartMonthMessage(sessionKey, year) });
}

async function handleEditCalStartMonth(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, year] = customId.split(":");
  const month = i.data?.values?.[0] ?? "";
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: editStartDayMessage(sessionKey, year, month) });
}

async function handleEditCalStartDay(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const [, sessionKey, year, month] = customId.split(":");
  const day       = i.data?.values?.[0] ?? "";
  const startDate = `${year}-${month}-${day}`;
  // セッションに開始日を保存
  const raw = await env.KV.get(`edit:${sessionKey}`);
  if (raw) {
    const sess: EditSession = JSON.parse(raw);
    sess.start_date = startDate;
    await env.KV.put(`edit:${sessionKey}`, JSON.stringify(sess), { expirationTtl: 900 });
  }
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: editDueYearMessage(sessionKey, startDate) });
}

async function handleEditCalDueYear(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, startDate] = customId.split(":");
  const year = i.data?.values?.[0] ?? "";
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: editDueMonthMessage(sessionKey, startDate, year) });
}

async function handleEditCalDueMonth(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, startDate, year] = customId.split(":");
  const month = i.data?.values?.[0] ?? "";
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: editDueDayMessage(sessionKey, startDate, year, month) });
}

async function handleEditCalDueDay(i: DiscordInteraction, customId: string): Promise<Response> {
  const [, sessionKey, startDate, year, month] = customId.split(":");
  const day     = i.data?.values?.[0] ?? "";
  const dueDate = `${year}-${month}-${day}`;
  if (dueDate < startDate) {
    return jsonResponse({
      type: ICT.UPDATE_MESSAGE,
      data: { content: "❌ 締切日は開始日以降にしてください。再度選択してください。", components: [] },
    });
  }
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: editDatesConfirmMessage(sessionKey, startDate, dueDate) });
}

async function handleEditDates(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const parts      = customId.split(":");
  const sessionKey = parts[1];
  const startDate  = parts[2];
  const dueDate    = parts[3];

  const raw = await env.KV.get(`edit:${sessionKey}`);
  if (!raw) {
    return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: { content: "❌ セッションが期限切れです。", components: [] } });
  }
  const sess: EditSession = JSON.parse(raw);
  await updateTaskDates(env, sess.task_id, startDate, dueDate);
  await env.KV.delete(`edit:${sessionKey}`);

  const task = await getTask(env, sess.task_id);
  const embed = task ? makeTaskEmbed(task) : { title: "タスク更新済み", color: 0x57f287, fields: [] };
  return jsonResponse({
    type: ICT.UPDATE_MESSAGE,
    data: {
      content: `✅ タスク #${sess.task_id} の日程を更新しました。`,
      embeds: [embed],
      components: [],
    },
  });
}

// ===== 編集ボタン =====

async function handleEditTitleBtn(_i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const sessionKey = customId.split(":")[1];
  const raw = await env.KV.get(`edit:${sessionKey}`);
  if (!raw) return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ セッション期限切れ。", flags: 64 } });
  const sess: EditSession = JSON.parse(raw);
  const task = await getTask(env, sess.task_id);
  return titleEditModal(sessionKey, task?.title ?? "");
}

async function handleEditNoteBtn(_i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const sessionKey = customId.split(":")[1];
  const raw = await env.KV.get(`edit:${sessionKey}`);
  if (!raw) return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ セッション期限切れ。", flags: 64 } });
  const sess: EditSession = JSON.parse(raw);
  const task = await getTask(env, sess.task_id);
  return noteEditModal(sessionKey, task?.note ?? "");
}

async function handleEditDatesBtn(_i: DiscordInteraction, _env: Env, customId: string): Promise<Response> {
  const sessionKey = customId.split(":")[1];
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data: { ...editStartYearMessage(sessionKey), flags: 64 } });
}

async function handleEditStatus(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const sessionKey = customId.split(":")[1];
  const newStatus  = i.data?.values?.[0] ?? "";
  const raw = await env.KV.get(`edit:${sessionKey}`);
  if (!raw) return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ セッション期限切れ。", flags: 64 } });
  const sess: EditSession = JSON.parse(raw);
  await updateTaskStatus(env, sess.task_id, newStatus);
  const task  = await getTask(env, sess.task_id);
  const embed = task ? makeTaskEmbed(task) : null;
  return jsonResponse({
    type: ICT.UPDATE_MESSAGE,
    data: {
      content: `✅ ステータスを **${STATUSES[newStatus]}** に変更しました。`,
      embeds: embed ? [embed] : [],
    },
  });
}

async function handleEditPriority(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const sessionKey  = customId.split(":")[1];
  const newPriority = i.data?.values?.[0] ?? "";
  const raw = await env.KV.get(`edit:${sessionKey}`);
  if (!raw) return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ セッション期限切れ。", flags: 64 } });
  const sess: EditSession = JSON.parse(raw);
  await updateTaskPriority(env, sess.task_id, newPriority);
  const task  = await getTask(env, sess.task_id);
  const embed = task ? makeTaskEmbed(task) : null;
  return jsonResponse({
    type: ICT.UPDATE_MESSAGE,
    data: {
      content: `✅ 優先度を **${PRIORITIES[newPriority]}** に変更しました。`,
      embeds: embed ? [embed] : [],
    },
  });
}

async function handleEditCategory(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const sessionKey  = customId.split(":")[1];
  const newCategory = i.data?.values?.[0] ?? "";
  const raw = await env.KV.get(`edit:${sessionKey}`);
  if (!raw) return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ セッション期限切れ。", flags: 64 } });
  const sess: EditSession = JSON.parse(raw);
  await updateTaskCategory(env, sess.task_id, newCategory);
  const task  = await getTask(env, sess.task_id);
  const embed = task ? makeTaskEmbed(task) : null;
  return jsonResponse({
    type: ICT.UPDATE_MESSAGE,
    data: {
      content: `✅ カテゴリを **${CATEGORIES[newCategory]}** に変更しました。`,
      embeds: embed ? [embed] : [],
    },
  });
}

// ===== ステータスボタン（タスクカード上）=====

async function handleStatusBtn(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const [, taskIdStr, newStatus] = customId.split(":");
  const taskId = Number(taskIdStr);
  await updateTaskStatus(env, taskId, newStatus);
  const task  = await getTask(env, taskId);
  if (!task) return jsonResponse({ type: ICT.CHANNEL_MESSAGE, data: { content: "❌ タスクが見つかりません。", flags: 64 } });
  const embed = makeTaskEmbed(task);
  const updater = i.member?.nick ?? i.member?.user.global_name ?? i.member?.user.username ?? "Unknown";
  embed.footer  = { text: `更新者: ${updater}  |  ${nowJST()}` };
  return jsonResponse({
    type: ICT.UPDATE_MESSAGE,
    data: { embeds: [embed], components: [makeStatusButtons(taskId)] },
  });
}

// ===== スケジュール月移動 =====

async function handleSchedNav(i: DiscordInteraction, env: Env, customId: string): Promise<Response> {
  const [, yearStr, monthStr] = customId.split(":");
  const year    = Number(yearStr);
  const month   = Number(monthStr);
  const guildId = i.guild_id ?? "dm";
  const data    = await buildScheduleData(guildId, env, year, month);
  return jsonResponse({ type: ICT.UPDATE_MESSAGE, data });
}

// ===== ヘルパー =====

function makeStatusButtons(taskId: number) {
  return {
    type: CT.ACTION_ROW,
    components: [
      { type: CT.BUTTON, style: BS.SECONDARY, custom_id: `status:${taskId}:todo`,        label: "⬜ 未着手" },
      { type: CT.BUTTON, style: BS.PRIMARY,   custom_id: `status:${taskId}:in_progress`, label: "🔄 進行中" },
      { type: CT.BUTTON, style: BS.SUCCESS,   custom_id: `status:${taskId}:done`,        label: "✅ 完了" },
    ],
  };
}
