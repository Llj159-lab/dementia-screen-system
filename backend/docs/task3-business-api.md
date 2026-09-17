# 任务包 3：业务接口说明

本文是 Web 管理后台和微信小程序端的接口交接契约。除特别说明外，所有 JSON 接口都使用 `api.md` 中的统一响应结构，并需要请求头 `Authorization: Bearer <token>`。

## 运行与验证

```text
npm ci
npm run typecheck
npm run db:validate
npm test
npm start
```

本地开发模式下，业务演示数据保存到 `data/business.json`，用户数据保存到 `data/users.json`。可通过 `LOCAL_DATA_DIR` 修改保存位置。CloudBase 部署模式下，鉴权、业务数据、文件元数据和对象存储均使用云端适配器。

## 接口汇总

| 模块 | 方法和路径 | 权限 | 用途 |
| --- | --- | --- | --- |
| 量表 | `GET /api/v1/scales` | `scale:read` | 获取任务1六大量表配置列表 |
| 量表 | `GET /api/v1/scales/{scaleCode}` | `scale:read` | 获取题目、选项和评分元数据 |
| 患者 | `GET /api/v1/patients` | `patient:read` | 分页多条件查询 |
| 患者 | `POST /api/v1/patients` | `patient:create` | 新建患者 |
| 患者 | `GET /api/v1/patients/{patientId}` | `patient:read` | 患者详情 |
| 患者 | `PUT/PATCH /api/v1/patients/{patientId}` | `patient:update` | 更新患者 |
| 患者 | `DELETE /api/v1/patients/{patientId}` | `patient:delete` | 删除无测评记录的患者 |
| 测评 | `POST /api/v1/assessments` | `assessment:create` | 保存答案并提交测评 |
| 测评 | `GET /api/v1/assessments` | `assessment:read` | 分页查询测评记录 |
| 测评 | `GET /api/v1/assessments/{assessmentId}` | `assessment:read` | 测评、答案和患者详情 |
| 统计 | `GET /api/v1/statistics/overview` | `assessment:read` | 看板汇总和异常比例 |
| 统计 | `GET /api/v1/statistics/score-distribution` | `assessment:read` | ECharts 可用的得分分布数组 |
| 报告 | `GET /api/v1/reports/assessments/{assessmentId}.pdf` | `report:export` | 单份 PDF 报告 |
| 报告 | `GET /api/v1/reports/assessments.xls` | `report:export` | 按筛选条件批量导出 Excel 兼容文件 |
| 账号 | `GET /api/v1/system/accounts` | `system:admin` | 查询账号列表，不返回密码哈希 |
| 账号 | `POST /api/v1/system/accounts` | `system:admin` | 新建 Web 账号 |
| 账号 | `PATCH /api/v1/system/accounts/{userId}` | `system:admin` | 更新显示名、角色或状态 |
| 账号 | `PUT /api/v1/system/password` | 已登录 | 修改当前用户密码 |
| 审计 | `GET /api/v1/system/operation-logs` | `operation_log:read` | 查询操作日志 |

## 患者接口

列表查询参数包括 `page`、`pageSize`（最大 200）、`keyword`（匹配患者编号或姓名）、`gender` 和 `status`。

新建示例：

```json
{
  "patientCode": "SCD-2026-001",
  "name": "示例患者",
  "gender": "female",
  "birthDate": "1958-06-01",
  "educationYears": 9,
  "idNumberCiphertext": null,
  "phoneCiphertext": null,
  "profile": {
    "occupation": "retired",
    "source": "outpatient"
  }
}
```

不要把身份证号或手机号明文放入密文字段。生产级加密属于任务2数据库适配器后续增强范围。患者已存在测评记录时不允许删除，可改为把 `status` 更新为 `archived`。

## 测评与评分边界

新建或提交示例：

```json
{
  "patientId": "patient-uuid",
  "scaleCode": "SCD_Q9",
  "scaleVersion": "1.0",
  "status": "submitted",
  "durationSeconds": 180,
  "answers": [
    {
      "itemCode": "SCD_Q9_01",
      "optionCode": "否",
      "answerStatus": "answered",
      "value": {},
      "observation": {}
    }
  ]
}
```

`submitted` 记录会按 `fixtures/task1-scale-configs.json` 校验必答题和选项编码。`SUM` 和 `ITEMIZED` 量表只使用任务1提供的选项分值计算；教育年限相关界值也使用任务1元数据。后端不自行编造临床阈值。

CDR 使用任务1 Morris (1993) 算法，以记忆为主域，其余五项为次域。响应中 `totalScore` 为整体 CDR，`subScores` 为功能域分数，`extra.cdrSumOfBoxes` 为 CDR-SB。六个量表在合法作答提交后均返回 `scoringStatus: calculated`。

测评列表查询参数包括 `page`、`pageSize`、`patientId`、`scaleCode`、`status`、`from` 和 `to`。日期使用 ISO 8601 字符串。

## 统计接口

`GET /statistics/overview` 返回：

```json
{
  "patientTotal": 12,
  "activePatientTotal": 11,
  "assessmentTotal": 30,
  "submittedAssessmentTotal": 28,
  "scoredAssessmentTotal": 27,
  "abnormalTotal": 8,
  "abnormalRatio": 0.2963
}
```

异常比例的分母只包含任务1配置能产生非空异常判定的测评记录。

`GET /statistics/score-distribution?scaleCode=MMSE` 返回按分数排序的 `distribution: [{ "score": 18, "count": 2 }]`。

## 报告导出

PDF 输出不依赖外部服务，使用 PDF 标准中文字体名 `STSong-Light`，报告中包含“仅用于筛查、不替代临床诊断”的说明。

批量导出接口返回 `.xls` 扩展名的 SpreadsheetML，MIME 类型为 `application/vnd.ms-excel`，可直接用 Microsoft Excel 打开并保留中文。导出接口接受与测评列表相同的筛选参数。

## 账号和操作日志

新建账号字段为 `username`、`password`（至少八位）、`displayName`、`roleCodes`，以及可选 `status`。允许角色为 `admin`、`researcher` 和 `evaluator`。API 响应不返回密码哈希。

修改密码请求体：

```json
{
  "currentPassword": "old password",
  "newPassword": "new password"
}
```

修改密码后，该用户所有会话都会失效。患者变更、测评提交、报告导出、账号变更和密码修改都会写入操作日志。日志查询支持 `page`、`pageSize`、`action` 和 `userId`。

## 整合说明

当前接口契约已可供 Web 后台和小程序联调。课程版部署使用 CloudBase 适配器处理鉴权、业务数据、PostgreSQL 文件元数据和私有对象存储；后续若继续扩展，只要保持本接口契约，前端不需要大改。
