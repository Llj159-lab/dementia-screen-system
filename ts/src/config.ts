// 6 个量表的完整配置数据（单一数据源，1:1 移植自 scoring/config_data.py）。
//
// 本模块是「题目 / 选项 / 分值 / 界值 / 指导语」的唯一权威来源。
// 反向计分（GDS 反序题）已内化到选项分值 score 中；教育界值以受教育年限匹配。

import type { CutoffConfig, ItemConfig, OptionConfig, ScaleConfig } from "./types.ts";

// ---------------------------------------------------------------------------
// 便捷构造器（对应 config_data.py 的 _opt / _item）
// ---------------------------------------------------------------------------

function opt(code: string, text: string, score: number, isNa = false): OptionConfig {
  return { code, text, score, isNa };
}

function item(
  code: string,
  no: number,
  text: string,
  options: OptionConfig[],
  domain: string | null = null,
  maxScore = 0,
  scoreMethod = "DIRECT",
  required = true,
  remark = "",
): ItemConfig {
  if (maxScore === 0) maxScore = Math.max(...options.map((o) => o.score));
  return { code, no, text, domain, maxScore, scoreMethod, required, remark, options };
}

// ---------------------------------------------------------------------------
// 1. SCD-Q9 —— 主观认知下降自测表（累加，0~9）
// ---------------------------------------------------------------------------

function buildScdQ9(): ScaleConfig {
  const yesNo = (yesScore: number): OptionConfig[] => [
    opt("是", "是", yesScore),
    opt("否", "否", 0.0),
  ];
  const freq: OptionConfig[] = [
    opt("经常", "经常", 1.0),
    opt("偶尔", "偶尔", 0.5),
    opt("从未", "从未", 0.0),
  ];
  const items: ItemConfig[] = [
    item("SCD_Q9_01", 1, "你认为自己有记忆问题吗？", yesNo(1.0)),
    item("SCD_Q9_02", 2, "你回忆 3-5 天前的对话有困难吗？", yesNo(1.0)),
    item("SCD_Q9_03", 3, "你觉得自己近两年有记忆问题吗？", yesNo(1.0)),
    item("SCD_Q9_04", 4, "下列问题经常发生吗：忘记对个人来说重要的日期（如生日等）", freq),
    item("SCD_Q9_05", 5, "下列问题经常发生吗：忘记常用号码", freq),
    item("SCD_Q9_06", 6, "总的来说，你是否认为自己对要做的事或要说的话容易忘记？", yesNo(1.0)),
    item("SCD_Q9_07", 7, "下列问题经常发生吗：到了商店忘记要买什么", freq),
    item("SCD_Q9_08", 8, "你认为自己的记忆力比 5 年前要差吗？", yesNo(1.0)),
    item("SCD_Q9_09", 9, "你认为自己越来越记不住东西放哪儿了吗？", yesNo(1.0)),
  ];
  return {
    code: "SCD_Q9",
    name: "主观认知下降自测表",
    fullName: "Subjective Cognitive Decline Questionnaire (SCD-Q9)",
    scoringType: "SUM",
    scoreMin: 0.0,
    scoreMax: 9.0,
    summary: "用于筛查老年人主观认知下降（SCD）的自测量表，共 9 个条目。",
    instruction:
      "请根据自身实际情况作答。评分标准：是=1分、否=0分；经常=1分、偶尔=0.5分、从未=0分。最后得分=各题得分之和（0~9分）。",
    version: "1.0",
    remark: "参考评分标准见量表原版；本量表总分越高提示主观记忆下降越明显。",
    items,
    cutoffs: [],
  };
}

// ---------------------------------------------------------------------------
// 2. GDS-15 —— 老年抑郁量表（累加，0~15，含反序计分）
// ---------------------------------------------------------------------------

