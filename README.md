# dementia-screen-system

面向医院的阿尔茨海默病前期认知筛查评估系统。项目用于课程作业和小组协作，提供微信小程序端、Web 管理后台、量表评分引擎以及 CloudBase 后端基础服务。

## 项目目标

- 医护人员在微信小程序中录入患者信息并完成认知量表筛查；
- 通过统一评分规则计算 SCD-Q9、GDS-15、FAQ、MMSE、MoCA-B、CDR 等量表；
- 在 Web 管理后台查看患者、测评记录、统计数据和筛查报告；
- 使用 CloudBase PostgreSQL 保存业务数据，使用私有云存储保存量表资源和报告文件；
- 通过账号、JWT 和角色权限控制后台访问。

## 任务分支

| 分支 | 内容 |
| --- | --- |
| `task1` | 量表配置、评分算法、数据库种子数据和评分测试 |
| `task2-backend` | 后端基础服务初版 |
| `task2-cloud-integration` | CloudBase PostgreSQL、私有云存储、鉴权和部署支持 |
| `task3-business-api` | 患者、测评、统计、报告、账号和操作日志接口 |
| `task4-mini-program` | 微信小程序端 |
| `task5-web-admin` | Vue 3 Web 管理后台 |
| `task-6` | UI 原型、量表素材和设计资源 |
| `task7` | 测试、项目文档和结题材料 |
| `integration/all-tasks` | 当前已整合任务1、任务2、任务3、任务5的最终候选分支 |

任务4、任务6、任务7仍以远端各自分支为准。当前本地整合分支没有这些分支的工作树内容；合并前需要先成功获取对应远端分支，再审查目录和资源，避免仅凭分支名称认定已经纳入。

## 当前整合内容

`integration/all-tasks` 已整合：

- 6 个量表的评分引擎和配置；
- Node.js/TypeScript 后端；
- CloudBase PostgreSQL 和私有对象存储适配器；
- JWT 登录、Bearer Token 和角色权限；
- 患者、测评、统计、报告、账号和操作日志接口；
- Vue 3 + Element Plus Web 管理后台；
- 后端业务测试和部署文档。

整合后的后端通过环境变量选择本地或 CloudBase 运行模式。前端仍保留 Mock 模式，但 `.env.example` 默认已经指向已部署的后端地址并关闭 Mock，便于联调。

## 目录结构

```text
scoring/       任务1 Python 评分引擎
db/            评分引擎数据库辅助代码
sql/           任务1数据库脚本和种子数据
tests/         任务1评分测试
backend/       Node.js后端、CloudBase适配器、业务接口和部署文件
web-admin/     Vue 3 Web管理后台
docs/          项目开发说明和文档可读性审计
```

## 后端运行

```powershell
cd backend
npm ci
npm run typecheck
npm run build
node --test --import tsx tests/business-api.test.ts
npm start
```

健康检查地址：`http://localhost:3000/api/v1/health`

云端运行时需要配置 `DATA_DRIVER=cloudbase`、`STORAGE_DRIVER=cloudbase`、`CLOUDBASE_ENV_ID`、`STORAGE_BUCKET`、`JWT_SECRET` 和 `CORS_ORIGINS`。密钥、密码、JWT 和真实患者信息不得提交到 GitHub。

## Web 后台运行

```powershell
cd web-admin
npm ci
npm run typecheck
npm run build
npm run dev
```

本地开发时可以将 `VITE_USE_MOCK` 设置为 `true` 使用演示数据；与真实后端联调时设置为 `false`，并配置 `VITE_API_BASE_URL`。

## 支持量表

| 编码 | 量表 | 类型 |
| --- | --- | --- |
| `SCD_Q9` | 主观认知下降自测表 | 累加 |
| `GDS` | 老年抑郁量表 | 反向计分 |
| `FAQ` | 功能活动问卷 | 累加和 NA 处理 |
| `MMSE` | 简明精神状态检查 | 分项和教育界值 |
| `MOCA_B` | MoCA-B 基础量表 | 分项和教育界值 |
| `CDR` | 临床痴呆评定量表 | Morris 规则和 CDR-SB |

## 验收状态

- 后端类型检查、生产编译和业务接口测试已通过；
- 任务2云端健康检查和对象存储配置已完成；
- 任务4、任务6、任务7尚未在当前工作树中完成代码级合并；
- 完整验收时在已有云端服务上确认整合版本的业务接口即可，不需要重复创建新的云端环境。
