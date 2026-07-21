import crypto from "node:crypto";
import { withExponentialBackoff } from "@/lib/x-automation/retry";

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function nonce() {
  return crypto.randomBytes(18).toString("hex");
}

function oauthHeader(url: string, method: string, requestParameters: Record<string, string> = {}) {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const token = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!consumerKey || !consumerSecret || !token || !tokenSecret) {
    throw new Error("X API OAuth credentials are incomplete");
  }
  const oauthParameters: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: "1.0",
  };
  const normalized = Object.entries({ ...requestParameters, ...oauthParameters })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encode(key)}=${encode(value)}`)
    .join("&");
  const base = `${method.toUpperCase()}&${encode(url)}&${encode(normalized)}`;
  const signingKey = `${encode(consumerSecret)}&${encode(tokenSecret)}`;
  oauthParameters.oauth_signature = crypto.createHmac("sha1", signingKey).update(base).digest("base64");
  return `OAuth ${Object.entries(oauthParameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encode(key)}="${encode(value)}"`)
    .join(", ")}`;
}

export async function createXPost(text: string) {
  const url = "https://api.x.com/2/tweets";
  const response = await withExponentialBackoff(async () => {
    const result = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: oauthHeader(url, "POST"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!result.ok) {
      const body = await result.text();
      const error = new Error(`X API failed: ${result.status} ${body.slice(0, 240)}`) as Error & { status?: number };
      error.status = result.status;
      throw error;
    }
    return result;
  }, {
    attempts: 3,
    initialDelayMs: 800,
    shouldRetry: (error) => [429, 500, 502, 503, 504].includes((error as { status?: number }).status ?? 0),
  });
  const payload = (await response.json()) as { data?: { id?: string } };
  if (!payload.data?.id) throw new Error("X API returned no post ID");
  return payload.data.id;
}

export async function getXPostMetrics(postId: string) {
  const baseUrl = `https://api.x.com/2/tweets/${encodeURIComponent(postId)}`;
  const query = { "tweet.fields": "public_metrics" };
  const url = `${baseUrl}?${new URLSearchParams(query)}`;
  const response = await fetch(url, {
    headers: { Authorization: oauthHeader(baseUrl, "GET", query) },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`X metrics API failed: ${response.status}`);
  const payload = (await response.json()) as {
    data?: { public_metrics?: { impression_count?: number; like_count?: number; retweet_count?: number } };
  };
  const metrics = payload.data?.public_metrics;
  if (!metrics) throw new Error("X metrics API returned no public metrics");
  return {
    impressions: metrics.impression_count,
    likes: metrics.like_count,
    reposts: metrics.retweet_count,
  };
}
