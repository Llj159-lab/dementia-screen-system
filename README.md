# 认知筛查系统

面向医院的阿尔茨海默病前期认知筛查评估系统，提供微信小程序、Web 管理后台、量表评分引擎和 CloudBase 后端服务，适用于课程作业和小组协作。

## 项目功能

- 医护人员在微信小程序中录入患者信息并完成认知量表筛查；
- 统一计算 SCD-Q9、GDS-15、FAQ、MMSE、MoCA-B、CDR 等量表；
- 在 Web 管理后台查看患者、测评记录、统计数据和筛查报告；
- 使用 PostgreSQL 保存业务数据，使用私有云存储保存量表资源和报告文件；
- 通过 JWT 和角色权限控制管理后台访问。

## 技术栈

- 后端：Node.js、TypeScript、CloudBase PostgreSQL、私有对象存储；
- 评分引擎：Python、TypeScript；
- 微信小程序：微信原生小程序；
- Web 管理后台：Vue 3、Element Plus、Pinia、ECharts；
- 协作工具：Git、GitHub。

## 任务分工

| 任务 | 内容 |
| --- | --- |
| 任务1 | 量表配置、评分算法、数据库种子数据和评分测试 |
| 任务2 | CloudBase PostgreSQL、私有云存储、鉴权和后端部署支持 |
| 任务3 | 患者、测评、统计、报告、账号和操作日志接口 |
| 任务4 | 微信小程序端 |
| 任务5 | Vue 3 Web 管理后台 |
| 任务6 | UI 原型、量表素材和设计资源 |
| 任务7 | 测试、项目文档和结题材料 |

完整项目代码和运行文件统一汇总在 [`integration/all-tasks`](https://github.com/Llj159-lab/dementia-screen-system/tree/integration/all-tasks) 分支；`main` 分支用于展示项目首页说明。

## 整合分支目录结构

```text
.
├─ scoring/              Python 评分引擎
├─ ts/                   TypeScript 评分引擎及测试
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
│  ├─ services/          接口和登录服务
│  └─ custom-tab-bar/    自定义底部导航
├─ web-admin/            Vue 3 Web 管理后台
│  └─ src/               页面、组件、路由和状态管理
├─ docs/                 项目说明、接口契约和审计记录
├─ LICENSE               MIT 许可证
└─ README.md             项目说明
```

## 快速入口

- [整合分支](https://github.com/Llj159-lab/dementia-screen-system/tree/integration/all-tasks)
- [后端说明](https://github.com/Llj159-lab/dementia-screen-system/blob/integration/all-tasks/backend/README.md)
- [Web 管理后台说明](https://github.com/Llj159-lab/dementia-screen-system/blob/integration/all-tasks/web-admin/README.md)
- [微信小程序说明](https://github.com/Llj159-lab/dementia-screen-system/blob/integration/all-tasks/mini-program/README.md)
- [评分引擎说明](https://github.com/Llj159-lab/dementia-screen-system/blob/integration/all-tasks/ts/README.md)
- [后端接口文档](https://github.com/Llj159-lab/dementia-screen-system/blob/integration/all-tasks/backend/docs/api.md)
- [云端部署说明](https://github.com/Llj159-lab/dementia-screen-system/blob/integration/all-tasks/backend/docs/cloud-integration.md)
- [文档可读性审计](https://github.com/Llj159-lab/dementia-screen-system/blob/integration/all-tasks/docs/document-readability-audit.md)

## 本地运行

```powershell
cd backend
npm ci
npm run typecheck
npm run build
node --test --import tsx tests/business-api.test.ts
npm start
```

健康检查地址：`http://localhost:3000/api/v1/health`

Web 管理后台：

```powershell
cd web-admin
npm ci
npm run typecheck
npm run build
npm run dev
```

小程序使用微信开发者工具导入整合分支中的 `mini-program` 目录运行。各模块的详细配置和部署说明见整合分支对应目录下的 README。

## 安全说明

密钥、密码、JWT、真实患者信息和本地 `.env` 文件不得提交到 GitHub。云端运行需要在部署环境变量中配置数据库、对象存储、JWT 和 CORS 参数。