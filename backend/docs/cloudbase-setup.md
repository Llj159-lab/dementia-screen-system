# CloudBase 云开发配置记录

## 本地已验证内容

- 后端数据库结构、本地用户存储和本地文件存储已实现。
- CloudBase PostgreSQL 和私有云存储适配器已在代码中提供。
- 用户提供的 CloudBase 环境 ID 为 `ad-scd-dev-d1g1y08v5962945fd`。
- 用户已提供 PostgreSQL 表、私有桶 `ad-scd-files`、`storage.objects` 已登录用户读写策略和云托管健康检查截图。
- 腾讯云密钥、微信 AppSecret、JWT 和测试账号密码只保存在部署环境或私下交接，不写入仓库。

## 配置记录

1. 环境 ID：`ad-scd-dev-d1g1y08v5962945fd`。
2. 数据库：PostgreSQL，项目负责人已创建七张应用表。
3. 存储桶：`ad-scd-files`，权限为私有。
4. 存储前缀：`scale-assets/` 和 `assessment-reports/`。
5. `storage.objects` 策略允许 `authenticated` 用户读取和上传。
6. 云托管后端地址：`https://adscdbackend-311006-10-1479821149.sh.run.tcloudbase.com`。
7. 凭证必须保存在腾讯云密钥配置或本地忽略的环境变量中，不能写入源码。

## 整合环境变量

```text
CLOUD_ENV_ID=ad-scd-dev-d1g1y08v5962945fd
CLOUDBASE_ENV_ID=ad-scd-dev-d1g1y08v5962945fd
DATA_DRIVER=cloudbase
STORAGE_DRIVER=cloudbase
STORAGE_BUCKET=ad-scd-files
JWT_SECRET=<部署环境中配置>
CORS_ORIGINS=<Web后台来源，多个用英文逗号分隔>
```

## 说明

仅设置环境 ID 不会自动切换运行模式；需要同时设置 `DATA_DRIVER=cloudbase` 和 `STORAGE_DRIVER=cloudbase`。同环境云托管优先使用运行身份访问 CloudBase 服务，只有日志明确提示缺少凭证或无权限时，才补充最小权限密钥配置。
