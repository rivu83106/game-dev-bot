import discord
from discord import app_commands
from discord.ext import commands
import json
import os
from datetime import datetime

# ===================================================
# 設定
# ===================================================
TOKEN = os.environ.get("DISCORD_TOKEN")  # Railway上で設定する環境変数

DATA_FILE = "tasks.json"

MONTHS = ["7月", "8月", "9月", "10月", "11月", "12月"]
MONTH_NUMS = [7, 8, 9, 10, 11, 12]

CATEGORIES = {
    "planning":    "📋 企画・設計",
    "programming": "💻 プログラム",
    "art":         "🎨 アート・UI",
    "sound":       "🎵 サウンド",
    "qa":          "🔍 QA・テスト",
    "other":       "📌 その他",
}

STATUSES = {
    "todo":        "⬜ 未着手",
    "in_progress": "🔄 進行中",
    "done":        "✅ 完了",
}

STATUS_COLORS = {
    "todo":        discord.Color.light_grey(),
    "in_progress": discord.Color.yellow(),
    "done":        discord.Color.green(),
}

# ===================================================
# データ読み書き
# ===================================================
def load_data():
    if not os.path.exists(DATA_FILE):
        return {"tasks": []}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def next_id(tasks):
    if not tasks:
        return 1
    return max(t["id"] for t in tasks) + 1

# ===================================================
# Bot 初期化
# ===================================================
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    await bot.tree.sync()
    print(f"✅ Botが起動しました: {bot.user}")

# ===================================================
# /task_add  タスクを追加する
# ===================================================
@bot.tree.command(name="task_add", description="タスクを追加します")
@app_commands.describe(
    title="タスク名（例：バトルシステム実装）",
    assignee="担当者のDiscordユーザー",
    category="カテゴリ",
    start_month="開始月（7〜12）",
    end_month="終了月（7〜12）",
    note="メモ・詳細（省略可）",
)
@app_commands.choices(
    category=[app_commands.Choice(name=v, value=k) for k, v in CATEGORIES.items()],
    start_month=[app_commands.Choice(name=m, value=n) for m, n in zip(MONTHS, MONTH_NUMS)],
    end_month=[app_commands.Choice(name=m, value=n) for m, n in zip(MONTHS, MONTH_NUMS)],
)
async def task_add(
    interaction: discord.Interaction,
    title: str,
    assignee: discord.Member,
    category: str,
    start_month: int,
    end_month: int,
    note: str = "",
):
    if end_month < start_month:
        await interaction.response.send_message("❌ 終了月は開始月以降にしてください。", ephemeral=True)
        return

    data = load_data()
    task = {
        "id": next_id(data["tasks"]),
        "title": title,
        "assignee_id": assignee.id,
        "assignee_name": assignee.display_name,
        "category": category,
        "start_month": start_month,
        "end_month": end_month,
        "status": "todo",
        "note": note,
        "created_by": interaction.user.display_name,
        "created_at": datetime.now().strftime("%Y/%m/%d %H:%M"),
    }
    data["tasks"].append(task)
    save_data(data)

    embed = discord.Embed(
        title=f"✅ タスクを追加しました",
        description=f"**{title}**",
        color=discord.Color.blue(),
    )
    embed.add_field(name="担当者", value=assignee.mention, inline=True)
    embed.add_field(name="カテゴリ", value=CATEGORIES.get(category, category), inline=True)
    embed.add_field(name="期間", value=f"{MONTHS[start_month-7]}〜{MONTHS[end_month-7]}", inline=True)
    embed.add_field(name="ステータス", value=STATUSES["todo"], inline=True)
    embed.add_field(name="ID", value=f"#{task['id']}", inline=True)
    if note:
        embed.add_field(name="メモ", value=note, inline=False)
    embed.set_footer(text=f"追加者: {interaction.user.display_name}")
    await interaction.response.send_message(embed=embed)

