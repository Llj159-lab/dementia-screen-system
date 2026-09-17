# PostgreSQL 作业执行手册

## 结论

截图中的 PostgreSQL 数据库可以继续使用。后端已经提供 PostgreSQL 建表脚本，并在整合版本中补充 CloudBase RDB 适配器。作业不需要完成生产级多实例、正式域名、商业化监控或灾备。

本次最低可交付目标：

1. PostgreSQL 中成功创建 7 张表；
2. 后端保留健康检查、登录和 RBAC 接口；
3. 能证明后端使用的表结构与项目设计一致；
4. 在文档中区分本地开发模式和 CloudBase 云端模式，避免混淆运行环境。

## 你现在在腾讯云控制台要做

1. 进入环境 `ad-scd-dev-d1g1y08v5962945fd`。
2. 打开你已经选择的 PostgreSQL 数据库，找到连接信息或 SQL 执行入口。
3. 如果控制台提供 SQL 编辑器，打开它。
4. 如果没有 SQL 编辑器，使用 PostgreSQL 客户端（例如 `psql`、DBeaver 或 pgAdmin）连接。
5. 执行 `backend/sql/001_init.sql` 的全部内容。
6. 检查是否出现以下 7 张表：
   - `users`
   - `patients`
   - `scale_configs`
   - `assessment_records`
   - `assessment_answers`
   - `files`
   - `operation_logs`
7. 也可以执行 `backend/sql/002_verify.sql`，预期返回 7 行表名。
8. 截一张“表已创建”的控制台截图，或复制表名列表给我。

不要把数据库密码发到聊天中，也不要把密码写进 Git 文件。

## 连接信息怎么放到本地

如果腾讯云提供标准 PostgreSQL 连接串，建议在本机创建 `backend/.env`：

```text
DATABASE_URL=postgresql://用户名:密码@主机:端口/数据库名
CLOUD_ENV_ID=ad-scd-dev-d1g1y08v5962945fd
```

整合版后端优先通过 `@cloudbase/node-sdk` 的运行身份访问同环境 CloudBase PostgreSQL，不要求在代码中保存长期 CAM 密钥。部署时设置 `DATA_DRIVER=cloudbase` 和 `CLOUDBASE_ENV_ID` 后，健康检查会显示当前数据库适配器状态。

## 作业演示建议

演示顺序可以是：

1. 展示数据库控制台中的 7 张表；
2. 展示 `backend/src/database/schema.ts` 与 `backend/sql/001_init.sql` 的对应关系；
3. 启动后端；
4. 调用 `GET /api/v1/health`；
5. 调用 `POST /api/v1/auth/web/login`；
6. 调用 `GET /api/v1/auth/me`；
7. 用研究者账号调用管理员接口，展示 `40301` 权限拒绝；
8. 说明当前课程版已经支持云端适配器，生产级身份体系和更细粒度权限可作为后续扩展。

## 云存储配置

PG 模式下建议创建一个私有 Bucket，例如 `ad-scd-files`，再在 Bucket 内使用两个对象路径前缀：

```text
scale-assets/
assessment-reports/
```

本地开发模式使用 `data/files`；CloudBase 模式使用私有云存储适配器。演示和部署时以环境变量 `STORAGE_DRIVER` 区分两种模式。

创建 Bucket 时建议：

- 访问权限打开“私有桶”；
- 作业演示可设置 20 MB 文件大小限制；
- 允许类型填写 `image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`；
- 在 Bucket 内创建 `scale-assets` 和 `assessment-reports` 两个文件夹，或使用同名对象路径前缀；
- 不创建允许匿名读取或匿名上传的策略。

## 文件服务演示

文件服务同时支持本地开发适配器和 CloudBase 私有云存储适配器。演示时可以上传一张不含患者隐私的量表图片或小型报告文件，本地模式检查 `data/files.json`，云端模式检查 PostgreSQL `files` 表和私有桶对象。

## 真实性边界

已由本地实际验证：

- SQL 文件已按现有 TypeScript 数据模型编写；
- 原有 TypeScript 类型检查通过；
- 原有逻辑集合校验通过；
- 本地登录、身份读取、权限拒绝和退出失效通过。

由控制台或云端环境保存截图佐证：

- 腾讯云 PostgreSQL 表结构；
- CloudBase 云托管健康检查；
- 私有云存储目录和访问策略；
- 前端和小程序按统一 API 地址访问。
