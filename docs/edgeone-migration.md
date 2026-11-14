# Life Planner AI V1：源码交接与 EdgeOne Pages 迁移评估

检查日期：2026-11-14（北京时间）。本次仅导出和评估，没有修改、删除或重新发布现有网站。
基准提交：1a425cea7fa6ef5f45593e3e05b9af1ef6ce4e04（已发布的 V1 四阶段问卷升级版）。
仓库：https://github.com/2722746927-ui/-
旧站：https://life-planner-ai-2722746927.avidray2.chatgpt.site

## 交接包

`life-planner-ai-v1-source.zip` 是该提交全部受 Git 跟踪文件的完整源码快照，包含源码、依赖锁文件、测试、Sites 适配器、中文字体和字体许可证。不含 node_modules、生成产物、Git 历史、实际环境文件、线上密钥、R2 运行数据或用户访谈；安装依赖后重新构建。保留 .openai/hosting.json 作为原始部署记录，新项目不得拿它覆盖原站。

## 已检查的现状

| 部分 | 当前实现 | 迁移判断 |
| --- | --- | --- |
| 前端 | Next.js 16 / React 19 / TypeScript；Tailwind 4 工具链与自定义 CSS；响应式中文页面 | 直接复用，必须测试目标平台的 Next.js 16 构建支持 |
| 核心访谈 | planner.tsx 三轮：基础了解、个性化探索、未来方向澄清 | 直接复用，不改变题目策略和用户操作 |
| AI 分析 | prompts.ts / server.ts / schema.ts；动态问题主题检查、证据校验、JSON 修复 | 直接复用业务逻辑，不用多 Agent 重写 |
| 报告 | report.tsx 四阶段：认识自己、明确未来生活、倒推路径、内在动力 | 直接复用，保留事实/推断/未知标记及证据 |
| PDF | pdf-lib、fontkit；浏览器生成；public/fonts/NotoSansSC.ttf 本地中文字体 | 可直接复用，必须部署字体并保留 OFL 许可证；检查大文件限制 |
| 会话 | localStorage，备份 JSON，可刷新恢复、返回修改、清除、旧问卷升级 | 不需要迁数据库；换域名后浏览器存储不共享，用户须在旧站备份、新站导入并重新同意隐私说明 |
| 数据库 | 没有独立业务数据库或用户账号库 | V1 无需引入数据库；只有管理员配置使用 R2 对象存储 |
| AI 接口 | 服务端 fetch DeepSeek；默认 https://api.deepseek.com，模型 deepseek-flash；stream:false | 逻辑复用，需测试 EdgeOne 出站连通、函数时限与实际模型权限 |
| 密钥验证 | GET /models 发现模型，优先 flash，再一次小型真实调用 | 复用 deepseek-http.ts；不能只靠 HTTP 200 或绕过验证 |
| 线上密钥 | 私有 R2 CONFIG_BUCKET，AES-256-GCM 加密，PLANNER_SECRET_KEY 服务端根密钥 | 平台绑定不能直接迁移；优先新平台重新录入服务端 secret，避免导出线上密文和根密钥 |
| 管理员认证 | Sites 注入 oai-authenticated-user-id/email | 必须适配。不能在 EdgeOne 信任访客自行传入的同名请求头，否则可伪造所有者 |
| 线上部署 | scripts/build-sites.mjs 静态导出前端，Worker 复用后端处理器、R2 和限流 | 是 Sites/Cloudflare 专用，不能作为 EdgeOne 通用构建产物直接上传 |
| 原生 Next API | app/api/planner 与 health 从 process.env 读配置；admin 无 R2 绑定 | 可作为 EdgeOne Next.js 入口的起点，但尚未完成目标平台验证；不会自动读取旧站 R2 密钥 |
| 防滥用 | Sites Worker 中按 IP 的进程内限流/并发控制 | 原生 Next API 未复用这一层。迁移需补平台可信 IP、速率/并发/日额度控制；多实例内存不能当作全局限额 |

## 推荐迁移方案（独立部署，不切旧站）

1. 从该提交创建 `migration/edgeone` 分支或独立仓库，只连接新的 EdgeOne Pages 项目。旧 Sites 项目、密钥、R2 和域名均不变。
2. 使用 EdgeOne 的 Next.js 全栈预设，优先保留 app/api 原生路由；安装 `npm ci`，构建 `npm run build`，Node 22。不要使用 `npm run build:sites`、SITES_EXPORT=1、Sites Worker tar 或“仅静态上传”代替后端。Next.js 16/React19 若不受目标适配器支持，先评估兼容版本；另一条路线为独立静态前端 + EdgeOne Node Functions 包装同一 handlePlanner，不重写业务逻辑。
3. 先用 EdgeOne 运行时服务端环境变量配置 DEEPSEEK_API_KEY / DEEPSEEK_MODEL / DEEPSEEK_BASE_URL。不能使用 NEXT_PUBLIC_ 前缀，不能写进 edgeone.json、提交 .env 或在日志输出配置。静态浏览器不能直接调用带密钥的 DeepSeek。
4. 原 `/admin/deepseek` 不可原样启用。第一步迁移采用腾讯云控制台 secret 配置，目标站管理 API 明确关闭（且不依赖任何 OAI 头）。如果仍需网页填密钥，必须实现新的可靠管理员登录和 CSRF，再把 SecretBucket 适配到服务端私有腾讯云存储；根密钥和 API Key 都不公开。不在管理 GET 接口回传完整密钥。
5. 保留模型列表发现 + 真实最小调用验证。在只用环境变量的目标部署中，增加管理员专用或上线前验证步骤；不能把真实密钥放进 GitHub Actions 日志。验证通过方可宣布配置成功。
6. 使用平台可信身份/IP 做限流，考虑跨实例计数；API 响应、访谈、报告、密钥配置都禁止 CDN 公共缓存，静态指纹文件可长期缓存。API 保持同域，避免将请求反向代理回旧 chatgpt.site 而留下访问依赖。
7. 选择自己的稳定域名和适合大陆访客的加速区域；大陆节点的自定义域名需要工信部备案。不能把平台临时预览域名当作长期分享链接，也不能仅因“部署到腾讯云”就承诺所有网络可访问。具体地区/套餐限制以中国站控制台为准。
8. 新域名端到端验收通过后再对外发新链接，旧站继续保留做回退；不修改旧站 DNS 或自动重定向，不自动跨域传输个人访谈。

