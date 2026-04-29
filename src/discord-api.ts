const DISCORD_API = "https://discord.com/api/v10";

export async function discordPost(
  path: string,
  token: string,
  body: unknown
): Promise<Response> {
  return fetch(`${DISCORD_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function discordPatch(
  path: string,
  token: string,
  body: unknown
): Promise<Response> {
  return fetch(`${DISCORD_API}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// インタラクションのフォローアップメッセージを送信
export async function sendFollowup(
  applicationId: string,
  interactionToken: string,
  body: unknown
): Promise<Response> {
  return fetch(`${DISCORD_API}/webhooks/${applicationId}/${interactionToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// チャンネルにメッセージを送信（リマインド用）
export async function sendChannelMessage(
  channelId: string,
  token: string,
  body: unknown
): Promise<void> {
  await discordPost(`/channels/${channelId}/messages`, token, body);
}

// ユーザーにDMを送信（リマインド用）
export async function sendDM(
  userId: string,
  token: string,
  body: unknown
): Promise<boolean> {
  const dmRes = await discordPost("/users/@me/channels", token, { recipient_id: userId });
  if (!dmRes.ok) return false;
  const dm = await dmRes.json<{ id: string }>();
  const msgRes = await discordPost(`/channels/${dm.id}/messages`, token, body);
  return msgRes.ok;
}
