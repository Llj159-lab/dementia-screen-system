# AD SCD 后端服务

本目录是阿尔茨海默病前期 SCD 筛查系统的后端服务，负责统一 API、鉴权、量表业务接口、文件接口和 CloudBase 运行适配。

## 当前范围

- TypeScript HTTP 服务框架；
- 统一 JSON 响应结构和 `X-Request-Id` 链路标识；
- 健康检查接口；
- 面向 Web 后台和小程序的 CORS 配置；
- 七张 PostgreSQL 业务表结构；
- 本地文件模式和 CloudBase RDB/对象存储模式，可通过环境变量切换；
- Web 登录、JWT、Bearer Token、RBAC 权限控制；
- 患者、测评、统计、报告导出、账号管理和操作日志接口；
- 任务1六大量表评分配置接入，包括 Morris CDR 和 CDR-SB；
- 业务接口自动化测试。

## 本地运行

```text
npm install
npm run typecheck
npm run db:validate
npm run start
```

健康检查地址：

```text
GET http://localhost:3000/api/v1/health
```

数据库结构定义在 `src/database/schema.ts`。`npm run db:validate` 用于校验集合名称、字段、枚举和索引配置。

本地模式首次启动会生成 `data/users.json`，内置三个演示账号。该文件只用于本地开发，不代表云端数据库。

## 云端运行

CloudBase 部署时设置：

```text
DATA_DRIVER=cloudbase
STORAGE_DRIVER=cloudbase
CLOUDBASE_ENV_ID=ad-scd-dev-d1g1y08v5962945fd
STORAGE_BUCKET=ad-scd-files
JWT_SECRET=<部署环境变量中填写>
CORS_ORIGINS=<前端访问来源>
```

密钥、密码、JWT 和真实患者信息不能提交到 Git。健康检查会返回数据库、业务数据适配器和对象存储的连接状态。

## 数据库脚本

- `sql/001_init.sql`：初始化后端数据库结构；
- `sql/004_seed_scale_configs.sql`：导入任务1量表配置；
- `sql/005_add_answer_option_code.sql`：为整合版补充答案选项编码字段。

已有数据库在部署整合版后端前，应先执行 `sql/005_add_answer_option_code.sql`。

## 文档入口

- `docs/api.md`：基础 API 说明；
- `docs/task3-business-api.md`：业务接口契约；
- `docs/cloud-integration.md`：CloudBase 数据库、鉴权和存储说明；
- `docs/deployment-ops.md`：部署与运维验收清单；
- `docs/task1-conversion.md`：任务1量表配置转换说明。
