import { CT, BS } from "./constants.js";
import type { Task } from "./types.js";

// ===== カレンダーピッカー UI =====

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function yearOptions() {
  // 2026〜2030 の固定範囲
  return [2026, 2027, 2028, 2029, 2030].map(y => ({
    label: `${y}年`,
    value: String(y),
  }));
}

function monthOptions() {
  return Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: String(i + 1).padStart(2, "0"),
  }));
}

function dayOptions(year: number, month: number) {
  const max = daysInMonth(year, month);
  return Array.from({ length: max }, (_, i) => ({
    label: `${i + 1}日`,
    value: String(i + 1).padStart(2, "0"),
  }));
}

function selectRow(customId: string, placeholder: string, options: { label: string; value: string }[]) {
  return {
    type: CT.ACTION_ROW,
    components: [{
      type: CT.STRING_SELECT,
      custom_id: customId,
      placeholder,
      options,
    }],
  };
}

// Step 1: 開始年選択
export function calStartYearMessage(sessionKey: string) {
  return {
    content: "📅 **開始日を選択してください**",
    components: [selectRow(`csy:${sessionKey}`, "年を選択...", yearOptions())],
  };
}

// Step 2: 開始月選択
export function calStartMonthMessage(sessionKey: string, year: string) {
  return {
    content: `📅 **開始日: ${year}年**\n月を選択してください`,
    components: [selectRow(`csm:${sessionKey}:${year}`, "月を選択...", monthOptions())],
  };
}

// Step 3: 開始日選択
export function calStartDayMessage(sessionKey: string, year: string, month: string) {
  return {
    content: `📅 **開始日: ${year}年${parseInt(month)}月**\n日を選択してください`,
    components: [selectRow(`csd:${sessionKey}:${year}:${month}`, "日を選択...", dayOptions(Number(year), Number(month)))],
  };
}

// Step 4: 締切年選択
export function calDueYearMessage(sessionKey: string, startDate: string) {
  return {
    content: `📅 開始日: **${startDate}** ✅\n\n📅 **締切日を選択してください**`,
    components: [selectRow(`cdy:${sessionKey}:${startDate}`, "年を選択...", yearOptions())],
  };
}

// Step 5: 締切月選択
export function calDueMonthMessage(sessionKey: string, startDate: string, year: string) {
  return {
    content: `📅 開始日: **${startDate}** ✅\n📅 **締切日: ${year}年**\n月を選択してください`,
    components: [selectRow(`cdm:${sessionKey}:${startDate}:${year}`, "月を選択...", monthOptions())],
  };
}

// Step 6: 締切日選択
export function calDueDayMessage(sessionKey: string, startDate: string, year: string, month: string) {
  return {
    content: `📅 開始日: **${startDate}** ✅\n📅 **締切日: ${year}年${parseInt(month)}月**\n日を選択してください`,
    components: [selectRow(`cdd:${sessionKey}:${startDate}:${year}:${month}`, "日を選択...", dayOptions(Number(year), Number(month)))],
  };
}

// Step 7: 確認（タスク作成ボタン）
export function calConfirmMessage(sessionKey: string, startDate: string, dueDate: string) {
  return {
    content: `📅 開始日: **${startDate}** ✅\n📅 締切日: **${dueDate}** ✅\n\n✅ 内容を確認してタスクを作成してください`,
    components: [{
      type: CT.ACTION_ROW,
      components: [{
        type: CT.BUTTON,
        style: BS.SUCCESS,
        custom_id: `confirm:${sessionKey}:${startDate}:${dueDate}`,
        label: "✅ タスクを作成",
      }],
    }],
  };
}

