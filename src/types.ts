export interface Task {
  id: number;
  guild_id: string;
  title: string;
  assignee_ids: string;   // JSON array string, or "everyone"
  assignee_names: string; // JSON array string, or "全員"
  category: string;
  start_date: string;     // YYYY-MM-DD
  due_date: string;       // YYYY-MM-DD
  status: string;         // todo | in_progress | done
  priority: string;       // low | medium | high | urgent
  note: string;
  created_by: string;
  created_at: string;
}

export interface GuildSettings {
  guild_id: string;
  remind_channel_id: string | null;
}

// KVに保存するセッションデータ（/task_add の途中状態）
export interface TaskSession {
  title: string;
  assignee_ids: string[];
  assignee_names: string[];
  category: string;
  priority: string;
  note: string;
  guild_id: string;
  user_name: string;
  is_public?: boolean;
}

// KVに保存するセッションデータ（/task_edit の途中状態）
export interface EditSession {
  task_id: number;
  start_date?: string; // 編集中の開始日（日程変更フロー用）
}

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
  DISCORD_TOKEN: string;
}

// Discord Interaction 型
export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: {
    id?: string;
    name?: string;
    options?: DiscordOption[];
    custom_id?: string;
    component_type?: number;
    values?: string[];
    components?: Array<{ type: number; components: DiscordModalComponent[] }>;
    resolved?: {
      users?:   Record<string, DiscordUser>;
      members?: Record<string, { nick?: string }>;
    };
  };
  guild_id?: string;
  channel_id?: string;
  member?: {
    user: DiscordUser;
    nick?: string;
    roles: string[];
  };
  user?: DiscordUser;
  token: string;
  message?: {
    id: string;
    content: string;
  };
  resolved?: {
    users?: Record<string, DiscordUser>;
    members?: Record<string, { nick?: string }>;
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string;
}

export interface DiscordOption {
  name: string;
  value: string | number | boolean;
  options?: DiscordOption[];
  focused?: boolean;
}

export interface DiscordModalComponent {
  type: number;
  custom_id: string;
  value: string;
}
