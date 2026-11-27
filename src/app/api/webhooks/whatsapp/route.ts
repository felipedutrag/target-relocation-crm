import { timingSafeEqual } from "node:crypto";

export async function GET(request: Request) {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!expectedToken) {
    return new Response("Webhook verification is unavailable", { status: 503 });
  }

  const params = new URL(request.url).searchParams;
  const challenge = params.get("hub.challenge");
  const supplied = Buffer.from(params.get("hub.verify_token") ?? "");
  const expected = Buffer.from(expectedToken);

  if (
    params.get("hub.mode") !== "subscribe" ||
    !challenge ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
