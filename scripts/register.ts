// Discord スラッシュコマンド登録スクリプト
//
// Guild（即時反映, デフォルト）:
//   npm run register          -- DISCORD_GUILD_ID が必要
//   npx tsx scripts/register.ts guild
//
// Global（最大1時間, 本番リリース時）:
//   npm run register:global
//   npx tsx scripts/register.ts global
//
// 環境変数: DISCORD_TOKEN, DISCORD_APPLICATION_ID, [DISCORD_GUILD_ID]
// プロジェクトルートに .env ファイルを置けば自動で読み込みます。

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

try {
  const envText = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch { /* .env なしでもOK */ }

const TOKEN    = process.env.DISCORD_TOKEN!;
const APP_ID   = process.env.DISCORD_APPLICATION_ID!;
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

// コマンドライン引数: "guild" | "global" (デフォルト "guild")
const mode = (process.argv[2] ?? "guild") === "global" ? "global" : "guild";

if (!TOKEN || !APP_ID) {
  console.error("❌ DISCORD_TOKEN と DISCORD_APPLICATION_ID を設定してください。");
  process.exit(1);
}
if (mode === "guild" && !GUILD_ID) {
  console.error("❌ Guild モードでは DISCORD_GUILD_ID を設定してください。");
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
  { name: "🟢 低",   value: "low" },
  { name: "🟡 中",   value: "medium" },
  { name: "🔴 高",   value: "high" },
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
    description: "タスクを追加します（担当者・カレンダーで日付を選択）",
    options: [
      { type: 3, name: "title",    description: "タスク名",             required: true },
      { type: 3, name: "category", description: "カテゴリ",             required: true, choices: CATEGORIES },
      { type: 3, name: "priority", description: "優先度",               required: true, choices: PRIORITIES },
      { type: 3, name: "note",     description: "メモ・詳細（省略可）", required: false },
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
      { type: 4, name: "id",         description: "対象タスクID",                      required: true },
      { type: 3, name: "action",     description: "操作",                              required: true, choices: [{ name: "追加", value: "add" }, { name: "削除", value: "remove" }, { name: "一覧", value: "list" }] },
      { type: 4, name: "depends_on", description: "依存先タスクID（add/removeのみ）",  required: false },
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

async function clearGlobalCommands() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;
  console.log("🧹 Global コマンドをクリアしています...");
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bot ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([]),
  });
  if (res.ok) {
    console.log("✅ Global コマンドをクリアしました。");
  } else {
    console.warn("⚠️  Global クリア失敗（続行します）:", await res.text());
  }
}

async function register() {
  // Guild モードの場合は古い Global コマンドを先にクリア
  if (mode === "guild") {
    await clearGlobalCommands();
  }

  const url = mode === "guild"
    ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  console.log(`📡 モード: ${mode === "guild" ? `Guild (${GUILD_ID})` : "Global"}`);
  console.log(`🔗 URL: ${url}`);

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

  const data = await res.json() as { name: string; id: string }[];
  console.log(`✅ ${data.length} 件のコマンドを登録しました。`);
  for (const cmd of data) {
    console.log(`  /${cmd.name} (ID: ${cmd.id})`);
  }

  if (mode === "global") {
    console.log("\n⏳ Global コマンドはDiscord全体への反映に最大1時間かかります。");
    console.log("   すぐ確認したい場合は Guild モードを使ってください:");
    console.log("   npm run register");
  } else {
    console.log("\n⚡ Guild コマンドは即時反映されます。");
    console.log("   本番リリース時は Global に切り替えてください:");
    console.log("   npm run register:global");
  }
}

register().catch(console.error);
