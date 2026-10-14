import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// 개발 서버(npm run dev)에서도 /api/weather 가 동작하도록 api/weather.js 를 그대로 연결한다.
// 배포(Vercel)에서는 Vercel이 api/ 폴더를 서버 함수로 실행하므로 이 부분은 쓰이지 않는다.
function devApi() {
  return {
    name: "dev-api",
    configureServer(server) {
      const env = loadEnv("development", process.cwd(), "");
      if (env.KMA_SERVICE_KEY) process.env.KMA_SERVICE_KEY = env.KMA_SERVICE_KEY;
      server.middlewares.use("/api/weather", async (req, res) => {
        const mod = await server.ssrLoadModule("/api/weather.js");
        const shim = {
          statusCode: 200,
          headers: {},
          setHeader(k, v) { this.headers[k] = v; },
          status(code) { this.statusCode = code; return this; },
          json(body) {
            res.statusCode = this.statusCode;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify(body));
          },
        };
        await mod.default(req, shim);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  test: { environment: "node" },
});
