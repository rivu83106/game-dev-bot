import { ICT } from "../constants.js";
import { jsonResponse } from "../utils.js";
import type { DiscordInteraction } from "../types.js";

export async function handleHelp(interaction: DiscordInteraction): Promise<Response> {
  const fields = [
    { name: "/task_add",      value: "タスクを追加（カレンダーで日付選択）",                           inline: false },
    { name: "/task_list",     value: "タスク一覧（ステータス・担当者で絞り込み可）",                   inline: false },
    { name: "/task_edit",     value: "タスクを編集（タイトル・日程・ステータス・優先度・担当者など）", inline: false },
    { name: "/task_depends",  value: "タスクの依存関係を管理（add / remove / list）",                  inline: false },
    { name: "/schedule",      value: "月別カレンダー表示（◀ ▶で月移動）",                            inline: false },
    { name: "/my_tasks",      value: "自分のタスク一覧（自分だけ見える）",                             inline: false },
    { name: "/setup",         value: "リマインドチャンネルを設定",                                      inline: false },
    { name: "/help_game",     value: "このヘルプを表示",                                                inline: false },
  ];

  return jsonResponse({
    type: ICT.CHANNEL_MESSAGE,
    data: {
      embeds: [{
        title: "🎮 ゲーム開発タスク管理Bot - コマンド一覧",
        color: 0x5865f2,
        fields,
        footer: { text: "リマインド: 締切1週間前・1日前に担当者へ通知 / 優先度・依存関係管理対応" },
      }],
      flags: 64,
    },
  });
}
