// 配置类型与评分结果类型（camelCase，1:1 移植自 scoring/models.py）。

// ---------------------------------------------------------------------------
// 配置数据类
// ---------------------------------------------------------------------------

export type ScoringType = "SUM" | "ITEMIZED" | "CDR";

export interface OptionConfig {
  /** 选项编码（作答匹配主键），如 "是" / "1" / "0.5" */
  code: string;
  /** 选项显示文本 */
  text: string;
  /** 该选项对应的分值 */
  score: number;
  /** 是否为「不适用 / NA」项（不计分） */
  isNa: boolean;
}

export interface ItemConfig {
  /** 题目编码，如 "MMSE_01" / "CDR_MEMORY" */
  code: string;
  /** 题号（展示顺序） */
  no: number;
  /** 题干内容 */
  text: string;
  /** 所属认知域 / 分项（MMSE、MoCA-B、CDR 使用；SUM 量表为 null） */
  domain: string | null;
  /** 该题满分 */
  maxScore: number;
  /** 计分方式：DIRECT(直接取选项分值) / SPECIAL(特殊逻辑) */
  scoreMethod: string;
  /** 是否必答 */
  required: boolean;
  /** 备注 */
  remark: string;
  /** 选项列表 */
  options: OptionConfig[];
}

export interface CutoffConfig {
  /** EDUCATION(教育程度界值) / LEVEL(分级解释) */
  cutoffType: "LEVEL" | "EDUCATION";
  /** 分组键，如 "文盲" / "0-4" */
  groupKey: string;
  /** 解释文字，如 "正常" / "轻度抑郁" */
  resultLabel: string;
  /** 是否判为异常 */
  isAbnormal: boolean;
  /** 教育年限下界（EDUCATION） */
  eduYearsMin: number | null;
  /** 教育年限上界（EDUCATION） */
  eduYearsMax: number | null;
  /** 总分下界（LEVEL） */
  minScore: number | null;
  /** 总分上界（LEVEL） */
  maxScore: number | null;
  /** 界值分（EDUCATION） */
  threshold: number | null;
}

export interface ScaleConfig {
  /** 量表编码：SCD_Q9 / GDS / FAQ / MMSE / MOCA_B / CDR */
  code: string;
  /** 中文名 */
  name: string;
  /** 英文 / 全称 */
  fullName: string;
  scoringType: ScoringType;
  /** 理论最低分 */
  scoreMin: number;
  /** 理论最高分 */
  scoreMax: number;
  summary: string;
  instruction: string;
  version: string;
  remark: string;
  items: ItemConfig[];
  cutoffs: CutoffConfig[];
}

// ---------------------------------------------------------------------------
// 评分结果类
// ---------------------------------------------------------------------------

export interface ItemScore {
  itemCode: string;
  itemText: string;
  domain: string | null;
  /** 原始作答值（字符串化） */
  answerValue: string;
  /** 命中的选项编码 */
  optionCode: string | null;
  score: number;
}

export interface ScoreResult {
  scaleCode: string;
  scaleName: string;
  totalScore: number;
  /** 分项得分（按认知域） */
  subScores: Record<string, number>;
  /** 逐题得分 */
  itemScores: ItemScore[];
  /** 解释结果，如 "正常" / "轻度抑郁" / "CDR=1" */
  resultLabel: string;
  /** 匹配到的界值分组 */
  cutoffGroup: string | null;
  /** 所用界值 */
  cutoffValue: number | null;
  /** 是否异常 */
  isAbnormal: boolean | null;
  /** 附加信息（CDR-SB 等） */
  extra: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 入口入参类型
// ---------------------------------------------------------------------------

export type ScaleCode = "SCD_Q9" | "GDS" | "FAQ" | "MMSE" | "MOCA_B" | "CDR";

/** 作答字典：key = 题目编码（保留 snake），value = 选项编码或选项文本 */
export type Answers = Record<string, string | number>;

export interface PatientCtx {
  educationYears?: number;
}
