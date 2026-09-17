import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { createApp } from "./app";
import { serveStatic, setupVite } from "./vite";
import { runSubscriptionLifecycle } from "../jobs/subscriptionJobs";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // On the long-running Node server, run the subscription lifecycle job every
    // 6 hours. (On Vercel the same job runs via the crons entry in vercel.json.)
    const SUBSCRIPTION_JOB_INTERVAL_MS = 6 * 60 * 60 * 1000;
    const runJob = () =>
      runSubscriptionLifecycle().catch((error) =>
        console.error("[Jobs] Subscription lifecycle failed:", error)
      );
    const jobTimer = setInterval(runJob, SUBSCRIPTION_JOB_INTERVAL_MS);
    jobTimer.unref?.();
  });
}

startServer().catch(console.error);