function buildGds(): ScaleConfig {
  const fwd = (): OptionConfig[] => [
    opt("是", "是", 1.0),
    opt("否", "否", 0.0),
  ];
  const rev = (): OptionConfig[] => [
    opt("是", "是", 0.0),
    opt("否", "否", 1.0),
  ];
  const raw: Array<[number, string, () => OptionConfig[]]> = [
    [1, "你对你的生活基本满意吗？", rev],
    [2, "你是否已经放弃了许多爱好与兴趣？", fwd],
    [3, "你是否觉得生活空虚？", fwd],
    [4, "你是否感到厌倦？", fwd],
    [5, "你是否大部分时间精力充沛？", rev],
    [6, "你是否害怕会有不幸的事落到你头上？", fwd],
    [7, "你是否大部分时间感到幸福？", rev],
    [8, "你是否经常感到孤立无援？", fwd],
    [9, "你是否愿意呆在家里而不愿去室外做些新鲜事？", fwd],
    [10, "你是否觉得记忆力比以前差？", fwd],
    [11, "你觉得现在活着很开心吗？", rev],
    [12, "你是否觉得像现在这样活着毫无意义？", fwd],
    [13, "你觉得生活充满活力吗？", rev],
    [14, "你是否觉得你的处境已毫无希望？", fwd],
    [15, "你是否觉得大多数人比你强得多？", fwd],
  ];
  const items = raw.map(([no, text, builder]) =>
    item(`GDS_${String(no).padStart(2, "0")}`, no, text, builder()),
  );
  const cutoffs: CutoffConfig[] = [
    { cutoffType: "LEVEL", groupKey: "0-4", resultLabel: "正常", isAbnormal: false, eduYearsMin: null, eduYearsMax: null, minScore: 0.0, maxScore: 4.0, threshold: null },
    { cutoffType: "LEVEL", groupKey: "5-8", resultLabel: "轻度抑郁", isAbnormal: false, eduYearsMin: null, eduYearsMax: null, minScore: 5.0, maxScore: 8.0, threshold: null },
    { cutoffType: "LEVEL", groupKey: "9-11", resultLabel: "中度抑郁", isAbnormal: false, eduYearsMin: null, eduYearsMax: null, minScore: 9.0, maxScore: 11.0, threshold: null },
    { cutoffType: "LEVEL", groupKey: "12-15", resultLabel: "重度抑郁", isAbnormal: true, eduYearsMin: null, eduYearsMax: null, minScore: 12.0, maxScore: 15.0, threshold: null },
  ];
  return {
    code: "GDS",
    name: "老年抑郁量表",
    fullName: "Geriatric Depression Scale (GDS-15)",
    scoringType: "SUM",
    scoreMin: 0.0,
    scoreMax: 15.0,
    summary: "Brink 等 1982 年编制，专用于老年人的抑郁筛查表，共 15 个条目（是/否）。",
    instruction:
      "选择最切合你最近一周感受的答案。15 个条目中有 5 条反序计分（回答「否」表示抑郁存在），10 条正序计分（回答「是」表示抑郁存在）。",
    version: "1.0",
    remark: "反序计分题：第 1、5、7、11、13 题。",
    items,
    cutoffs,
  };
}

// ---------------------------------------------------------------------------
// 3. FAQ —— 功能活动问卷（累加，0~30，0~3 四级 + NA）
// ---------------------------------------------------------------------------

function buildFaq(): ScaleConfig {
  const opts: OptionConfig[] = [
    opt("0", "没有任何困难，能独立完成，不需他人帮助", 0.0),
    opt("1", "有些困难，需要他人指导或监督", 1.0),
    opt("2", "需要帮助才能完成，部分依赖", 2.0),
    opt("3", "本人无法完成，或完全由他人代替完成", 3.0),
    opt("NA", "该项目不适合，或老人从来不做", 0.0, true),
  ];
  const texts = [
    "使用电话或手机",
    "整理家庭物品井井有条、不凌乱",
    "自行购物（如购买衣服、食品及家庭用品）",
    "参加需技巧性的游戏或活动（如打扑克、下棋、打麻将、绘画、摄影、集邮、书法、木工）",
    "使用各种电器（如电视、空调、微波炉、电饭煲）",
    "准备和烧一顿饭菜（包括加工蔬菜、使用炉子、调味品用量恰当）",
    "关心和了解新鲜事物（国家大事或邻居中发生的重要事情）",
    "持续一小时以上注意力集中地看电视或小说，或收听收音机并能理解、评论或讨论其内容",
    "记得重要的时间点（如领退休金日期、按时服药、领送幼儿等）",
    "独自外出活动或走亲访友（指较远距离、如相当于三站公共车辆的距离）",
  ];
  const items = texts.map((t, i) => item(`FAQ_${String(i + 1).padStart(2, "0")}`, i + 1, t, opts));
  const cutoffs: CutoffConfig[] = [
    { cutoffType: "LEVEL", groupKey: "0-5", resultLabel: "正常", isAbnormal: false, eduYearsMin: null, eduYearsMax: null, minScore: 0.0, maxScore: 5.0, threshold: null },
    { cutoffType: "LEVEL", groupKey: "6-8", resultLabel: "SCD 参考范围", isAbnormal: false, eduYearsMin: null, eduYearsMax: null, minScore: 6.0, maxScore: 8.0, threshold: null },
    { cutoffType: "LEVEL", groupKey: "9-30", resultLabel: "MCI（轻度认知损害）", isAbnormal: true, eduYearsMin: null, eduYearsMax: null, minScore: 9.0, maxScore: 30.0, threshold: null },
  ];
  return {
    code: "FAQ",
    name: "功能活动问卷",
    fullName: "Functional Activity Questionnaire (FAQ)",
    scoringType: "SUM",
    scoreMin: 0.0,
    scoreMax: 30.0,
    summary: "Pfeffer 1982 年编制，由知情者完成，用于测定老年人独立生活能力，共 10 个条目。",
    instruction:
      "由知情者完成，评价指标为项目总分。评分 0~3 四级：0=无困难；1=有些困难需指导或监督；2=部分依赖；3=无法完成或完全依赖；NA=该项目不适合或老人从来不做（不计入总分）。",
    version: "1.0",
    remark: "界值：MCI ≥9 分；SCD 参考范围 6-8 分。",
    items,
    cutoffs,
  };
}

