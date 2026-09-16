# 任务包 2：部署与运维验收清单

## 已完成的本地交付

- 后端 TypeScript 服务可以启动；
- 统一 JSON 返回结构和 `X-Request-Id`；
- Web 登录、Bearer Token、退出登录和 RBAC；
- 本地文件上传、元数据查询、列表和下载；
- PostgreSQL 建表脚本；
- 云函数健康检查脚手架。

## 用户已完成的 CloudBase 控制台配置

- PostgreSQL 七张表已创建；
- 私有存储桶 `ad-scd-files` 已创建；
- `storage.objects` 已配置 `authenticated` 角色的读取和上传策略。

以上内容来自用户提供的控制台截图；本工作区没有直接登录腾讯云控制台复核。

## 当前云端状态

环境：`ad-scd-dev-d1g1y08v5962945fd`

- CloudBase environment: `ad-scd-dev-d1g1y08v5962945fd`
- PostgreSQL tables: created
- Private storage bucket `ad-scd-files`: created
- `storage.objects` authenticated read/upload policies: configured
- Health-check cloud function: deployed by the project owner

## 整合后上线步骤

1. 在 CloudBase SQL 编辑器执行 `sql/005_add_answer_option_code.sql`；
2. 将包含任务3和任务5整合代码的分支部署为 Node.js 服务；
3. 设置 `DATA_DRIVER=cloudbase`、`STORAGE_DRIVER=cloudbase`、`JWT_SECRET`；
4. 将 Web 静态站点域名加入 `CORS_ORIGINS`；
5. 重新部署后检查 `/api/v1/health`，其中 `database` 和 `businessStore` 均应显示 `connected`；
6. 用 Web 后台完成一次登录、新建患者、查看测评记录、导出报告的端到端验证。

生产级监控、告警和灾备不属于本课程任务范围。

The cloud console should be used as the source of truth for future deployment
changes.

## 日常运维最小方案

每次演示前：

1. 检查云函数最近一次调用是否成功；
2. 检查 PostgreSQL 中 7 张表仍存在；
3. 检查本地后端 `GET /api/v1/health`；
4. 检查文件上传和下载各一次；
5. 将异常请求的 `requestId` 记录下来，方便和日志对应。
