# 任务包 2：CloudBase 云端接入说明

## 运行模式

默认使用本地开发模式。部署到 CloudBase 时，需要显式开启云端模式：

```env
DATA_DRIVER=cloudbase
STORAGE_DRIVER=cloudbase
CLOUDBASE_ENV_ID=ad-scd-dev-d1g1y08v5962945fd
STORAGE_BUCKET=ad-scd-files
JWT_SECRET=<部署环境中的长随机密钥>
CORS_ORIGINS=http://localhost:5173
```

云端模式下，用户、患者、测评记录、答案、操作日志、文件元数据和文件二进制内容使用任务2 CloudBase 服务。若数据库是早期结构创建的，需要先执行一次 `sql/005_add_answer_option_code.sql`。

CloudBase 密钥是可选项。同环境云托管优先使用运行身份，不创建长期 CAM 密钥。只有部署日志明确提示缺少凭证或无权限时，才考虑配置 `CLOUDBASE_SECRETID` 和 `CLOUDBASE_SECRETKEY`。这些值绝不能提交到 Git。

## 测试账号

本地生成密码哈希：

```text
npm run auth:hash -- <password>
```

在 CloudBase SQL 编辑器中插入课程测试账号。只替换哈希占位符，不保存明文密码。

```sql
INSERT INTO users (user_id, auth_provider, username, password_hash, display_name, role_codes, status)
VALUES
  ('usr_test_admin', 'web', 'admin_test', '<ADMIN_HASH>', 'Test Administrator', ARRAY['admin'], 'active'),
  ('usr_test_researcher', 'web', 'researcher_test', '<RESEARCHER_HASH>', 'Test Researcher', ARRAY['researcher'], 'active')
ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role_codes = EXCLUDED.role_codes,
  status = 'active',
  updated_at = NOW();
```

密码只私下发给任务3、任务5和测试同学，不放入 Git、截图、Issue 或群聊。

## 云托管部署

将 `backend` 目录部署为一个 Node.js 服务，Node 版本使用 20 或更高：

```text
安装命令：npm ci
启动命令：npm start
容器端口：3000
```

在服务设置中配置上面的环境变量。`CORS_ORIGINS` 填任务5开发地址和部署地址，多个来源用英文逗号分隔，不使用 `*`。

## 验收检查

1. `GET /api/v1/health` 返回数据库和存储 `connected`。
2. `POST /api/v1/auth/web/login` 可使用课程测试账号登录。
3. `GET /api/v1/auth/me` 能识别返回的 Token，错误 Token 返回 401。
4. 通过 `POST /api/v1/files` 上传不含隐私的 PDF 或图片，并确认 PostgreSQL `files` 中出现元数据。
5. 在私有桶中确认文件位于 `scale-assets/` 或 `assessment-reports/` 前缀下。
6. 通过 `GET /api/v1/files/:fileId/download` 下载文件。
7. 允许来源能收到 `Access-Control-Allow-Origin`，未配置来源不能跨域访问。

当前课程版云托管后端地址：`https://adscdbackend-311006-10-1479821149.sh.run.tcloudbase.com`。