## 必须先解决：长耗时生成

当前 `server.ts` 每次 DeepSeek 调用最多等待 115 秒，格式/证据失败可再调用一次；最大预算约 230 秒加处理开销。Next API 标记 maxDuration=300，并不代表 EdgeOne 会允许 300 秒。腾讯云中国站官方 nodeFunctionsConfig 文档写明默认 30 秒，可配置 10–120 秒。不同产品版本和适配器应以目标项目实际限制为准。

因此“设置 120 秒”不足以保证原有完整重试流程。目标适配要设置全请求总时间预算，避免在时限边缘启动第二次调用。若 120 秒仍无法稳定返回完整报告，采用任务创建 + 持久任务状态 + 短请求轮询，任务交给支持足够时长的腾讯云后端执行；需要持久存储并按最少数据原则设置访问凭据和过期清理。仅返回 taskId 后在同一次 Serverless 请求中后台运行不可靠。流式传输可改善等待体验，但不能突破平台函数的最大运行时间。

该项在实际报告耗时测量前不能标记为已解决，也不应裁减四阶段报告或降低证据校验来掩盖超时。

## 环境变量交接（只列名称，无密钥）

- DEEPSEEK_API_KEY：目标项目服务端运行时 secret，重新录入；不从浏览器读取。
- DEEPSEEK_MODEL：deepseek-flash，需经 /models 和最小真实调用确认。
- DEEPSEEK_BASE_URL：https://api.deepseek.com（通常不必修改）。
- 原站 PLANNER_SECRET_KEY / PLANNER_OWNER_EMAIL / CONFIG_BUCKET 为 Sites 管理入口依赖，不能认为在 EdgeOne 自动存在。采用控制台密钥方案则无需搬运；采用新的加密存储则重新设计身份与绑定。

## 本地重现与验收

解压后在项目目录运行 `npm ci`、`npm run typecheck`、`npm test`、`npm run build`。本地运行：复制 .env.example 为 .env.local，填入自己的服务端 DeepSeek Key，然后 `npm run dev`。原生 Next.js 的环境变量模式支持访谈/报告，不提供 Sites 专用管理入口的持久保存能力。

迁移验收必须包括：
- 未登录访客从首页完成三轮动态问题，第二轮探索未来，第三轮澄清方向。
- 不同回答生成不同追问，不知道/跳过不强行补造愿景；修改回答后的后续数据失效规则正确。
- 生成完整四阶段报告、结构化校验和历史证据引用；中文 PDF 多页无乱码。
- 刷新、回退、本机清除、旧站备份到新站导入、旧问卷保留答案切换均可用。
- DeepSeek 401/402/429、网络失败、超时、无效 JSON 时有可理解提示，保留用户回答。
- 非管理员无法改密钥，包括伪造 OAI 头；构建前端与 Git 不含真实 secret；日志不记录 Authorization、完整访谈或 key。
- 频率/并发/费用限制在目标部署有效，访谈/API响应不被 CDN 缓存。
- 大陆真实网络、安卓/iOS、微信内和外部浏览器、不同运营商实测；本环境不具备大陆用户网络，不以海外 HTTP 200 代替此验收。
- 目标部署失败时旧站仍可用。

本次仅评估和导出，不代表 EdgeOne 已部署或验证。需要后续腾讯云/GitHub 授权、目标域名与备案状态、目标环境录入 API Key；不要把 key 发给聊天或 WorkBuddy 提示词。

## 官方核对来源（2026-11-14）

- 中国站配置与函数时限：https://edgeone.cloud.tencent.com/pages/document/162936771610066944
- 中国站全栈能力 FAQ：https://edgeone.cloud.tencent.com/pages/document/162936949996421120
- 中国站域名与加速区域：https://edgeone.cloud.tencent.com/pages/document/175191784523485184
- 中国站构建环境：https://edgeone.cloud.tencent.com/pages/document/162936788693114880
- 国际站 Next.js 全栈部署介绍（仅作能力参考，不代替中国站控制台）：https://pages.edgeone.ai/resources/deploy-nextjs-project-to-pages

官方不同文档页面存在新旧描述差异（部分旧框架页仍写仅静态导出），应使用当前 Next.js 全栈预设并在目标项目做实际兼容测试，不能据旧静态页断言原生 API 一定不可用，也不能未经验证宣称 Next.js 16 完全兼容。