// ---------------------------------------------------------------------------
// 4. MMSE —— 简易精神状态检查（分项计分，0~30，教育界值）
// ---------------------------------------------------------------------------

function buildMmse(): ScaleConfig {
  const ok: OptionConfig[] = [
    opt("1", "正确", 1.0),
    opt("0", "错误", 0.0),
  ];
  const items: ItemConfig[] = [];
  // 时间定向（5）
  ["现在是哪一年？", "现在是什么季节？", "现在是几月份？", "今天是几号？", "今天是星期几？"].forEach(
    (t, i) => items.push(item(`MMSE_${String(i + 1).padStart(2, "0")}`, i + 1, t, ok, "时间定向")),
  );
  // 地点定向（5）
  ["我们现在在什么城市？", "在什么城区（区/县）？", "在什么街道？", "在第几层楼？", "这里是什么地方？"].forEach(
    (t, i) => items.push(item(`MMSE_${String(i + 6).padStart(2, "0")}`, i + 6, t, ok, "地点定向")),
  );
  // 即刻记忆（3）
  ["复述并记住「皮球」", "复述并记住「国旗」", "复述并记住「树木」"].forEach(
    (t, i) => items.push(item(`MMSE_${String(i + 11).padStart(2, "0")}`, i + 11, t, ok, "即刻记忆")),
  );
  // 注意与计算（5）
  ["100-7=93", "93-7=86", "86-7=79", "79-7=72", "72-7=65"].forEach(
    (t, i) => items.push(item(`MMSE_${String(i + 14).padStart(2, "0")}`, i + 14, t, ok, "注意与计算")),
  );
  // 延迟回忆（3）
  ["回忆「皮球」", "回忆「国旗」", "回忆「树木」"].forEach(
    (t, i) => items.push(item(`MMSE_${String(i + 19).padStart(2, "0")}`, i + 19, t, ok, "延迟回忆")),
  );
  // 命名（2）
  ["命名：手表", "命名：铅笔"].forEach(
    (t, i) => items.push(item(`MMSE_${String(i + 22).padStart(2, "0")}`, i + 22, t, ok, "命名")),
  );
  // 复述（1）
  items.push(item("MMSE_24", 24, "复述「大家齐心协力拉紧绳」", ok, "复述"));
  // 阅读理解（1）
  items.push(item("MMSE_25", 25, "念「请闭上您的眼睛」并照做（闭眼动作）", ok, "阅读理解"));
  // 三步指令（3）
  ["右手拿纸", "双手对折", "放到左腿上"].forEach(
    (t, i) => items.push(item(`MMSE_${String(i + 26).padStart(2, "0")}`, i + 26, t, ok, "三步指令")),
  );
  // 书写（1）
  items.push(item("MMSE_29", 29, "写一个完整、有意义的句子", ok, "书写"));
  // 视空间（1）
  items.push(item("MMSE_30", 30, "照图画出两个交叉的五边形（10 个角）", ok, "视空间"));
  const cutoffs: CutoffConfig[] = [
    { cutoffType: "EDUCATION", groupKey: "文盲", resultLabel: "文盲（0 年）", isAbnormal: true, eduYearsMin: 0, eduYearsMax: 0, minScore: null, maxScore: null, threshold: 17.0 },
    { cutoffType: "EDUCATION", groupKey: "小学", resultLabel: "小学（1-6 年）", isAbnormal: true, eduYearsMin: 1, eduYearsMax: 6, minScore: null, maxScore: null, threshold: 20.0 },
    { cutoffType: "EDUCATION", groupKey: "中学及以上", resultLabel: "中学及以上（>6 年）", isAbnormal: true, eduYearsMin: 7, eduYearsMax: null, minScore: null, maxScore: null, threshold: 24.0 },
  ];
  return {
    code: "MMSE",
    name: "简明精神状态检查",
    fullName: "Mini-Mental State Examination (MMSE)",
    scoringType: "ITEMIZED",
    scoreMin: 0.0,
    scoreMax: 30.0,
    summary: "Folstein 1975 年创立，最常用的认知及智能检查量表，共 30 个条目、30 分。",
    instruction:
      "对患者进行定向、记忆、注意与计算、语言、视空间等 11 个认知域的检查，每题回答正确得 1 分。节点分数：17 分（文盲）、20 分（1-6 年）、24 分（>6 年）。",
    version: "1.0",
    remark: "得分 ≤ 对应教育程度界值判为异常（认知障碍筛查阳性）。",
    items,
    cutoffs,
  };
}

