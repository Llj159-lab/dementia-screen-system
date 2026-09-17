# 文档可读性审计

## 2026-09-17 复审记录（`C:\Users\Lenovo\Desktop\gpt\dementia-screen-system`）

- 复审原因：`task-6` 和 `task7` 已合并到 `integration/all-tasks`，新增设计稿压缩包和测试 DOCX 文件。
- 环境：`D:\Users\Lenovo\miniconda3\python.exe` / `python -X utf8`；DOCX 按 Office Open XML 压缩包读取，使用 `zipfile` 和 `xml.etree.ElementTree` 提取文本；ZIP 文件按目录清单检查。
- `Web 管理后台测试用例.docx`：DOCX 包可读，`word/document.xml` 文本提取成功，共 2,046 个字符。
- `后端业务接口测试.docx`：DOCX 包可读，`word/document.xml` 文本提取成功，共 2,445 个字符。
- `小程序测试.docx`：DOCX 包可读，`word/document.xml` 文本提取成功，共 2,202 个字符。
- `评分引擎核心算法验证.docx`：DOCX 包可读，`word/document.xml` 文本提取成功，共 14 个字符。
- `Web设计稿.zip`：ZIP 包可读，共 11 个条目，包含 Web 后台设计稿 PNG 页面。
- `小程序端设计稿.zip`：ZIP 包可读，共 16 个条目，包含小程序端设计稿 PNG 页面。
- 新合并文档材料未发现隐藏文件或读取错误。PNG 设计稿已确认文件存在，本次仅做文件级审计，未逐张人工视觉复核。

## 2026-08-20 初审记录（`C:\dev\hospital-codex`）

- 共审计 8 个非 Git 文件，无隐藏文件或读取错误；未修改文件。
- 提取环境：`C:\ProgramData\anaconda3\python.exe`，包含 `pypdf 6.16.1` 和 `openpyxl 3.1.5`；Microsoft Word COM 可用于旧版 `.doc` 文件。用户偏好的 `D:\Users\admin\anaconda3\python.exe` 当时不可用。
- `宣武医院韩璎教授发布的群公告.doc`：通过 Word COM 只读打开，完整文本范围读取成功，共 609 个字符；InlineShapes 和 Shapes 均为 0。
- `1_信息填写模板(1)(2)(2).xlsx`：使用 openpyxl 完整读取（`read_only=True, data_only=False`）；`Sheet1` 为 1 行 x 13 列，13 个非空单元格。
- 完全文本可读 PDF：`4.最新量表操作说明修订版.pdf`（12 页）、`5.CDR.pdf`（8 页）；每页均可提取文本，未发现图像 XObject。
- `1_AD临床前期SCD筛查量表-基线期-加上情景选择题.pdf`：33 页，每页均有可提取文本；第 17-20 页和第 30 页存在图像 XObject，图像内容未 OCR 或人工读取。
- `2.量表模板.pdf`：31 页，属于图像型模板；每页都有图像 XObject，第 27 页无可提取文本。图像内容未 OCR 或人工读取。
- `3.量表MoCA模板.pdf`：1 页，可提取文本较少（17 个字符），存在图像 XObject。图像内容未 OCR 或人工读取。
- `6.ADAS-cog.pdf`：5 页，每页均有可提取文本和图像 XObject。图像内容未 OCR 或人工读取。
- 范围边界：已验证所有文件的字节级访问和文本内容。上述 PDF 中的嵌入图像或扫描视觉内容未 OCR，因此仍不属于已审阅文本范围。
