# 认知筛查系统

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
| `integration/all-tasks` | 当前全任务整合分支 |

各任务分支用于记录对应模块的开发内容，项目统一成果汇总在 `integration/all-tasks` 分支。

## 当前整合内容

`integration/all-tasks` 已整合：

- 6 个量表的评分引擎和配置；
- TypeScript 评分引擎迁移包和黄金用例；
- Node.js/TypeScript 后端；
- CloudBase PostgreSQL 和私有对象存储适配器；
- JWT 登录、Bearer Token 和角色权限；
- 患者、测评、统计、报告、账号和操作日志接口；
- 微信小程序端；
- Vue 3 + Element Plus Web 管理后台；
- UI/设计资源和测试文档；
- 后端业务测试和部署文档。

整合后的后端通过环境变量选择本地或 CloudBase 运行模式。前端仍保留 Mock 模式，但 `.env.example` 默认已经指向已部署的后端地址并关闭 Mock，便于联调。

## 目录结构

```text
.
├─ scoring/              Python 评分引擎
├─ ts/                   TypeScript 评分引擎迁移包及测试
├─ db/                   评分引擎数据库辅助代码
├─ sql/                  数据库结构、迁移和种子数据
├─ fixtures/             量表配置和测试用例
├─ tests/                Python 评分测试
├─ scripts/              数据生成、配置转换和辅助脚本
├─ backend/              Node.js 后端服务
│  ├─ src/               API、鉴权、数据库和云服务适配器
│  ├─ tests/             后端业务接口测试
│  ├─ cloud-functions/   云函数示例和部署入口
│  ├─ docs/              后端接口、部署和交接文档
│  └─ sql/               后端数据库脚本
├─ mini-program/         微信小程序端
│  ├─ pages/             页面
│  ├─ services/           接口和登录服务
│  └─ custom-tab-bar/    自定义底部导航
├─ web-admin/             Vue 3 Web 管理后台
│  └─ src/               页面、组件、路由和状态管理
├─ docs/                 项目说明、接口契约和审计记录
├─ LICENSE               MIT 许可证
└─ README.md             项目说明
```

## 快速入口

- [后端说明](backend/README.md)
- [Web 管理后台说明](web-admin/README.md)
- [微信小程序说明](mini-program/README.md)
- [评分引擎说明](ts/README.md)
- [后端接口文档](backend/docs/api.md)
- [业务接口说明](backend/docs/task3-business-api.md)
- [云端部署说明](backend/docs/cloud-integration.md)
- [文档可读性审计](docs/document-readability-audit.md)

## 功能模块

- 量表评分：支持 SCD-Q9、GDS-15、FAQ、MMSE、MoCA-B、CDR。
- 微信小程序：患者信息、量表选择、测评录入、结果和报告入口。
- Web 管理后台：登录、权限、患者管理、测评记录、统计、报告和操作日志。
- 后端服务：统一 API、JWT 鉴权、角色权限、数据库访问和私有文件存储。
- 协作交付：各模块保留独立开发记录，整合分支提供统一运行入口。

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

## 小程序运行

```text
使用微信开发者工具导入 mini-program 目录
检查 app.js 中的 apiBaseUrl
编译并预览
```

当前小程序默认指向已部署的课程版后端；如需本地调试，可将 `apiBaseUrl` 改为 `http://localhost:3000/api/v1`。

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
- 任务4小程序、任务6设计资源和任务7测试文档已纳入整合分支；
- 已配置云端服务可直接用于课程演示和接口访问，不需要重复创建新的云端环境。
