# EdgeOne Makers / Next.js 16 全栈构建修复

## 已定位的事实与边界

用户提供的末尾日志：`No server-handler detected, generating routes.json for pure project…`。这行表示官方 CLI 在产物收集阶段没有发现服务端处理器，继而尝试纯静态兜底；它本身不能确定前面的具体失败原因。完整云端日志仍需检查首个错误、`[plugins]` 和 `[opennext]` 输出，尤其区分插件未加载、上游 next build 失败、配置选错或适配器 hook 失败。

本地基准验证：原始 `npm run build` 成功，三个 `/api/*` Route Handlers 都在 Next 清单中，但仅运行 next build 不产生 EdgeOne 原生 SSR 处理器。使用腾讯云官方 `edgeone@1.7.2` 及其配套 `@edgeone/opennextjs-pages@0.2.10-beta.13` 成功生成 `.edgeone/cloud-functions/ssr-node/index.mjs`、`handler.js` 和含三个 API 的 17 条路由。无需降级 Next.js，也无需改成静态站。

本次修复固定官方构建工具/适配器版本，在项目根配置中明确加载适配器及 Next 输出目录，并固定原生 standalone 服务端产物。不能宣称已经在用户的腾讯云项目验证部署成功；本地构建和处理器测试通过不等于云端控制台已重新部署。

## 控制台填写

| 配置 | 值 |
| --- | --- |
| GitHub 仓库 | `2722746927-ui/-` |
| 生产分支 | `main` |
| 根目录 | 仓库根目录，通常留空或 `.` |
| 框架预设 | `Next` / `Next.js` 全栈，不能选 Next SSG、Vinext、纯静态 |
| Node.js | `22.11.0`（或控制台兼容的 Node 22） |
| 安装命令 | `npm ci`，确保安装 devDependencies，不设置 omit=dev |
| 构建命令 | `npm run build` |
| 输出目录 | `.next` |

根目录 `edgeone.json` 声明相同设置、显式 OpenNext 插件和 120 秒 Node 云函数时限。不要把输出改成 `out` 或把 Sites Worker 的 `dist` 上传到腾讯云。平台 CLI 会在 next build 后执行适配器，`.edgeone` 是它生成的部署协议目录，而不是控制台的 Next 编译目录。

不要将控制台构建命令设为 `npm run build:edgeone`：它是本地完整复现命令，内部 CLI 已按 edgeone.json 执行 `npm run build`，嵌套另一次平台构建会重复执行适配器和依赖安装。

删除控制台里遗留的 `SITES_EXPORT=1`、其他静态导出环境变量或自定义 Vinext 构建配置。本仓库不依赖这些变量；Sites 有自己的独立构建脚本。清除一次旧构建缓存，并确认本次部署提交确实来自 main 最新版本。

## 服务端配置

只在腾讯云服务端运行时环境变量中填写：

- `DEEPSEEK_API_KEY`：你的 DeepSeek Key，绝不加 NEXT_PUBLIC_ 前缀，不要发到聊天、写入 edgeone.json 或 GitHub。
- `DEEPSEEK_MODEL=deepseek-flash`。
- 可选 `DEEPSEEK_BASE_URL=https://api.deepseek.com`。

`/api/planner` 继续在服务器调用 DeepSeek，前端请求相对路径 `/api/planner`。提示词、JSON 校验、三轮问卷、四阶段报告、PDF 和本机保存均未删改。`/api/health` 返回配置状态，绝不返回密钥。

Sites 专用的网页密钥管理依赖 Sites 身份注入与 R2；它不能登录腾讯云身份，也不负责给目标平台保存配置。目标平台用控制台服务端环境变量完成配置，不要配置或信任任意外部 OAI 身份请求头。未登录的管理接口仍返回401；不应通过放开鉴权“修复”它。

## 本地复现

```sh
npm ci
npm run typecheck
npm test
npm run test:edgeone
npm run build:edgeone
npm run test:edgeone:runtime
npm run build:sites
npm run test:deployment
```

本机沙盒若无法写 npm 默认缓存，可为命令配置 `npm_config_cache=/tmp/life-planner-npm-cache`；这只是本地文件权限问题，无需在腾讯云照搬。

成功日志应包含：

- `Loaded external plugin from @edgeone/opennextjs-pages`
- `Generated .../.edgeone/cloud-functions/ssr-node/config.json with 17 routes`（数量可随将来页面变化）
- `Build completed`

本地 `build:edgeone` 最后会执行 verify-edgeone-build.mjs：缺 SSR 入口、任一 API 注册或中文 PDF 字体时失败，不能把静态兜底误报成功。

运行时冒烟测试使用真实生成的 Next 处理器、平台转发 Host/Proto 语义、虚构用户回答和模拟的 DeepSeek HTTP，验证两轮个性化追问、四阶段报告与管理拒绝访问；不使用真实 Key、不发送真实用户数据、不调用真实模型。真实云端网络、运营商和浏览器体验需在重新部署后验证。

## 保留原站与剩余验收

原 `.openai/hosting.json`、scripts/build-sites.mjs、scripts/worker.ts 和 R2 配置不变。Sites 脚本复制前端并使用独立静态配置，随后单独打包同一后端处理器，因此原站不依赖新的 standalone 配置。此次没有执行 Sites 重新发布、删除或更改其权限/密钥。

腾讯云目前文档的 Node 函数最大执行时间为120秒；原调用单次115秒且JSON修复可能再请求一次，因此长报告仍需云端时延测试。配置120秒不能保证两次最坏耗时均能完成。本次聚焦 SSR 构建故障，没有裁减报告或绕过结构化验证，也未用不可靠的响应后后台任务掩盖此限制。

新域名的本地存储和旧站不互通，可通过旧站“回看回答”备份，再在新站导入。正式分享前验证大陆网络访问、域名/备案、模型列表及最小真实调用、完整问卷到PDF；原网站保持可用做回退。

## 官方依据（2026-11-14）

- Next.js 16、SSR、Route Handlers 支持：https://pages.edgeone.ai/document/framework-nextjs
- 全栈构建产物协议：https://pages.edgeone.ai/document/building-output-configuration
- 全栈应用部署指南：https://pages.edgeone.ai/resources/next-full-stack-deploy-guide
- 构建配置：https://pages.edgeone.ai/document/edgeone-json
- 实际使用的官方包：`edgeone@1.7.2`、`@edgeone/opennextjs-pages@0.2.10-beta.13`，已写入 package-lock.json。