// ---------------------------------------------------------------------------
// 5. MoCA-B —— 蒙特利尔认知评估基础量表（分项计分，0~30，教育界值）
// ---------------------------------------------------------------------------

function buildMocaB(): ScaleConfig {
  const ok: OptionConfig[] = [
    opt("1", "正确", 1.0),
    opt("0", "错误", 0.0),
  ];
  const items: ItemConfig[] = [];
  items.push(
    item("MOCA_B_01", 1, "执行功能（连线）：按数字到点逐渐升高的顺序连线", [
      opt("1", "完全按顺序连线", 1.0),
      opt("0", "出现任何错误", 0.0),
    ], "执行功能"),
  );
  items.push(
    item("MOCA_B_02", 2, "词语流畅性：1 分钟内说出水果名称", [
      opt("2", "≥13 个", 2.0),
      opt("1", "8-12 个", 1.0),
      opt("0", "≤7 个", 0.0),
    ], "词语流畅性"),
  );
  ["现在是几点钟？", "现在是哪一年？", "现在是几月份？", "今天是星期几？",
   "这是什么地方（医院/诊所/办公室名称）？", "在哪个城市？"].forEach(
    (t, i) => items.push(item(`MOCA_B_${String(i + 3).padStart(2, "0")}`, i + 3, t, ok, "定向")),
  );
  items.push(
    item("MOCA_B_09", 9, "计算：用 1 元/5 元/10 元组合支付 13 元（给出付款方式数）", [
      opt("3", "提供 3 种付款方式", 3.0),
      opt("2", "提供 2 种付款方式", 2.0),
      opt("1", "提供 1 种付款方式", 1.0),
      opt("0", "未提供正确付款方式", 0.0),
    ], "计算"),
  );
  ["火车和轮船属于什么类别？", "锣鼓和笛子属于什么类别？", "南方和北方属于什么类别？"].forEach(
    (t, i) => items.push(item(`MOCA_B_${String(i + 10).padStart(2, "0")}`, i + 10, t, ok, "抽象")),
  );
  ["延迟回忆：一种花（桃花）", "延迟回忆：一种蔬菜（洋葱）", "延迟回忆：一种家具（桌子）",
   "延迟回忆：一种颜色（蓝色）", "延迟回忆：一种厨房用具（筷子）"].forEach(
    (t, i) => items.push(item(`MOCA_B_${String(i + 13).padStart(2, "0")}`, i + 13, t, ok, "延迟回忆")),
  );
  items.push(
    item("MOCA_B_18", 18, "视知觉：在重叠图片中找出物品（共 10 件）", [
      opt("3", "找出 9-10 个", 3.0),
      opt("2", "找出 6-8 个", 2.0),
      opt("1", "找出 4-5 个", 1.0),
      opt("0", "找出 3 个或以下", 0.0),
    ], "视知觉"),
  );
  ["命名：斑马", "命名：孔雀", "命名：老虎", "命名：蝴蝶"].forEach(
    (t, i) => items.push(item(`MOCA_B_${String(i + 19).padStart(2, "0")}`, i + 19, t, ok, "命名")),
  );
  items.push(
    item("MOCA_B_23", 23, "注意（白底）：只读圆形中的数字", [
      opt("1", "完全正确或只有一次错误", 1.0),
      opt("0", "2 个或以上错误", 0.0),
    ], "注意"),
  );
  items.push(
    item("MOCA_B_24", 24, "注意（黑底）：只读圆形和正方形中的数字", [
      opt("2", "2 个或以下错误", 2.0),
      opt("1", "3 个错误", 1.0),
      opt("0", "4 个或以上错误", 0.0),
    ], "注意"),
  );
  const cutoffs: CutoffConfig[] = [
    { cutoffType: "EDUCATION", groupKey: "文盲/小学", resultLabel: "文盲/小学（≤6 年）", isAbnormal: true, eduYearsMin: 0, eduYearsMax: 6, minScore: null, maxScore: null, threshold: 19.0 },
    { cutoffType: "EDUCATION", groupKey: "中学", resultLabel: "中学（7-12 年）", isAbnormal: true, eduYearsMin: 7, eduYearsMax: 12, minScore: null, maxScore: null, threshold: 22.0 },
    { cutoffType: "EDUCATION", groupKey: "大学", resultLabel: "大学（>12 年）", isAbnormal: true, eduYearsMin: 13, eduYearsMax: null, minScore: null, maxScore: null, threshold: 24.0 },
  ];
  return {
    code: "MOCA_B",
    name: "蒙特利尔认知评估基础量表（中文版）",
    fullName: "Montreal Cognitive Assessment - Basic (MoCA-B)",
    scoringType: "ITEMIZED",
    scoreMin: 0.0,
    scoreMax: 30.0,
    summary: "Nasreddine 等 2004 年编制、2014 年推出基础版，用于快速筛查 MCI，适用于文盲与低教育老人，满分 30 分。",
    instruction:
      "涵盖执行功能、词语流畅性、定向、计算、抽象、延迟回忆、视知觉、命名、注意等认知域。节点（异常值指小于等于节点）：文盲/小学 19 分、中学 22 分、大学 24 分。",
    version: "1.0",
    remark: "抽象题「橘子香蕉」为练习、不计分；即刻回忆不计分。",
    items,
    cutoffs,
  };
}

