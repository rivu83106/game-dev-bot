import { getAllGuildSettings, getTasksDueOn } from "./db.js";
import { sendChannelMessage, sendDM } from "./discord-api.js";
import { todayJST, addDays, getAssigneeIds, getAssigneeNames } from "./utils.js";
import { PRIORITIES, CATEGORIES } from "./constants.js";
import type { Env, Task } from "./types.js";

export async function runReminder(env: Env): Promise<void> {
  const settings = await getAllGuildSettings(env);
  const today    = todayJST();
  const in7days  = addDays(today, 7);
  const in1day   = addDays(today, 1);

  for (const guild of settings) {
    if (!guild.remind_channel_id) continue;

    const tasks7 = await getTasksDueOn(env, guild.guild_id, in7days);
    const tasks1 = await getTasksDueOn(env, guild.guild_id, in1day);

    if (tasks7.length === 0 && tasks1.length === 0) continue;

    // チャンネルへの一覧通知
    await sendChannelRemind(guild.remind_channel_id, env.DISCORD_TOKEN, tasks7, tasks1, today);

    // 個人へのDM通知
    await sendPersonalReminders(env.DISCORD_TOKEN, tasks7, tasks1);
  }
}

async function sendChannelRemind(
  channelId: string,
  token: string,
  tasks7: Task[],
  tasks1: Task[],
  today: string
): Promise<void> {
  const fields: unknown[] = [];

  if (tasks7.length > 0) {
    fields.push({
      name: `🔔 1週間後に締切 (${tasks7.length}件)`,
      value: tasks7.map(t => formatTask(t)).join("\n"),
      inline: false,
    });
  }
  if (tasks1.length > 0) {
    fields.push({
      name: `🚨 明日締切 (${tasks1.length}件)`,
      value: tasks1.map(t => formatTask(t)).join("\n"),
      inline: false,
    });
  }

  const [y, m, d] = today.split("-");
  await sendChannelMessage(channelId, token, {
    embeds: [{
      title: "⏰ 締切リマインド",
      description: `${y}年${parseInt(m)}月${parseInt(d)}日`,
      color: 0xed4245,
      fields,
    }],
  });
}

async function sendPersonalReminders(
  token: string,
  tasks7: Task[],
  tasks1: Task[]
): Promise<void> {
  const userMap = new Map<string, { tasks7: Task[]; tasks1: Task[] }>();

  for (const t of tasks7) {
    const ids = getAssigneeIds(t);
    for (const id of ids) {
      if (!userMap.has(id)) userMap.set(id, { tasks7: [], tasks1: [] });
      userMap.get(id)!.tasks7.push(t);
    }
  }
  for (const t of tasks1) {
    const ids = getAssigneeIds(t);
    for (const id of ids) {
      if (!userMap.has(id)) userMap.set(id, { tasks7: [], tasks1: [] });
      userMap.get(id)!.tasks1.push(t);
    }
  }

  for (const [userId, { tasks7: u7, tasks1: u1 }] of userMap) {
    const fields: unknown[] = [];
    if (u7.length > 0) {
      fields.push({
        name: "🔔 1週間後に締切",
        value: u7.map(t => formatTask(t)).join("\n"),
        inline: false,
      });
    }
    if (u1.length > 0) {
      fields.push({
        name: "🚨 明日締切",
        value: u1.map(t => formatTask(t)).join("\n"),
        inline: false,
      });
    }
    await sendDM(userId, token, {
      embeds: [{
        title: "⏰ タスク締切リマインド",
        color: 0xed4245,
        fields,
        footer: { text: "ゲーム開発タスク管理Bot" },
      }],
    });
  }
}

function formatTask(t: Task): string {
  const cat  = CATEGORIES[t.category] ?? t.category;
  const pri  = PRIORITIES[t.priority] ?? t.priority;
  const name = getAssigneeNames(t);
  return `• \`#${t.id}\` **${t.title}**  ${cat} ｜ ${pri}\n　締切: ${t.due_date}  担当: ${name}`;
}
