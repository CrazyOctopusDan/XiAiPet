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
