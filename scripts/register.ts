// Discord スラッシュコマンド登録スクリプト
// 実行: npx tsx scripts/register.ts
// 環境変数: DISCORD_TOKEN, DISCORD_APPLICATION_ID

const TOKEN  = process.env.DISCORD_TOKEN!;
const APP_ID = process.env.DISCORD_APPLICATION_ID!;

if (!TOKEN || !APP_ID) {
  console.error("DISCORD_TOKEN と DISCORD_APPLICATION_ID を環境変数に設定してください。");
  process.exit(1);
}

const CATEGORIES = [
  { name: "📋 企画・設計",  value: "planning" },
  { name: "💻 プログラム",  value: "programming" },
  { name: "🎨 アート・UI", value: "art" },
  { name: "🎵 サウンド",    value: "sound" },
  { name: "🔍 QA・テスト", value: "qa" },
  { name: "📌 その他",      value: "other" },
];

const PRIORITIES = [
  { name: "🟢 低",  value: "low" },
  { name: "🟡 中",  value: "medium" },
  { name: "🔴 高",  value: "high" },
  { name: "🚨 緊急", value: "urgent" },
];

const STATUSES = [
  { name: "⬜ 未着手",  value: "todo" },
  { name: "🔄 進行中", value: "in_progress" },
  { name: "✅ 完了",   value: "done" },
];

const commands = [
  {
    name: "task_add",
    description: "タスクを追加します（カレンダーで日付選択）",
    options: [
      { type: 3, name: "title",           description: "タスク名",                         required: true },
      { type: 3, name: "category",        description: "カテゴリ",                         required: true,  choices: CATEGORIES },
      { type: 3, name: "priority",        description: "優先度",                           required: true,  choices: PRIORITIES },
      { type: 6, name: "assignee",        description: "担当者のDiscordユーザー",          required: false },
      { type: 5, name: "assign_everyone", description: "全員を担当者にする（省略=false）", required: false },
      { type: 3, name: "note",            description: "メモ・詳細（省略可）",             required: false },
    ],
  },
  {
    name: "task_list",
    description: "タスク一覧を表示します",
    options: [
      { type: 3, name: "filter_status", description: "絞り込みステータス", required: false, choices: [{ name: "すべて", value: "all" }, ...STATUSES] },
      { type: 6, name: "filter_member", description: "担当者で絞り込む",   required: false },
    ],
  },
  {
    name: "task_edit",
    description: "タスクを編集します",
    options: [
      { type: 4, name: "id", description: "タスクID（#番号）", required: true },
    ],
  },
  {
    name: "task_depends",
    description: "タスクの依存関係を管理します",
    options: [
      { type: 4, name: "id",         description: "対象タスクID",                   required: true },
      { type: 3, name: "action",     description: "操作",                           required: true, choices: [{ name: "追加", value: "add" }, { name: "削除", value: "remove" }, { name: "一覧", value: "list" }] },
      { type: 4, name: "depends_on", description: "依存先タスクID（add/removeのみ）", required: false },
    ],
  },
  {
    name: "schedule",
    description: "月別カレンダーでスケジュールを表示します",
  },
  {
    name: "my_tasks",
    description: "自分のタスク一覧を表示します（自分だけ見える）",
  },
  {
    name: "setup",
    description: "リマインド通知チャンネルを設定します（管理者用）",
    options: [
      { type: 7, name: "remind_channel", description: "リマインド通知先チャンネル", required: true },
    ],
  },
  {
    name: "help_game",
    description: "Botのコマンド一覧を表示します",
  },
];

async function register() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ コマンド登録失敗:", err);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✅ ${(data as unknown[]).length} 件のコマンドを登録しました。`);
  for (const cmd of data as { name: string; id: string }[]) {
    console.log(`  /${cmd.name} (ID: ${cmd.id})`);
  }
}

register().catch(console.error);
