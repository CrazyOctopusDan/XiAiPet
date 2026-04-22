# CloudBase and Miniapp Release Notes

## 环境约束

- CloudBase 只使用 `dev` 和 `prod` 两套环境。
- 日常开发、联调、验收只进入 `dev`。
- `prod` 发布必须通过 `scripts/release-prod.sh prod confirm-prod-release` 手动执行。

## 敏感配置放置

- 本地环境变量放在 `apps/cloud-functions/.env.local` 或按团队约定的未入仓路径。
- 小程序上传私钥、`.key`、开发者工具私有配置必须保存在本机，不得提交到仓库。
- `apps/cloud-functions/.env.dev.example` 和 `.env.prod.example` 只保留占位键，不存放真实 secrets。

## CloudBase 发布流程

1. 检查 `apps/cloud-functions/cloudfunctions.json` 是否包含 `bootstrapUser`、`bindPhone`、`assertMerchantAccess`。
2. 在本机创建未入仓的 `apps/cloud-functions/.env.dev.local` 或 `.env.local`，至少填写 `CLOUDBASE_ENV_ID`、`WECHAT_APP_ID`。
3. 运行 `scripts/release-dev.sh dev`，脚本会生成 `apps/cloud-functions/dist/functions/<name>/index.js` 和 `dist/cloudbaserc.json`，然后调用 `tcb fn deploy`。
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
