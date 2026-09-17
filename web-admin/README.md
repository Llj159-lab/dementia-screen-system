# Web 管理后台（任务5）

基于 Vue 3、TypeScript、Element Plus、ECharts、Pinia 和 Vue Router 开发的认知筛查管理后台。

## 已实现

- 登录、Token 持久化、路由守卫和角色菜单
- 首页数据看板和 ECharts 得分分布图
- 患者列表、新增、编辑、删除、多条件筛选和分页
- 测评记录筛选、详情、报告预览、打印、PDF 与批量 Excel 导出
- 账号管理、密码修改和操作日志
- Chrome、Edge 适配和桌面/平板/手机响应式布局
- Mock 数据模式与真实任务3 API模式切换

## 本地运行

```text
npm install
npm run typecheck
npm run dev
```

不配置环境变量时可使用 Mock 数据，演示账号：

```text
用户名：admin_demo
密码：Admin123!
```

## 对接任务3后端

复制环境变量文件：

```text
cp .env.example .env
```

本地连接已启动的后端时，把 `.env` 修改为：

```text
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCK=false
```

开发服务器会将 `/api` 代理到 `http://localhost:3000`。先在 `backend` 目录启动任务3服务，再启动本项目即可连接后端接口。

连接 CloudBase 已部署后端时，可参考 `.env.cloud.example` 或当前 `.env.example`。不要把包含真实密钥、账号密码或患者信息的 `.env` 文件提交到 Git。

## 云端部署

1. 先部署整合后的 `backend`，执行 `backend/sql/005_add_answer_option_code.sql`；
2. 将 `.env.cloud.example` 复制为 `.env.production`；
3. 执行 `npm ci && npm run build`；
4. 将 `dist/` 发布到 CloudBase 静态网站托管；
5. 把静态网站域名加入后端 `CORS_ORIGINS` 后重新部署后端。

完成后，Web 登录、患者管理、测评记录、统计看板、PDF/Excel 导出、账号管理与操作日志均使用云端真实数据。

## 验证

```text
npm run typecheck
npm run build
```

构建结果输出到 `dist/`，部署时不要提交 `node_modules/` 或 `.env`。
