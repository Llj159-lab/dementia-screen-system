# 任务包 2 验收记录

更新时间：2026-09-17

## 已完成且有证据

- [x] CloudBase 环境 ID 已提供：`ad-scd-dev-d1g1y08v5962945fd`
- [x] PostgreSQL 中已创建 7 张表；用户提供控制台结果截图，返回了全部表名
- [x] 私有存储桶已创建：`ad-scd-files`
- [x] `storage.objects` 已创建已登录用户读取策略：`ad_scd_authenticated_read`
- [x] `storage.objects` 已创建已登录用户上传策略：`ad_scd_authenticated_upload`
- [x] 本地 Web 登录、Bearer Token、退出登录和 RBAC 已实际验证
- [x] 本地文件上传、列表、元数据和下载已实际验证
- [x] 统一响应格式、`X-Request-Id` 和 OpenAPI 文档已提供
- [x] 云函数健康检查脚手架已通过本地 Node.js smoke test
- [x] Node.js 后端已补充 CloudBase PostgreSQL 适配器，可通过 `DATA_DRIVER=cloudbase` 切换
- [x] Node.js 后端已补充 CloudBase 私有云存储适配器，可通过 `STORAGE_DRIVER=cloudbase` 切换
- [x] 云托管后端地址已记录：`https://adscdbackend-311006-10-1479821149.sh.run.tcloudbase.com`
- [x] 任务1评分配置、任务3业务接口、任务4小程序和任务5后台已合并到 `integration/all-tasks`

## 演示验收建议

- [x] 保存 CloudBase 控制台中 `/api/v1/health` 可访问截图，作为部署证明
- [x] 使用课程测试账号验证 `POST /api/v1/auth/web/login`、`GET /api/v1/auth/me` 和登出流程
- [x] 使用不含隐私的 PDF 或图片验证文件上传、元数据查询和下载流程
- [x] 将 Web 后台访问来源配置到 `CORS_ORIGINS`，用于浏览器跨域访问
- [x] 小程序端按当前后端地址调用接口，相关页面由任务4代码负责展示

## 提交原则

GitHub 中提交本目录的代码、SQL、云函数脚手架、接口文档和验收记录。
不要提交 `.env`、数据库密码、云 API 密钥、`data/users.json`、
`data/files.json`、本地上传文件或真实患者资料。
