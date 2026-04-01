import discord
from discord import app_commands
from discord.ext import commands, tasks
import sqlite3
import os
from datetime import datetime, date, timedelta

# ===================================================
# 設定
# ===================================================
TOKEN = os.environ.get("DISCORD_TOKEN")
REMIND_CHANNEL_ID = int(os.environ.get("REMIND_CHANNEL_ID", "0"))  # リマインド送信先チャンネルID

DB_FILE = "tasks.db"

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
# DB 初期化
# ===================================================
def init_db():
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            assignee_id INTEGER NOT NULL,
            assignee_name TEXT NOT NULL,
            category    TEXT NOT NULL,
            start_date  TEXT NOT NULL,
            due_date    TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'todo',
            note        TEXT DEFAULT '',
            created_by  TEXT,
            created_at  TEXT
        )
    """)
    con.commit()
    con.close()

def get_all_tasks():
    con = sqlite3.connect(DB_FILE)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute("SELECT * FROM tasks ORDER BY due_date ASC")
    rows = [dict(r) for r in cur.fetchall()]
    con.close()
    return rows

def get_task(task_id):
    con = sqlite3.connect(DB_FILE)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute("SELECT * FROM tasks WHERE id=?", (task_id,))
    row = cur.fetchone()
    con.close()
    return dict(row) if row else None

def add_task(data: dict):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("""
        INSERT INTO tasks (title, assignee_id, assignee_name, category, start_date, due_date, note, created_by, created_at)
        VALUES (:title, :assignee_id, :assignee_name, :category, :start_date, :due_date, :note, :created_by, :created_at)
    """, data)
    task_id = cur.lastrowid
    con.commit()
    con.close()
    return task_id

def update_status(task_id, status):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("UPDATE tasks SET status=? WHERE id=?", (status, task_id))
    con.commit()
    con.close()

def delete_task(task_id):
    con = sqlite3.connect(DB_FILE)
    cur = con.cursor()
    cur.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    con.commit()
    con.close()

# ===================================================
# Bot 初期化
# ===================================================
intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    init_db()
    await bot.tree.sync()
    remind_loop.start()
    print(f"✅ Botが起動しました: {bot.user}")

# ===================================================
# Embedを作る共通関数
# ===================================================
def make_task_embed(task: dict) -> discord.Embed:
    status = task["status"]
    embed = discord.Embed(
        title=task["title"],
        color=STATUS_COLORS.get(status, discord.Color.default()),
    )
    embed.add_field(name="担当者", value=task["assignee_name"], inline=True)
    embed.add_field(name="ステータス", value=STATUSES.get(status, status), inline=True)
    embed.add_field(name="カテゴリ", value=CATEGORIES.get(task["category"], task["category"]), inline=True)
    embed.add_field(name="開始日", value=task["start_date"], inline=True)
    embed.add_field(name="締切日", value=task["due_date"], inline=True)
    embed.add_field(name="ID", value=f"#{task['id']}", inline=True)
    if task.get("note"):
        embed.add_field(name="メモ", value=task["note"], inline=False)
    return embed

# ===================================================
# ボタン付きViewクラス
# ===================================================
class TaskView(discord.ui.View):
    def __init__(self, task_id: int):
        super().__init__(timeout=None)
        self.task_id = task_id

    @discord.ui.button(label="⬜ 未着手", style=discord.ButtonStyle.secondary, custom_id="btn_todo")
    async def btn_todo(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._update(interaction, "todo")

    @discord.ui.button(label="🔄 進行中", style=discord.ButtonStyle.primary, custom_id="btn_in_progress")
    async def btn_in_progress(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._update(interaction, "in_progress")

    @discord.ui.button(label="✅ 完了", style=discord.ButtonStyle.success, custom_id="btn_done")
    async def btn_done(self, interaction: discord.Interaction, button: discord.ui.Button):
        await self._update(interaction, "done")

    @discord.ui.button(label="🗑 削除", style=discord.ButtonStyle.danger, custom_id="btn_delete")
    async def btn_delete(self, interaction: discord.Interaction, button: discord.ui.Button):
        task = get_task(self.task_id)
        if not task:
            await interaction.response.send_message("❌ タスクが見つかりません。", ephemeral=True)
            return
        delete_task(self.task_id)
        await interaction.response.edit_message(
            content=f"🗑️ タスク **{task['title']}** を削除しました。",
            embed=None,
            view=None,
        )

    async def _update(self, interaction: discord.Interaction, new_status: str):
        task = get_task(self.task_id)
        if not task:
            await interaction.response.send_message("❌ タスクが見つかりません。", ephemeral=True)
            return
        update_status(self.task_id, new_status)
        task["status"] = new_status
        embed = make_task_embed(task)
        embed.set_footer(text=f"更新者: {interaction.user.display_name}  |  {datetime.now().strftime('%Y/%m/%d %H:%M')}")
        await interaction.response.edit_message(embed=embed, view=self)

# ===================================================
# /task_add  タスクを追加する
# ===================================================
@bot.tree.command(name="task_add", description="タスクを追加します")
@app_commands.describe(
    title="タスク名（例：バトルシステム実装）",
    assignee="担当者のDiscordユーザー",
    category="カテゴリ",
    start_date="開始日（例：2026-07-01）",
    due_date="締切日（例：2026-08-15）",
    note="メモ・詳細（省略可）",
)
@app_commands.choices(
    category=[app_commands.Choice(name=v, value=k) for k, v in CATEGORIES.items()]
)
async def task_add(
    interaction: discord.Interaction,
    title: str,
    assignee: discord.Member,
    category: str,
    start_date: str,
    due_date: str,
    note: str = "",
):
    # 日付バリデーション
    try:
        sd = datetime.strptime(start_date, "%Y-%m-%d").date()
        dd = datetime.strptime(due_date, "%Y-%m-%d").date()
    except ValueError:
        await interaction.response.send_message(
            "❌ 日付の形式が正しくありません。`2026-07-01` のように入力してください。", ephemeral=True
        )
        return

    if dd < sd:
        await interaction.response.send_message("❌ 締切日は開始日以降にしてください。", ephemeral=True)
        return

    task_data = {
        "title": title,
        "assignee_id": assignee.id,
        "assignee_name": assignee.display_name,
        "category": category,
        "start_date": start_date,
        "due_date": due_date,
        "note": note,
        "created_by": interaction.user.display_name,
        "created_at": datetime.now().strftime("%Y/%m/%d %H:%M"),
    }
    task_id = add_task(task_data)
    task_data["id"] = task_id
    task_data["status"] = "todo"

    embed = make_task_embed(task_data)
    embed.set_author(name=f"✅ タスクを追加しました（追加者: {interaction.user.display_name}）")

    view = TaskView(task_id=task_id)
    await interaction.response.send_message(embed=embed, view=view)

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
    all_tasks = get_all_tasks()
    tasks = all_tasks

    if filter_status != "all":
        tasks = [t for t in tasks if t["status"] == filter_status]
    if filter_member:
        tasks = [t for t in tasks if t["assignee_id"] == filter_member.id]

    if not tasks:
        await interaction.response.send_message("📭 タスクはありません。", ephemeral=True)
        return

    total = len(all_tasks)
    done_count = len([t for t in all_tasks if t["status"] == "done"])
    pct = round(done_count / total * 100) if total > 0 else 0

    embed = discord.Embed(
        title="📋 タスク一覧",
        description=f"**全体進捗: {pct}% ({done_count}/{total} 完了)**",
        color=discord.Color.blurple(),
    )

    today = date.today()
    for status_key, status_label in STATUSES.items():
        group = [t for t in tasks if t["status"] == status_key]
        if not group:
            continue
        lines = []
        for t in group:
            due = datetime.strptime(t["due_date"], "%Y-%m-%d").date()
            days_left = (due - today).days
            if status_key != "done":
                if days_left < 0:
                    deadline_tag = " 🚨 **期限切れ**"
                elif days_left <= 3:
                    deadline_tag = f" ⚠️ 残{days_left}日"
                else:
                    deadline_tag = f" (締切: {t['due_date']})"
            else:
                deadline_tag = ""
            lines.append(f"`#{t['id']}` {t['title']} ｜ **{t['assignee_name']}**{deadline_tag}")
        embed.add_field(name=f"{status_label} ({len(group)}件)", value="\n".join(lines), inline=False)

    await interaction.response.send_message(embed=embed)

# ===================================================
# /schedule  スケジュール表示
# ===================================================
@bot.tree.command(name="schedule", description="タスクのスケジュール一覧を表示します")
async def schedule(interaction: discord.Interaction):
    tasks = get_all_tasks()
    if not tasks:
        await interaction.response.send_message("📭 タスクがありません。", ephemeral=True)
        return

    today = date.today()
    lines = []
    for t in tasks:
        due = datetime.strptime(t["due_date"], "%Y-%m-%d").date()
        days_left = (due - today).days
        status_icon = {"todo": "⬜", "in_progress": "🔄", "done": "✅"}.get(t["status"], "❓")
        if t["status"] != "done":
            if days_left < 0:
                deadline = "🚨 期限切れ"
            elif days_left == 0:
                deadline = "⚠️ 今日締切"
            elif days_left <= 3:
                deadline = f"⚠️ 残{days_left}日"
            else:
                deadline = f"残{days_left}日"
        else:
            deadline = "完了済"
        lines.append(f"{status_icon} `#{t['id']}` **{t['title']}**\n　　{t['start_date']} 〜 {t['due_date']}  ｜ {t['assignee_name']} ｜ {deadline}")

    embed = discord.Embed(
        title="📅 スケジュール一覧",
        description="\n".join(lines),
        color=discord.Color.blurple(),
    )
    total = len(tasks)
    done_count = len([t for t in tasks if t["status"] == "done"])
    embed.set_footer(text=f"全体進捗: {round(done_count/total*100) if total else 0}% ({done_count}/{total} 完了)")
    await interaction.response.send_message(embed=embed)

# ===================================================
# /my_tasks  自分のタスク確認
# ===================================================
@bot.tree.command(name="my_tasks", description="自分のタスク一覧を表示します（自分だけ見える）")
async def my_tasks(interaction: discord.Interaction):
    tasks = [t for t in get_all_tasks() if t["assignee_id"] == interaction.user.id]
    if not tasks:
        await interaction.response.send_message("📭 あなたのタスクはありません。", ephemeral=True)
        return

    today = date.today()
    embed = discord.Embed(title=f"📌 {interaction.user.display_name} のタスク", color=discord.Color.og_blurple())
    for status_key, status_label in STATUSES.items():
        group = [t for t in tasks if t["status"] == status_key]
        if not group:
            continue
        lines = []
        for t in group:
            due = datetime.strptime(t["due_date"], "%Y-%m-%d").date()
            days_left = (due - today).days
            tag = f" ⚠️ 残{days_left}日" if 0 <= days_left <= 3 and status_key != "done" else ""
            lines.append(f"`#{t['id']}` {t['title']} ({t['due_date']}){tag}")
        embed.add_field(name=status_label, value="\n".join(lines), inline=False)

    await interaction.response.send_message(embed=embed, ephemeral=True)

# ===================================================
# /help_game  コマンド一覧
# ===================================================
@bot.tree.command(name="help_game", description="Botのコマンド一覧を表示します")
async def help_game(interaction: discord.Interaction):
    embed = discord.Embed(title="🎮 ゲーム開発タスク管理Bot - コマンド一覧", color=discord.Color.blurple())
    commands_info = [
        ("/task_add",  "タスクを追加（ボタンでステータス変更・削除もできる）"),
        ("/task_list", "タスク一覧（締切が近いものは自動で警告表示）"),
        ("/schedule",  "スケジュール一覧（締切まで残り日数つき）"),
        ("/my_tasks",  "自分のタスクだけ表示（自分にしか見えない）"),
        ("/help_game", "このコマンド一覧を表示"),
    ]
    for cmd, desc in commands_info:
        embed.add_field(name=cmd, value=desc, inline=False)
    embed.set_footer(text="タスク追加後のメッセージのボタンでステータス変更・削除ができます")
    await interaction.response.send_message(embed=embed)

# ===================================================
# リマインド機能（毎日朝9時にチェック）
# ===================================================
@tasks.loop(hours=24)
async def remind_loop():
    if REMIND_CHANNEL_ID == 0:
        return

    channel = bot.get_channel(REMIND_CHANNEL_ID)
    if not channel:
        return

    today = date.today()
    all_tasks = get_all_tasks()
    active_tasks = [t for t in all_tasks if t["status"] != "done"]

    overdue    = [t for t in active_tasks if (datetime.strptime(t["due_date"], "%Y-%m-%d").date() - today).days < 0]
    due_today  = [t for t in active_tasks if (datetime.strptime(t["due_date"], "%Y-%m-%d").date() - today).days == 0]
    due_1day   = [t for t in active_tasks if (datetime.strptime(t["due_date"], "%Y-%m-%d").date() - today).days == 1]
    due_3days  = [t for t in active_tasks if (datetime.strptime(t["due_date"], "%Y-%m-%d").date() - today).days == 3]

    if not any([overdue, due_today, due_1day, due_3days]):
        return

    embed = discord.Embed(
        title="⏰ 締切リマインド",
        description=today.strftime("%Y年%m月%d日"),
        color=discord.Color.red(),
    )

    def fmt(tasks_list):
        return "\n".join([f"• `#{t['id']}` {t['title']} （{t['assignee_name']}）" for t in tasks_list])

    if overdue:
        embed.add_field(name=f"🚨 期限切れ ({len(overdue)}件)", value=fmt(overdue), inline=False)
    if due_today:
        embed.add_field(name=f"🔴 今日締切 ({len(due_today)}件)", value=fmt(due_today), inline=False)
    if due_1day:
        embed.add_field(name=f"🟠 明日締切 ({len(due_1day)}件)", value=fmt(due_1day), inline=False)
    if due_3days:
        embed.add_field(name=f"🟡 3日後締切 ({len(due_3days)}件)", value=fmt(due_3days), inline=False)

    await channel.send(embed=embed)

@remind_loop.before_loop
async def before_remind():
    await bot.wait_until_ready()
    # 毎日朝9時（JST = UTC+9）に合わせる
    now = datetime.utcnow()
    target = now.replace(hour=0, minute=0, second=0, microsecond=0)  # UTC 0時 = JST 9時
    if now >= target:
        target += timedelta(days=1)
    await discord.utils.sleep_until(target)

# ===================================================
# 起動
# ===================================================
bot.run(TOKEN)
