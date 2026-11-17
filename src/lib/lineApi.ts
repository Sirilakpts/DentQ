/**
 * LINE Messaging API Client Utility
 * Provides modular functions for sending Push and Reply messages via LINE API
 */

import { isDemoMode, DEMO_MOCK_USER } from "./demo-data";

export interface LineMessageObject {
  type: string;
  [key: string]: any;
}

const LINE_MESSAGING_API_URL = "https://api.line.me/v2/bot/message";

/**
 * Format any input (string or LineMessageObject) into valid LINE message structure
 */
function normalizeMessages(messages: (string | LineMessageObject)[]): LineMessageObject[] {
  return messages.map((msg) => {
    if (typeof msg === "string") {
      return { type: "text", text: msg };
    }
    return msg;
  });
}

/**
 * Send a Push Message directly to a specific LINE User ID
 * API Endpoint: POST https://api.line.me/v2/bot/message/push
 */
export async function pushMessage(
  userId: string,
  messages: (string | LineMessageObject)[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (isDemoMode()) {
    console.log("[Demo Mode] LINE Push Message simulated (no-op) for userId:", userId);
    return { success: true, data: { simulated: true } };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.warn("[LINE API Warning] LINE_CHANNEL_ACCESS_TOKEN is missing in .env. Message skipped.");
    return {
      success: false,
      error: "LINE_CHANNEL_ACCESS_TOKEN is not set in environment variables.",
    };
  }

  if (!userId) {
    console.error("[LINE API Error] Target userId is required for Push Message.");
    return { success: false, error: "Recipient userId is missing." };
  }

  try {
    const formattedMessages = normalizeMessages(messages);

    const res = await fetch(`${LINE_MESSAGING_API_URL}/push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: formattedMessages,
      }),
    });

    if (!res.ok) {
      const errResponse = await res.json().catch(() => ({}));
      console.error("[LINE API Push Error]", {
        status: res.status,
        statusText: res.statusText,
        details: errResponse,
      });

      return {
        success: false,
        error: `LINE API returned ${res.status}: ${JSON.stringify(errResponse)}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } catch (err: any) {
    console.error("[LINE API Network Error] Failed to send push message:", err.message || err);
    return {
      success: false,
      error: err.message || "Failed to connect to LINE Messaging API",
    };
  }
}

// Alias for backward compatibility
export const sendPushMessage = pushMessage;

/**
 * Send a Reply Message using a replyToken from Webhook Event
 * API Endpoint: POST https://api.line.me/v2/bot/message/reply
 */
export async function replyMessage(
  replyToken: string,
  messages: (string | LineMessageObject)[]
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (isDemoMode()) {
    console.log("[Demo Mode] LINE Reply Message simulated (no-op) for replyToken:", replyToken);
    return { success: true, data: { simulated: true } };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.warn("[LINE API Warning] LINE_CHANNEL_ACCESS_TOKEN is missing in .env.");
    return { success: false, error: "LINE_CHANNEL_ACCESS_TOKEN is not set." };
  }

  if (!replyToken) {
    console.error("[LINE API Error] Target replyToken is required for Reply Message.");
    return { success: false, error: "replyToken is missing." };
  }

  try {
    const formattedMessages = normalizeMessages(messages);

    const res = await fetch(`${LINE_MESSAGING_API_URL}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: formattedMessages,
      }),
    });

    if (!res.ok) {
      const errResponse = await res.json().catch(() => ({}));
      console.error("[LINE API Reply Error]", {
        status: res.status,
        details: errResponse,
      });
      return { success: false, error: JSON.stringify(errResponse) };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[LINE API Reply Network Error]:", err.message || err);
    return { success: false, error: err.message || "Network Error" };
  }
}

// Backward compatibility alias
export const sendReplyMessage = replyMessage;

/**
 * ตรวจสอบความถูกต้องของ LINE ID Token กับ LINE Verify API (OAuth 2.0 / OpenID Connect)
 * ตรวจสอบ audience (aud) โดยตรงกับ LINE_LOGIN_CHANNEL_ID จริง (Zero-Trust)
 */
export async function verifyLineIdToken(
  idToken: string
): Promise<{ success: boolean; lineUserId?: string; error?: string }> {
  // ในโหมดสาธิต (DEMO_MODE=true) อนุญาตเฉพาะ Mock Token ที่กำหนดไว้ล่วงหน้า
  // เมื่อไม่ใช่ Demo Mode (DEMO_MODE=false) Mock Token จะไม่ผ่านการตรวจสอบเด็ดขาด
  if (isDemoMode()) {
    if (idToken === DEMO_MOCK_USER.idToken) {
      return { success: true, lineUserId: DEMO_MOCK_USER.userId };
    }
  }

  try {
    const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();

    if (!channelId) {
      console.warn(
        "[LINE Auth] Missing LINE_LOGIN_CHANNEL_ID in environment variables."
      );
      return { success: false, error: "Missing LINE_LOGIN_CHANNEL_ID configuration" };
    }

    const params = new URLSearchParams();
    params.append("id_token", idToken);
    params.append("client_id", channelId);

    const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok || !data.sub) {
      console.warn(
        "[LINE Auth] ID Token verification failed:",
        data.error_description || data.error
      );
      return {
        success: false,
        error: data.error_description || data.error || "Invalid LINE ID Token",
      };
    }

    // ตรวจสอบ audience (aud) ว่าตรงกับ Channel ID ที่กำหนดอย่างเข้มงวด
    if (data.aud !== channelId) {
      console.warn(
        `[LINE Auth] Token audience mismatch: expected ${channelId}, got ${data.aud}`
      );
      return { success: false, error: "Token audience mismatch" };
    }

    return { success: true, lineUserId: data.sub };
  } catch (err: any) {
    console.error("[LINE Auth] Error verifying ID token:", err.message || err);
    return { success: false, error: "Network error during LINE verification" };
  }
}

