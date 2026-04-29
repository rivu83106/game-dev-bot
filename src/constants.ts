export const CATEGORIES: Record<string, string> = {
  planning:    "📋 企画・設計",
  programming: "💻 プログラム",
  art:         "🎨 アート・UI",
  sound:       "🎵 サウンド",
  qa:          "🔍 QA・テスト",
  other:       "📌 その他",
};

export const STATUSES: Record<string, string> = {
  todo:        "⬜ 未着手",
  in_progress: "🔄 進行中",
  done:        "✅ 完了",
};

export const PRIORITIES: Record<string, string> = {
  low:    "🟢 低",
  medium: "🟡 中",
  high:   "🔴 高",
  urgent: "🚨 緊急",
};

export const STATUS_COLORS: Record<string, number> = {
  todo:        0x99aab5, // grey
  in_progress: 0xfee75c, // yellow
  done:        0x57f287, // green
};

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high:   3,
  medium: 2,
  low:    1,
};

export const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

// InteractionType
export const IT = {
  PING:              1,
  APP_COMMAND:       2,
  MESSAGE_COMPONENT: 3,
  MODAL_SUBMIT:      5,
} as const;

// InteractionCallbackType
export const ICT = {
  PONG:            1,
  CHANNEL_MESSAGE: 4,
  DEFERRED:        5,
  UPDATE_MESSAGE:  7,
  MODAL:           9,
} as const;

// ComponentType
export const CT = {
  ACTION_ROW:    1,
  BUTTON:        2,
  STRING_SELECT: 3,
  TEXT_INPUT:    4,
} as const;

// ButtonStyle
export const BS = {
  PRIMARY:   1,
  SECONDARY: 2,
  SUCCESS:   3,
  DANGER:    4,
} as const;

// TextInputStyle
export const TIS = {
  SHORT:     1,
  PARAGRAPH: 2,
} as const;