# ===================================================
# /task_list  タスク一覧を表示する
# ===================================================
@bot.tree.command(name="task_list", description="タスク一覧を表示します")
@app_commands.describe(
    filter_status="絞り込みたいステータス（省略するとすべて表示）",
    filter_member="特定のメンバーで絞り込む（省略するとすべて表示）",
)
@app_commands.choices(
    filter_status=[
        app_commands.Choice(name="すべて", value="all"),
        app_commands.Choice(name="⬜ 未着手", value="todo"),
        app_commands.Choice(name="🔄 進行中", value="in_progress"),
        app_commands.Choice(name="✅ 完了", value="done"),
    ]
)
async def task_list(
    interaction: discord.Interaction,
    filter_status: str = "all",
    filter_member: discord.Member = None,
):
    data = load_data()
    tasks = data["tasks"]

    if filter_status != "all":
        tasks = [t for t in tasks if t["status"] == filter_status]
    if filter_member:
        tasks = [t for t in tasks if t["assignee_id"] == filter_member.id]

    if not tasks:
        await interaction.response.send_message("📭 タスクはありません。", ephemeral=True)
        return

    total = len(data["tasks"])
    done = len([t for t in data["tasks"] if t["status"] == "done"])
    pct = round(done / total * 100) if total > 0 else 0

    embed = discord.Embed(
        title="📋 タスク一覧",
        description=f"**全体進捗: {pct}% ({done}/{total} 完了)**",
        color=discord.Color.blurple(),
    )

    for status_key, status_label in STATUSES.items():
        group = [t for t in tasks if t["status"] == status_key]
        if not group:
            continue
        lines = []
        for t in group:
            period = f"{MONTHS[t['start_month']-7]}〜{MONTHS[t['end_month']-7]}"
            lines.append(f"`#{t['id']}` {t['title']} ｜ **{t['assignee_name']}** ｜ {period}")
        embed.add_field(
            name=f"{status_label} ({len(group)}件)",
            value="\n".join(lines),
            inline=False,
        )

    await interaction.response.send_message(embed=embed)

# ===================================================
# /task_done  タスクを完了にする
# ===================================================
@bot.tree.command(name="task_done", description="タスクを完了にします")
@app_commands.describe(task_id="完了にするタスクのID（/task_listで確認できます）")
async def task_done(interaction: discord.Interaction, task_id: int):
    data = load_data()
    task = next((t for t in data["tasks"] if t["id"] == task_id), None)

    if not task:
        await interaction.response.send_message(f"❌ ID #{task_id} のタスクは見つかりませんでした。", ephemeral=True)
        return

    old_status = task["status"]
    task["status"] = "done"
    task["done_at"] = datetime.now().strftime("%Y/%m/%d %H:%M")
    task["done_by"] = interaction.user.display_name
    save_data(data)

    embed = discord.Embed(
        title="✅ タスクを完了しました！",
        description=f"**{task['title']}**",
        color=discord.Color.green(),
    )
    embed.add_field(name="担当者", value=task["assignee_name"], inline=True)
    embed.add_field(name="完了者", value=interaction.user.display_name, inline=True)
    await interaction.response.send_message(embed=embed)

# ===================================================
# /task_status  ステータスを変更する
# ===================================================
@bot.tree.command(name="task_status", description="タスクのステータスを変更します")
@app_commands.describe(
    task_id="変更するタスクのID",
    new_status="新しいステータス",
)
@app_commands.choices(
    new_status=[app_commands.Choice(name=v, value=k) for k, v in STATUSES.items()]
)
async def task_status(interaction: discord.Interaction, task_id: int, new_status: str):
    data = load_data()
    task = next((t for t in data["tasks"] if t["id"] == task_id), None)

    if not task:
        await interaction.response.send_message(f"❌ ID #{task_id} のタスクは見つかりませんでした。", ephemeral=True)
        return

    task["status"] = new_status
    save_data(data)

    embed = discord.Embed(
        title="🔄 ステータスを変更しました",
        description=f"**{task['title']}**",
        color=STATUS_COLORS.get(new_status, discord.Color.default()),
    )
    embed.add_field(name="新しいステータス", value=STATUSES[new_status], inline=True)
    embed.add_field(name="担当者", value=task["assignee_name"], inline=True)
    await interaction.response.send_message(embed=embed)

# ===================================================
# /task_delete  タスクを削除する
# ===================================================
@bot.tree.command(name="task_delete", description="タスクを削除します")
@app_commands.describe(task_id="削除するタスクのID")
async def task_delete(interaction: discord.Interaction, task_id: int):
    data = load_data()
    task = next((t for t in data["tasks"] if t["id"] == task_id), None)

    if not task:
        await interaction.response.send_message(f"❌ ID #{task_id} のタスクは見つかりませんでした。", ephemeral=True)
        return

    data["tasks"] = [t for t in data["tasks"] if t["id"] != task_id]
    save_data(data)

    await interaction.response.send_message(f"🗑️ タスク **{task['title']}** (#{task_id}) を削除しました。")