// 編集用: 日程変更の開始年選択
export function editStartYearMessage(sessionKey: string) {
  return {
    content: "📅 **新しい開始日を選択してください**",
    components: [selectRow(`ecy:${sessionKey}`, "年を選択...", yearOptions())],
  };
}
export function editStartMonthMessage(sessionKey: string, year: string) {
  return {
    content: `📅 **開始日: ${year}年**\n月を選択してください`,
    components: [selectRow(`ecm:${sessionKey}:${year}`, "月を選択...", monthOptions())],
  };
}
export function editStartDayMessage(sessionKey: string, year: string, month: string) {
  return {
    content: `📅 **開始日: ${year}年${parseInt(month)}月**\n日を選択してください`,
    components: [selectRow(`ecd:${sessionKey}:${year}:${month}`, "日を選択...", dayOptions(Number(year), Number(month)))],
  };
}
export function editDueYearMessage(sessionKey: string, startDate: string) {
  return {
    content: `📅 開始日: **${startDate}** ✅\n\n📅 **新しい締切日を選択してください**`,
    components: [selectRow(`edy:${sessionKey}:${startDate}`, "年を選択...", yearOptions())],
  };
}
export function editDueMonthMessage(sessionKey: string, startDate: string, year: string) {
  return {
    content: `📅 開始日: **${startDate}** ✅\n📅 **締切日: ${year}年**\n月を選択してください`,
    components: [selectRow(`edm:${sessionKey}:${startDate}:${year}`, "月を選択...", monthOptions())],
  };
}
export function editDueDayMessage(sessionKey: string, startDate: string, year: string, month: string) {
  return {
    content: `📅 開始日: **${startDate}** ✅\n📅 **締切日: ${year}年${parseInt(month)}月**\n日を選択してください`,
    components: [selectRow(`edd:${sessionKey}:${startDate}:${year}:${month}`, "日を選択...", dayOptions(Number(year), Number(month)))],
  };
}
export function editDatesConfirmMessage(sessionKey: string, startDate: string, dueDate: string) {
  return {
    content: `📅 新しい開始日: **${startDate}** ✅\n📅 新しい締切日: **${dueDate}** ✅`,
    components: [{
      type: CT.ACTION_ROW,
      components: [{
        type: CT.BUTTON,
        style: BS.SUCCESS,
        custom_id: `editdates:${sessionKey}:${startDate}:${dueDate}`,
        label: "✅ 日程を更新",
      }],
    }],
  };
}

// ===== カレンダー表示（/scheduleコマンド用）=====

export function buildCalendarView(tasks: Task[], year: number, month: number): string {
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const totalDays = daysInMonth(year, month);

  // タスクを日付でグループ化
  const tasksByDay = new Map<number, Task[]>();
  for (const task of tasks) {
    if (!task.due_date.startsWith(`${year}-${String(month).padStart(2, "0")}`)) continue;
    const day = parseInt(task.due_date.slice(8, 10));
    if (!tasksByDay.has(day)) tasksByDay.set(day, []);
    tasksByDay.get(day)!.push(task);
  }

  const lines: string[] = [];
  lines.push("```");
  lines.push("日  月  火  水  木  金  土");

  let row = "    ".repeat(firstDay);
  for (let d = 1; d <= totalDays; d++) {
    const hasTasks = tasksByDay.has(d);
    const label = hasTasks ? `【${String(d).padStart(2)}】` : ` ${String(d).padStart(2)} `;
    row += label + " ";
    if ((firstDay + d) % 7 === 0 || d === totalDays) {
      lines.push(row.trimEnd());
      row = "";
    }
  }
  lines.push("```");

  return lines.join("\n");
}

export function buildCalendarNav(year: number, month: number) {
  const prev = month === 1 ? `${year - 1}:12` : `${year}:${month - 1}`;
  const next = month === 12 ? `${year + 1}:1` : `${year}:${month + 1}`;
  return {
    type: CT.ACTION_ROW,
    components: [
      { type: CT.BUTTON, style: BS.SECONDARY, custom_id: `sched:${prev}`, label: "◀ 前月" },
      { type: CT.BUTTON, style: BS.SECONDARY, custom_id: `sched:${year}:${month}`, label: `${year}年${month}月`, disabled: true },
      { type: CT.BUTTON, style: BS.SECONDARY, custom_id: `sched:${next}`, label: "次月 ▶" },
    ],
  };
}
