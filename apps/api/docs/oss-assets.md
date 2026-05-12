# OSS 资产上传与访问配置

Phase 11 将商户端图片上传从 CloudBase 文件 ID 迁移到阿里云 OSS。小程序只获取短期 POST policy，不持有 OSS AccessKey Secret。

## 环境变量

- `OSS_REGION`：OSS 区域，例如 `oss-cn-shanghai`
- `OSS_BUCKET`：资产 Bucket 名称
- `OSS_ENDPOINT`：OSS endpoint，例如 `oss-cn-shanghai.aliyuncs.com`
- `OSS_PUBLIC_BASE_URL`：可公开访问的资产 URL 前缀，末尾不需要 `/`
- `OSS_ACCESS_KEY_ID`：用于服务端签发 POST policy
- `OSS_ACCESS_KEY_SECRET`：仅服务端环境变量保存
- `OSS_UPLOAD_POLICY_TTL_SECONDS`：上传 policy 有效期，默认 `900`

## Production OSS Smoke Checklist

生产环境确认值：

```bash
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=xiaipet-assets-prod
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_PUBLIC_BASE_URL=https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com
```

上线前按顺序检查：

1. ECS 的 `apps/api/.env.production` 使用上述非密钥值，并只在服务端保存 `OSS_ACCESS_KEY_ID` 与 `OSS_ACCESS_KEY_SECRET`。
2. 调用商户端上传 policy 接口，确认返回的 `host` 指向 `https://xiaipet-assets-prod.oss-cn-hangzhou.aliyuncs.com`，`dir`/`key` 在预期业务前缀下，且响应不包含 RAM `AccessKeySecret`。
3. 用商户端 `wx.uploadFile` 上传一张安全测试图片，预期 OSS 返回 204/200，后端 confirm 接口返回 `oss://xiaipet-assets-prod/...` 与公开 URL。
4. 在客户小程序和商户小程序各打开一个使用 OSS 图片的页面，预期图片通过 `OSS_PUBLIC_BASE_URL` 正常显示，而不是 `oss://` 或旧 `cloud://` 地址。
5. 在微信后台合法域名配置中确认 OSS 公开域名已按当前平台要求加入下载/图片相关域名；ICP 未完成前不要把该项标记为正式发布通过。

RAM `AccessKeySecret` is never entered in miniapp code, miniapp local storage, request payloads, uploaded form fields outside the signed OSS policy, or committed documentation.

## CORS Checklist

OSS Bucket CORS 默认关闭；通过控制台或 API 更新 CORS 会覆盖现有规则，因此修改前先导出现有规则并确认没有其他业务依赖。

为商户端直传 OSS 准备规则时确认：

1. 来源域名与微信小程序上传环境兼容。正式发布以微信小程序平台允许的上传来源为准；开发期只用于验证，不放宽生产规则来绕过域名限制。
2. `wx.uploadFile` 使用表单 POST 上传，允许方法至少包含 `POST` 和 `OPTIONS`。
3. Allowed headers 覆盖 OSS PostObject 表单上传需要的请求头，例如 `content-type`、`x-oss-*`，以及微信上传链路实际发送的安全 headers。
4. Expose headers 不暴露密钥；可按需暴露 `etag`、`x-oss-request-id` 用于排查。
5. Max age 使用保守值，变更后重新执行一次 `wx.uploadFile` 上传和图片展示 smoke。

## 小程序上传流程

1. 商户端选择图片，并按角色裁剪/压缩。
2. 商户端调用 `POST /api/v1/merchant/assets/upload-policies` 获取 OSS 表单字段。
3. 商户端用 `wx.uploadFile` 直传 OSS，字段名为 `file`。
4. 商户端调用 `POST /api/v1/merchant/assets/uploads/confirm`，后端返回 `oss://bucket/objectKey` 和 `imageAsset`。
5. 商品或 banner 保存时同时写入旧兼容字段 `fileId/imageFileId` 和新的 `asset/imageAsset`。

## 成本控制

上传按角色生成不同展示变体，列表优先使用 `thumbnail`，商品介绍使用 `display`，详情图使用 `detail`，首页 banner 使用 `banner`。
前端展示时不得直接把 `oss://` 当作图片地址，应优先使用资产对象中的公开 URL。

## 迁移报告

将 CloudBase 导出 JSON 放到 `apps/api/tmp/cloudbase-export.json` 后运行：

```bash
pnpm --filter @xiaipet/api assets:migrate -- tmp/cloudbase-export.json tmp/asset-migration-report.md
```

报告只发现旧 `cloud://` 引用并建议目标 OSS key，不会上传文件，也不会修改数据库。
