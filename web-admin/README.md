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

默认启用 Mock 数据，演示账号：

```text
用户名：admin_demo
密码：Admin123!
```

## 对接任务3后端

复制环境变量文件：

```text
cp .env.example .env
```

把 `.env` 修改为：

```text
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCK=false
```

开发服务器会将 `/api` 代理到 `http://localhost:3000`。先在 `backend` 目录启动任务3服务，再启动本项目即可连接后端接口。

## 验证

```text
npm run typecheck
npm run build
```

构建结果输出到 `dist/`，部署时不要提交 `node_modules/` 或 `.env`。