# ===================================================
# /schedule  ガントチャート風のスケジュールを表示する
# ===================================================
@bot.tree.command(name="schedule", description="ガントチャート風のスケジュールを表示します")
async def schedule(interaction: discord.Interaction):
    data = load_data()
    tasks = data["tasks"]

    if not tasks:
        await interaction.response.send_message("📭 タスクがありません。", ephemeral=True)
        return

    header = "```\n"
    header += f"{'タスク名':<18} {'担当':<8} "
    for m in MONTHS:
        header += f"{m:<5}"
    header += "\n"
    header += "─" * (18 + 8 + 2 + 5 * 6) + "\n"

    rows = ""
    for t in sorted(tasks, key=lambda x: x["start_month"]):
        bar = ""
        done = t["status"] == "done"
        ip   = t["status"] == "in_progress"
        for m in MONTH_NUMS:
            if t["start_month"] <= m <= t["end_month"]:
                bar += "██" if done else ("▓▓" if ip else "░░")
            else:
                bar += "  "
            bar += "   "
        title_trunc = t["title"][:16] if len(t["title"]) > 16 else t["title"]
        assignee_trunc = t["assignee_name"][:7] if len(t["assignee_name"]) > 7 else t["assignee_name"]
        rows += f"{title_trunc:<18} {assignee_trunc:<8} {bar}\n"

    footer = "\n██ 完了  ▓▓ 進行中  ░░ 未着手\n```"

    total = len(tasks)
    done_count = len([t for t in tasks if t["status"] == "done"])
    pct = round(done_count / total * 100) if total > 0 else 0

    embed = discord.Embed(
        title=f"📅 スケジュール（7月〜12月）",
        description=header + rows + footer,
        color=discord.Color.blurple(),
    )
    embed.set_footer(text=f"全体進捗: {pct}% ({done_count}/{total} 完了)")
    await interaction.response.send_message(embed=embed)

# ===================================================
# /my_tasks  自分のタスクを確認する
# ===================================================
@bot.tree.command(name="my_tasks", description="自分のタスク一覧を表示します")
async def my_tasks(interaction: discord.Interaction):
    data = load_data()
    tasks = [t for t in data["tasks"] if t["assignee_id"] == interaction.user.id]

    if not tasks:
        await interaction.response.send_message("📭 あなたのタスクはありません。", ephemeral=True)
        return

    embed = discord.Embed(
        title=f"📌 {interaction.user.display_name} のタスク",
        color=discord.Color.og_blurple(),
    )
    for status_key, status_label in STATUSES.items():
        group = [t for t in tasks if t["status"] == status_key]
        if not group:
            continue
        lines = [f"`#{t['id']}` {t['title']} ({MONTHS[t['start_month']-7]}〜{MONTHS[t['end_month']-7]})" for t in group]
        embed.add_field(name=f"{status_label}", value="\n".join(lines), inline=False)

    await interaction.response.send_message(embed=embed, ephemeral=True)

# ===================================================
# /help_game  コマンド一覧を表示する
# ===================================================
@bot.tree.command(name="help_game", description="Botのコマンド一覧を表示します")
async def help_game(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🎮 ゲーム開発タスク管理Bot - コマンド一覧",
        color=discord.Color.blurple(),
    )
    commands_info = [
        ("/task_add",    "タスクを追加する（担当者・期間・カテゴリを指定）"),
        ("/task_list",   "タスク一覧を表示する（ステータス・メンバーで絞り込み可）"),
        ("/task_done",   "タスクをIDを指定して完了にする"),
        ("/task_status", "タスクのステータスを変更する"),
        ("/task_delete", "タスクをIDを指定して削除する"),
        ("/schedule",    "ガントチャート風のスケジュールを表示する"),
        ("/my_tasks",    "自分のタスク一覧を表示する（自分だけ見える）"),
        ("/help_game",   "このコマンド一覧を表示する"),
    ]
    for cmd, desc in commands_info:
        embed.add_field(name=cmd, value=desc, inline=False)
    embed.set_footer(text="タスクIDは /task_list で確認できます")
    await interaction.response.send_message(embed=embed)

# ===================================================
# 起動
# ===================================================
bot.run(TOKEN)
