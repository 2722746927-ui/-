# 腾讯云 EdgeOne 独立部署准备

源分支：`migration/edgeone`。原站基准提交：`1a425cea7fa6ef5f45593e3e05b9af1ef6ce4e04`。

当前仅保存源码与部署准备，不代表已经部署或可直接上线。不要把本目录当作构建输出上传。

1. 登录腾讯云中国站 https://console.cloud.tencent.com/edgeone/pages ，新建独立 Pages 项目，授权 GitHub 仓库 `2722746927-ui/-`，选择 `migration/edgeone` 分支。不要接管或删除原 Sites 项目。
2. 选择 Next.js 全栈预设，Node 22、`npm ci`、`npm run build`。输出目录使用平台 Next.js 预设，不设置 `SITES_EXPORT=1`，不运行 `build:sites`。
3. `edgeone.example.json` 仅作为配置参考；需确认控制台版本支持相同字段，再复制到项目根目录 `edgeone.json`。此文件不含密钥；120秒设置不能解决原逻辑约230秒的最坏情况。
4. 服务端运行时配置 `DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL=deepseek-flash` 和可选 `DEEPSEEK_BASE_URL=https://api.deepseek.com`。密钥由所有者在腾讯云界面录入，不能提交 Git 或聊天，不加 `NEXT_PUBLIC_`。
5. 上线前必须适配原 `/api/admin/deepseek` 的 Sites 身份验证：目标平台不能信任客户端提交的 `oai-authenticated-*` 头。首版使用腾讯云运行时 secret，并关闭该网页管理API，或实现新的管理员认证及私有存储。
6. 必须处理 DeepSeek 长调用和JSON修复总超时、补齐原 Worker 的可信IP限流/并发控制，并执行目标平台端到端验收。
7. 绑定稳定自定义域名；大陆节点按平台要求完成域名备案。验证三轮访谈、四阶段报告、中文 PDF、刷新恢复、跨域备份导入及大陆真实网络后，再分享新地址。

详细检查结果见 [迁移评估](../../docs/edgeone-migration.md)。原 Sites 的 `.openai/hosting.json`、Worker 和 R2 绑定仅供保留原站，不用于创建 EdgeOne 项目。

需要所有者处理的交互：腾讯云登录/实名认证、GitHub连接授权、运行时密钥输入、域名/备案资料以及任何收费方案确认。不要发送账号密码、短信验证码或完整API Key给开发者聊天。
