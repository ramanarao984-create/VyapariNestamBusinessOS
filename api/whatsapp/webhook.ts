import crypto from "crypto";

export const config = { api: { bodyParser: false } };

function matchesSecret(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function getVerifyToken(): string {
  return process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || "";
}

function getRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const query = req.query || {};
    const isValid = query["hub.mode"] === "subscribe" &&
      matchesSecret(query["hub.verify_token"], getVerifyToken());

    if (!isValid) return res.status(403).send("Forbidden");
    return res.status(200).send(query["hub.challenge"] || "");
  }

  if (req.method === "POST") {
    const rawBody = await getRawBody(req);
    const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || "";
    const signature = req.headers["x-hub-signature-256"] as string | undefined;

    if (!appSecret || !signature?.startsWith("sha256=")) {
      return res.status(503).json({ error: "Webhook signature configuration missing" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");

    if (!matchesSecret(signature.slice("sha256=".length), expectedSignature)) {
      return res.status(401).json({ error: "Invalid HMAC signature" });
    }

    return res.status(200).json({ status: "received" });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
