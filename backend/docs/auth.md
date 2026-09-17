# 鉴权与权限控制

## 当前实现

- 密码使用 Node.js `scryptSync` 加盐哈希保存，不保存明文密码。
- Web 登录成功后签发 Bearer Token，前端在请求头中携带 `Authorization: Bearer <token>`。
- 本地开发模式下，用户记录保存到 `data/users.json`；云端模式下由 CloudBase PostgreSQL 适配器保存。
- Token 默认有效期由 `AUTH_TOKEN_TTL_SECONDS` 控制，默认 7200 秒。
- `/api/v1/auth/me` 校验 Token，并只返回公开用户字段。
- `/api/v1/auth/logout` 撤销当前 Token。
- 角色权限定义在 `src/auth/auth.ts`。
- 本地开发种子账号为 `admin_demo`、`researcher_demo` 和 `evaluator_demo`，仅用于本地演示。

## 本地演示账号

以下账号只用于本地开发测试，不作为云端正式账号：

| 用户名 | 密码 | 角色 |
|---|---|---|
| `admin_demo` | `Admin123!` | admin |
| `researcher_demo` | `Researcher123!` | researcher |
| `evaluator_demo` | `Evaluator123!` | evaluator |

部署环境应在 PostgreSQL 中创建课程测试账号，并把密码私下同步给联调同学。不要把真实密码、JWT 或云密钥写入 GitHub、截图或群聊。

## 小程序登录边界

当前课程版小程序复用 Web 用户名密码登录接口完成演示。若后续要接入微信真实身份，应由任务4补充微信 `code` 登录流程，并由后端使用微信服务端接口校验后再绑定系统用户。

不要接受客户端直接传入的 `openId` 作为登录凭证；这不是可信鉴权。

## 权限策略

```text
admin:
  system:admin and all listed permissions

researcher:
  patient:read
  assessment:read
  assessment:create
  assessment:update
  scale:read
  file:read
  file:upload

evaluator:
  patient:read
  assessment:read
  assessment:create
  assessment:update
  file:read
  file:upload
```

以上权限是项目实现默认值，不属于量表 PDF 中的临床规则。