// ---------------------------------------------------------------------------
// 6. CDR —— 临床痴呆评定量表（复杂评分，6 域，0/0.5/1/2/3）
// ---------------------------------------------------------------------------

function buildCdr(): ScaleConfig {
  const cdrOpts = (anchors: Array<[string, string, number]>): OptionConfig[] =>
    anchors.map(([code, text, score]) => opt(code, text, score));
  const anchors: Record<string, Array<[string, string, number]>> = {
    CDR_MEMORY: [
      ["0", "无记忆缺损或只有轻微的、偶尔的健忘", 0.0],
      ["0.5", "经常性的轻微健忘；对事情能部分回忆；「良性健忘」", 0.5],
      ["1", "中度记忆缺损，对近事遗忘突出，记忆缺损妨碍日常活动", 1.0],
      ["2", "严重记忆缺损；能记住过去非常熟悉的事情，新发生的事件很快遗忘", 2.0],
      ["3", "严重记忆丧失；仅存片段的记忆", 3.0],
    ],
    CDR_ORIENTATION: [
      ["0", "能完全正确定向", 0.0],
      ["0.5", "对时间关联性有轻微的困难，其余能完全正确定向", 0.5],
      ["1", "对时间关联性有中度困难；检查时对地点仍有定向能力；但在某些场合可能有地理定向能力障碍", 1.0],
      ["2", "对时间关联性有严重困难；通常对时间不能定向，常有地点失定向", 2.0],
      ["3", "仅对病人自己有定向力", 3.0],
    ],
    CDR_JUDGMENT: [
      ["0", "能很好地解决日常问题，处理事务和财务，判断力良好", 0.0],
      ["0.5", "在解决问题、辨别事物间的异同点方面有轻微缺损", 0.5],
      ["1", "在解决问题、辨别事物间的异同点方面有中度困难；通常还能维持社交事务判断力", 1.0],
      ["2", "在解决问题、辨别事物间的异同点方面有严重损害；社会判断力通常受损", 2.0],
      ["3", "不能做判断，或不能解决问题", 3.0],
    ],
    CDR_COMMUNITY: [
      ["0", "和平常一样能独立处理工作、购物、义务劳动及社会群体活动", 0.0],
      ["0.5", "在这些活动方面仅有轻微损害", 0.5],
      ["1", "已不能独立进行这些活动；可以从事其中部分活动，不经意的观察似乎正常", 1.0],
      ["2", "不能独立进行室外活动；但可被带到家庭以外的场所参加活动", 2.0],
      ["3", "不能独立进行室外活动；病重得不能被带到家庭以外的场所参加活动", 3.0],
    ],
    CDR_HOME: [
      ["0", "家庭生活、业余爱好和需用智力的兴趣均很好保持", 0.0],
      ["0.5", "家庭生活、业余爱好和需用智力的兴趣有轻微损害", 0.5],
      ["1", "家庭活动有肯定的轻度障碍，放弃难度大的家务，放弃复杂的爱好和兴趣", 1.0],
      ["2", "仅能做简单的家务，兴趣明显受限，而且维持的差", 2.0],
      ["3", "丧失有意义的家庭活动", 3.0],
    ],
    CDR_PERSONAL_CARE: [
      ["0", "完全自理", 0.0],
      ["0.5", "完全自理", 0.5],
      ["1", "须旁人督促或提醒", 1.0],
      ["2", "穿衣、个人卫生及个人事务料理都需要帮助", 2.0],
      ["3", "个人自理方面依赖别人给予很大帮助；经常大小便失禁", 3.0],
    ],
  };
  const items: ItemConfig[] = [
    item("CDR_MEMORY", 1, "记忆力（主要项目）", cdrOpts(anchors.CDR_MEMORY), "记忆力", 3.0),
    item("CDR_ORIENTATION", 2, "定向力", cdrOpts(anchors.CDR_ORIENTATION), "定向力", 3.0),
    item("CDR_JUDGMENT", 3, "判断与解决问题的能力", cdrOpts(anchors.CDR_JUDGMENT), "判断与解决问题", 3.0),
    item("CDR_COMMUNITY", 4, "社会事务", cdrOpts(anchors.CDR_COMMUNITY), "社会事务", 3.0),
    item("CDR_HOME", 5, "家务与业余爱好", cdrOpts(anchors.CDR_HOME), "家务与业余爱好", 3.0),
    item("CDR_PERSONAL_CARE", 6, "个人自理能力", cdrOpts(anchors.CDR_PERSONAL_CARE), "个人自理", 3.0),
  ];
  return {
    code: "CDR",
    name: "临床痴呆评定量表",
    fullName: "Clinical Dementia Rating (CDR)",
    scoringType: "CDR",
    scoreMin: 0.0,
    scoreMax: 3.0,
    summary:
      "对 6 个功能域（记忆力、定向力、判断与解决问题、社会事务、家务与业余爱好、个人自理）分别评定，综合得出整体 CDR 评分与 CDR-SB。",
    instruction:
      "分别对知情者和受试者本人进行访谈。只有当能力的减退是由认知障碍引起时才计分。6 个功能域各记 0 / 0.5 / 1 / 2 / 3 分；以记忆力为主要项目、其余 5 项为次要项目，按 Morris 规则综合出整体 CDR；CDR-SB = 6 域得分之和。",
    version: "1.0",
    remark: "CDR 整体评分与 CDR-SB 由算法计算，详见 scoring/scales/cdr.py。",
    items,
    cutoffs: [],
  };
}

// ---------------------------------------------------------------------------
// 注册表（对应 config_data.py 的 ALL_SCALES / SCALES / get_scale）
// ---------------------------------------------------------------------------

export const ALL_SCALES: ScaleConfig[] = [
  buildScdQ9(),
  buildGds(),
  buildFaq(),
  buildMmse(),
  buildMocaB(),
  buildCdr(),
];

export const SCALES: Record<string, ScaleConfig> = Object.fromEntries(
  ALL_SCALES.map((s) => [s.code, s]),
);

export function getScale(code: string): ScaleConfig {
  const scale = SCALES[code];
  if (!scale) {
    throw new Error(`未知量表编码: ${code}，可选值: ${Object.keys(SCALES).join(", ")}`);
  }
  return scale;
}

export function availableScales(): string[] {
  return ALL_SCALES.map((s) => s.code);
}
