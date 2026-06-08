import { createServer } from "http";
import { pingRedis } from "@/lib/redis/client";

let server: ReturnType<typeof createServer> | null = null;

export function startHealthServer() {
  const port = Number(process.env.WORKER_HEALTH_PORT ?? 8081);

  server = createServer(async (req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    const redisOk = await pingRedis();
    const body = JSON.stringify({ status: redisOk ? "ok" : "degraded", redis: redisOk });
    res.writeHead(redisOk ? 200 : 503, { "Content-Type": "application/json" });
    res.end(body);
  });

  server.listen(port, "0.0.0.0", () => {
    console.info(`[worker] health server listening on :${port}/health`);
  });
}

export async function stopHealthServer(): Promise<void> {
  if (!server) return;

  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  server = null;
}
