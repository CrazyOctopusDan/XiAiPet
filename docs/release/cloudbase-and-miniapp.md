# CloudBase and Miniapp Release Notes

## 当前后端调用架构

- 客户端和商户端小程序的业务后端调用现在通过独立 Node.js API 服务完成，路径统一为 `/api/v1`。
- 正式环境 API 域名为 `https://api.xiaipet.vip`；开发环境可通过小程序服务层的显式 override 指向本地或联调地址，不提交真实 ECS IP、RDS 账号、OSS 密钥或其他 secrets。
- CloudBase function calls are not part of the target architecture。迁移后的登录、目录、运行配置、下单、支付同步、订单、商户权限、商户订单、商品管理、用户余额、运行配置管理和小票打印调用都不应再回到 `wx.cloud.callFunction`。
- Phase 11 OSS 会接管商品图片、Banner 和其他对象资源上传/访问。Phase 10 不保留 CloudBase 存储作为隐藏后端依赖；上传能力在 OSS 接入前应显式不可用或走后端签名上传方案。
- Phase 12 客户端与商户端小程序回归以 `docs/release/miniapp-regression.md` 为 source of truth；该清单同时记录自动化测试命令、手工验证步骤、ICP/legal-domain gate 和 real WeChat Pay gate。
- 旧 CloudBase 后端代码可以在 Phase 10 HTTP 迁移和 Phase 11 OSS 迁移都验证通过后删除；删除前只保留为历史回滚参考，不作为发布链路的一部分。

## 环境约束

- CloudBase 只使用 `dev` 和 `prod` 两套环境。
- 日常开发、联调、验收只进入 `dev`。
- `prod` 发布必须通过 `scripts/release-prod.sh prod confirm-prod-release` 手动执行。

> 下面的 CloudBase 发布流程是旧后端链路记录。Phase 10 之后的小程序业务后端发布应以 `apps/api` 的 ECS/RDS/HTTP API 部署为准。

## 敏感配置放置

- 本地环境变量放在 `apps/cloud-functions/.env.local` 或按团队约定的未入仓路径。
- 小程序上传私钥、`.key`、开发者工具私有配置必须保存在本机，不得提交到仓库。
- `apps/cloud-functions/.env.dev.example` 和 `.env.prod.example` 只保留占位键，不存放真实 secrets。

## CloudBase 发布流程

1. 检查 `apps/cloud-functions/cloudfunctions.json` 是否包含 `bootstrapUser`、`bindPhone`、`assertMerchantAccess`。
2. 在本机创建未入仓的 `apps/cloud-functions/.env.dev.local` 或 `.env.local`，至少填写 `CLOUDBASE_ENV_ID`、`WECHAT_APP_ID`。
3. 运行 `scripts/release-dev.sh dev`，脚本会生成 `apps/cloud-functions/dist/functions/<name>/index.js` 和 `dist/cloudbaserc.json`，然后调用 `tcb fn deploy`。
   - 函数包不提交本地 `node_modules`。公开 npm 依赖通过函数目录内 `package.json` 声明，由 CloudBase 远端安装。
   - 项目内共享代码 `@xiaipet/shared` 会在构建时改写为函数包内 `cloud/packages/shared/src/*` 相对引用，避免远端安装依赖时覆盖本地私有包。
   - 如果使用控制台前端编辑器手动更新代码，上传 `apps/cloud-functions/upload-packages/<function>.zip` 后使用“保存并安装依赖”。
   - 发布脚本默认使用 `tcb fn deploy --deployMode zip`，减少 COS 上传链路导致的 `ECONNRESET`。如需切回 COS，可临时执行 `CLOUDBASE_DEPLOY_MODE=cos scripts/release-dev.sh dev`。
4. 通过 CloudBase 控制台或 CLI 导入 `apps/cloud-functions/config/collections`、`config/indexes`、`config/security`。
5. 在微信开发者工具分别打开 `apps/customer-miniapp` 与 `apps/merchant-miniapp` 做冒烟验证。
6. 只有在开发环境验证通过后，才允许人工执行正式发布脚本。

## 本地环境文件示例

- `apps/cloud-functions/.env.dev.local`
- `apps/cloud-functions/.env.prod.local`

示例：

```bash
CLOUDBASE_ENV_NAME=dev
CLOUDBASE_ENV_ID=你的云开发环境ID
WECHAT_APP_ID=你的小程序AppID
RELEASE_CHANNEL=manual-dev
CLOUDBASE_FUNCTION_RUNTIME=Nodejs20.19
```

说明：

- 如果 CloudBase 控制台里已经提供 `Node.js 24.x`，手动上传函数时可以直接在控制台选择 `24.x`。
- 如果后续继续使用 CLI 自动部署，请把 `CLOUDBASE_FUNCTION_RUNTIME` 改成控制台里对应的精确运行时字符串，再执行发布脚本。

## 禁忌项

- 不要把 `.env`、`.key`、开发者工具私有配置、云缓存提交进仓库。
- 不要让客户端直接写 `users`、`merchant_users`、`runtime_configs`。
- 不要省略 `prod` 参数和人工确认文本后直接发布正式环境。
