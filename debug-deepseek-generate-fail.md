[OPEN]

# deepseek-generate-fail

## 症状
- 前端点击“课本生成/生成”或“主动情绪/生成”后，返回“生成失败/无法生成”，无法拿到卡片数据。

## 预期
- `/api/books/generate` 或 `/api/cards/generateFromText` 返回 `{ ok: true, cards: [...] }`，前端展示卡片。

## 环境
- OS: Windows
- 前端: Vite dev server (`/api` 代理到 `http://localhost:8787`)
- 后端: `node echo-server.mjs`

## 可证伪假设 (Hypotheses)
1. DeepSeek 的环境变量未正确注入到当前启动的后端进程（`DEEPSEEK_API_KEY` 为空或被覆盖），导致后端抛出 `Missing DEEPSEEK_API_KEY`。
2. DeepSeek 请求已发出但返回非 2xx（鉴权失败/限流/余额不足/模型名不对/路径不对），后端未把关键错误信息回传，前端只看到“生成失败”。
3. 网络访问 `https://api.deepseek.com` 在本机环境被拦截或 TLS/代理异常，导致 fetch 直接抛错。
4. 模型返回内容不是合法 JSON（`parseJsonFromModelText` 解析失败），后端抛异常并返回 500。
5. 前端调用到了错误的接口或代理未命中（`/api` 被别的服务接管），导致请求实际没到当前 `echo-server.mjs`。

## 证据采集计划
1. 启动调试日志服务，统一收集后端关键路径的运行时日志（不改业务逻辑）。
2. 对 `/api/books/generate`、`/api/cards/generateFromText`、`deepseekChat` 的请求/响应/异常做最小化插桩上报。
3. 复现一次请求，基于日志判定假设成立与否。

## 当前状态
- 等待插桩与复现日志。
