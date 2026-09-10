// 公共导出：评分入口、配置注册表、CDR 算法、类型。

export { score } from "./engine.ts";
export { ALL_SCALES, SCALES, getScale, availableScales } from "./config.ts";
export { globalCdr, DOMAIN_CODES, MEMORY_CODE, CDR_LEVELS } from "./cdr.ts";
export type {
  ScoringType,
  OptionConfig,
  ItemConfig,
  CutoffConfig,
  ScaleConfig,
  ItemScore,
  ScoreResult,
  ScaleCode,
  Answers,
  PatientCtx,
} from "./types.ts";
