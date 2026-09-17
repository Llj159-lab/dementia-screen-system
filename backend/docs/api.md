# API 接口契约

## 响应结构

所有 JSON 响应统一使用：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "requestId": "uuid-or-client-request-id"
}
```

## 健康检查

`GET /api/v1/health`

该接口返回服务进程、数据库、业务数据存储和对象存储状态。CloudBase 模式下，它用于判断部署后的基础可用性。

## 未找到路由

未知路由返回 HTTP 404 和业务码 `40401`。

## 鉴权接口

### Web 登录

`POST /api/v1/auth/web/login`

请求体：

```json
{
  "username": "admin_demo",
  "password": "Admin123!"
}
```

响应中包含 Bearer Token 和公开用户信息。CloudBase 模式下，用户从 PostgreSQL `users` 表读取。

### 当前用户

`GET /api/v1/auth/me`

请求头：

```text
Authorization: Bearer <token>
```

### 退出登录

`POST /api/v1/auth/logout`

当前 Token 会被撤销。

### 小程序登录

`POST /api/v1/auth/mini-program/login`

该接口预留给微信云开发身份流程。课程版小程序可以复用 Web 用户名密码登录接口完成演示；后续接入微信真实身份时，应由服务端校验微信登录凭证，不接受客户端任意传入的 `openId`。

### 角色权限检查

`GET /api/v1/system/admin-check`

需要 `system:admin` 权限，用于验证 RBAC 权限控制。

### 文件上传

`POST /api/v1/files`

需要 `file:upload` 权限。课程版实现使用 JSON 请求体传递 base64 文件内容：

```json
{
  "originalName": "scale.png",
  "mimeType": "image/png",
  "relatedType": "scale_config",
  "relatedId": "scd-q9-v1",
  "contentBase64": "<base64-content>"
}
```

允许文件类型包括 PDF、JPEG、PNG、WebP 和 XLSX。本地开发限制为 20 MiB。响应返回 `fileId` 和存储键。本地模式写入 `data/files`，CloudBase 模式写入私有云存储。

### 文件列表和元数据

`GET /api/v1/files?relatedType=assessment&relatedId=<id>`

需要 `file:read` 权限，只返回文件元数据。

`GET /api/v1/files/<fileId>`

需要 `file:read` 权限，返回单个文件元数据。

`GET /api/v1/files/<fileId>/download`

需要 `file:read` 权限，返回二进制文件。下载响应不是 JSON。

设置 `STORAGE_DRIVER=cloudbase` 后，文件通过 CloudBase SDK 上传，元数据保存到 PostgreSQL，存储桶保持私有。
