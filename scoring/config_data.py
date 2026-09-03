"""6 个量表的完整配置数据（单一数据源）。

本模块是「题目 / 选项 / 分值 / 界值 / 指导语」的**唯一权威来源**：
- 评分引擎直接消费本模块（内置配置，测试可离线运行）；
- `sql/02_seed_data.sql` 由 `scripts/generate_seed_sql.py` 依据本模块生成，保证库表与代码一致。

数据出处（PDF）：
- SCD-Q9：`1_AD临床前期SCD筛查量表-基线期-加上情景选择题.pdf`（D 部分）
- MMSE / GDS / FAQ：同 PDF 1（H2 / H7 / H9 部分）
- MoCA-B：`4.最新量表操作说明修订版.pdf`（H15 部分）
- CDR：`5.CDR.pdf`（CDR 整体评分 + 记分表）

说明：
- 反向计分（GDS 反序题）已内化到选项分值 `score` 中，累加量表即可统一用「选项分值求和」。
- 教育界值以受教育年限 `education_years` 为匹配依据；年段映射见各量表 cutoffs。
"""

from __future__ import annotations

from typing import Dict, List

from .models import CutoffConfig, ItemConfig, OptionConfig, ScaleConfig


# ---------------------------------------------------------------------------
# 便捷构造器
# ---------------------------------------------------------------------------

def _opt(code: str, text: str, score: float, is_na: bool = False) -> OptionConfig:
    return OptionConfig(code=code, text=text, score=score, is_na=is_na)


def _item(code: str, no: int, text: str, options: List[OptionConfig],
          domain: str = None, max_score: float = 0.0, score_method: str = "DIRECT",
          required: bool = True, remark: str = "") -> ItemConfig:
    if max_score == 0.0:
        max_score = max(o.score for o in options)
    return ItemConfig(code=code, no=no, text=text, options=options, domain=domain,
                      max_score=max_score, score_method=score_method,
                      required=required, remark=remark)


# ---------------------------------------------------------------------------
# 1. SCD-Q9 —— 主观认知下降自测表（累加，0~9）
# ---------------------------------------------------------------------------

def _build_scd_q9() -> ScaleConfig:
    yes_no = lambda yes_score: [_opt("是", "是", yes_score), _opt("否", "否", 0.0)]
    freq = [_opt("经常", "经常", 1.0), _opt("偶尔", "偶尔", 0.5), _opt("从未", "从未", 0.0)]
    items = [
        _item("SCD_Q9_01", 1, "你认为自己有记忆问题吗？", yes_no(1.0)),
        _item("SCD_Q9_02", 2, "你回忆 3-5 天前的对话有困难吗？", yes_no(1.0)),
        _item("SCD_Q9_03", 3, "你觉得自己近两年有记忆问题吗？", yes_no(1.0)),
        _item("SCD_Q9_04", 4, "下列问题经常发生吗：忘记对个人来说重要的日期（如生日等）", freq),
        _item("SCD_Q9_05", 5, "下列问题经常发生吗：忘记常用号码", freq),
        _item("SCD_Q9_06", 6, "总的来说，你是否认为自己对要做的事或要说的话容易忘记？", yes_no(1.0)),
        _item("SCD_Q9_07", 7, "下列问题经常发生吗：到了商店忘记要买什么", freq),
        _item("SCD_Q9_08", 8, "你认为自己的记忆力比 5 年前要差吗？", yes_no(1.0)),
        _item("SCD_Q9_09", 9, "你认为自己越来越记不住东西放哪儿了吗？", yes_no(1.0)),
    ]
    return ScaleConfig(
        code="SCD_Q9", name="主观认知下降自测表",
        full_name="Subjective Cognitive Decline Questionnaire (SCD-Q9)",
        scoring_type="SUM", score_min=0.0, score_max=9.0,
        summary="用于筛查老年人主观认知下降（SCD）的自测量表，共 9 个条目。",
        instruction=("请根据自身实际情况作答。评分标准：是=1分、否=0分；"
                     "经常=1分、偶尔=0.5分、从未=0分。最后得分=各题得分之和（0~9分）。"),
        items=items, cutoffs=[],
        remark="参考评分标准见量表原版；本量表总分越高提示主观记忆下降越明显。",
    )


# ---------------------------------------------------------------------------
# 2. GDS-15 —— 老年抑郁量表（累加，0~15，含反序计分）
# ---------------------------------------------------------------------------

def _build_gds() -> ScaleConfig:
    # 正序题（回答「是」得 1 分）；反序题（回答「否」得 1 分）分值已内化。
    def fwd(text):  # 是=1，否=0
        return _opt("是", "是", 1.0), _opt("否", "否", 0.0)

    def rev(text):  # 是=0，否=1（反序）
        return _opt("是", "是", 0.0), _opt("否", "否", 1.0)

    raw = [
        (1, "你对你的生活基本满意吗？", rev),
        (2, "你是否已经放弃了许多爱好与兴趣？", fwd),
        (3, "你是否觉得生活空虚？", fwd),
        (4, "你是否感到厌倦？", fwd),
        (5, "你是否大部分时间精力充沛？", rev),
        (6, "你是否害怕会有不幸的事落到你头上？", fwd),
        (7, "你是否大部分时间感到幸福？", rev),
        (8, "你是否经常感到孤立无援？", fwd),
        (9, "你是否愿意呆在家里而不愿去室外做些新鲜事？", fwd),
        (10, "你是否觉得记忆力比以前差？", fwd),
        (11, "你觉得现在活着很开心吗？", rev),
        (12, "你是否觉得像现在这样活着毫无意义？", fwd),
        (13, "你觉得生活充满活力吗？", rev),
        (14, "你是否觉得你的处境已毫无希望？", fwd),
        (15, "你是否觉得大多数人比你强得多？", fwd),
    ]
    items = [
        _item(f"GDS_{no:02d}", no, text, list(builder(text)))
        for no, text, builder in raw
    ]
    cutoffs = [
        CutoffConfig("LEVEL", "0-4", "正常", False, min_score=0.0, max_score=4.0),
        CutoffConfig("LEVEL", "5-8", "轻度抑郁", False, min_score=5.0, max_score=8.0),
        CutoffConfig("LEVEL", "9-11", "中度抑郁", False, min_score=9.0, max_score=11.0),
        CutoffConfig("LEVEL", "12-15", "重度抑郁", True, min_score=12.0, max_score=15.0),
    ]
    return ScaleConfig(
        code="GDS", name="老年抑郁量表", full_name="Geriatric Depression Scale (GDS-15)",
        scoring_type="SUM", score_min=0.0, score_max=15.0,
        summary="Brink 等 1982 年编制，专用于老年人的抑郁筛查表，共 15 个条目（是/否）。",
        instruction=("选择最切合你最近一周感受的答案。15 个条目中有 5 条反序计分"
                     "（回答「否」表示抑郁存在），10 条正序计分（回答「是」表示抑郁存在）。"),
        items=items, cutoffs=cutoffs,
        remark="反序计分题：第 1、5、7、11、13 题。",
    )


# ---------------------------------------------------------------------------
# 3. FAQ —— 功能活动问卷（累加，0~30，0~3 四级 + NA）
# ---------------------------------------------------------------------------

def _build_faq() -> ScaleConfig:
    opts = [
        _opt("0", "没有任何困难，能独立完成，不需他人帮助", 0.0),
        _opt("1", "有些困难，需要他人指导或监督", 1.0),
        _opt("2", "需要帮助才能完成，部分依赖", 2.0),
        _opt("3", "本人无法完成，或完全由他人代替完成", 3.0),
        _opt("NA", "该项目不适合，或老人从来不做", 0.0, is_na=True),
    ]
    texts = [
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
    ]
    items = [_item(f"FAQ_{i + 1:02d}", i + 1, t, list(opts)) for i, t in enumerate(texts)]
    cutoffs = [
        CutoffConfig("LEVEL", "0-5", "正常", False, min_score=0.0, max_score=5.0),
        CutoffConfig("LEVEL", "6-8", "SCD 参考范围", False, min_score=6.0, max_score=8.0),
        CutoffConfig("LEVEL", "9-30", "MCI（轻度认知损害）", True, min_score=9.0, max_score=30.0),
    ]
    return ScaleConfig(
        code="FAQ", name="功能活动问卷", full_name="Functional Activity Questionnaire (FAQ)",
        scoring_type="SUM", score_min=0.0, score_max=30.0,
        summary="Pfeffer 1982 年编制，由知情者完成，用于测定老年人独立生活能力，共 10 个条目。",
        instruction=("由知情者完成，评价指标为项目总分。评分 0~3 四级："
                     "0=无困难；1=有些困难需指导或监督；2=部分依赖；3=无法完成或完全依赖；"
                     "NA=该项目不适合或老人从来不做（不计入总分）。"),
        items=items, cutoffs=cutoffs,
        remark="界值：MCI ≥9 分；SCD 参考范围 6-8 分。",
    )


# ---------------------------------------------------------------------------
# 4. MMSE —— 简易精神状态检查（分项计分，0~30，教育界值）
# ---------------------------------------------------------------------------

def _build_mmse() -> ScaleConfig:
    ok = [_opt("1", "正确", 1.0), _opt("0", "错误", 0.0)]
    items = []
    # 时间定向（5）
    for no, t in enumerate(["现在是哪一年？", "现在是什么季节？", "现在是几月份？",
                            "今天是几号？", "今天是星期几？"], start=1):
        items.append(_item(f"MMSE_{no:02d}", no, t, list(ok), domain="时间定向"))
    # 地点定向（5）
    for no, t in enumerate(["我们现在在什么城市？", "在什么城区（区/县）？", "在什么街道？",
                            "在第几层楼？", "这里是什么地方？"], start=6):
        items.append(_item(f"MMSE_{no:02d}", no, t, list(ok), domain="地点定向"))
    # 即刻记忆（3）
    for no, t in enumerate(["复述并记住「皮球」", "复述并记住「国旗」", "复述并记住「树木」"],
                           start=11):
        items.append(_item(f"MMSE_{no:02d}", no, t, list(ok), domain="即刻记忆"))
    # 注意与计算（5）
    for no, t in enumerate(["100-7=93", "93-7=86", "86-7=79", "79-7=72", "72-7=65"],
                           start=14):
        items.append(_item(f"MMSE_{no:02d}", no, t, list(ok), domain="注意与计算"))
    # 延迟回忆（3）
    for no, t in enumerate(["回忆「皮球」", "回忆「国旗」", "回忆「树木」"], start=19):
        items.append(_item(f"MMSE_{no:02d}", no, t, list(ok), domain="延迟回忆"))
    # 命名（2）
    for no, t in enumerate(["命名：手表", "命名：铅笔"], start=22):
        items.append(_item(f"MMSE_{no:02d}", no, t, list(ok), domain="命名"))
    # 复述（1）
    items.append(_item("MMSE_24", 24, "复述「大家齐心协力拉紧绳」", list(ok), domain="复述"))
    # 阅读理解（1）
    items.append(_item("MMSE_25", 25, "念「请闭上您的眼睛」并照做（闭眼动作）",
                       list(ok), domain="阅读理解"))
    # 三步指令（3）
    for no, t in enumerate(["右手拿纸", "双手对折", "放到左腿上"], start=26):
        items.append(_item(f"MMSE_{no:02d}", no, t, list(ok), domain="三步指令"))
    # 书写（1）
    items.append(_item("MMSE_29", 29, "写一个完整、有意义的句子", list(ok), domain="书写"))
    # 视空间（1）
    items.append(_item("MMSE_30", 30, "照图画出两个交叉的五边形（10 个角）",
                       list(ok), domain="视空间"))
    cutoffs = [
        CutoffConfig("EDUCATION", "文盲", "文盲（0 年）", True,
                     edu_years_min=0, edu_years_max=0, threshold=17.0),
        CutoffConfig("EDUCATION", "小学", "小学（1-6 年）", True,
                     edu_years_min=1, edu_years_max=6, threshold=20.0),
        CutoffConfig("EDUCATION", "中学及以上", "中学及以上（>6 年）", True,
                     edu_years_min=7, edu_years_max=None, threshold=24.0),
    ]
    return ScaleConfig(
        code="MMSE", name="简明精神状态检查", full_name="Mini-Mental State Examination (MMSE)",
        scoring_type="ITEMIZED", score_min=0.0, score_max=30.0,
        summary="Folstein 1975 年创立，最常用的认知及智能检查量表，共 30 个条目、30 分。",
        instruction=("对患者进行定向、记忆、注意与计算、语言、视空间等 11 个认知域的检查，"
                     "每题回答正确得 1 分。节点分数：17 分（文盲）、20 分（1-6 年）、24 分（>6 年）。"),
        items=items, cutoffs=cutoffs,
        remark="得分 ≤ 对应教育程度界值判为异常（认知障碍筛查阳性）。",
    )


# ---------------------------------------------------------------------------
# 5. MoCA-B —— 蒙特利尔认知评估基础量表（分项计分，0~30，教育界值）
# ---------------------------------------------------------------------------

def _build_moca_b() -> ScaleConfig:
    ok = [_opt("1", "正确", 1.0), _opt("0", "错误", 0.0)]
    items = []
    # 执行功能（连线）1
    items.append(_item("MOCA_B_01", 1, "执行功能（连线）：按数字到点逐渐升高的顺序连线",
                       [_opt("1", "完全按顺序连线", 1.0), _opt("0", "出现任何错误", 0.0)],
                       domain="执行功能"))
    # 词语流畅性 2
    items.append(_item("MOCA_B_02", 2, "词语流畅性：1 分钟内说出水果名称",
                       [_opt("2", "≥13 个", 2.0), _opt("1", "8-12 个", 1.0), _opt("0", "≤7 个", 0.0)],
                       domain="词语流畅性"))
    # 定向 6
    for no, t in enumerate(["现在是几点钟？", "现在是哪一年？", "现在是几月份？",
                            "今天是星期几？", "这是什么地方（医院/诊所/办公室名称）？",
                            "在哪个城市？"], start=3):
        items.append(_item(f"MOCA_B_{no:02d}", no, t, list(ok), domain="定向"))
    # 计算 3
    items.append(_item("MOCA_B_09", 9, "计算：用 1 元/5 元/10 元组合支付 13 元（给出付款方式数）",
                       [_opt("3", "提供 3 种付款方式", 3.0), _opt("2", "提供 2 种付款方式", 2.0),
                        _opt("1", "提供 1 种付款方式", 1.0), _opt("0", "未提供正确付款方式", 0.0)],
                       domain="计算"))
    # 抽象 3（橘子香蕉为练习，不计分）
    for no, t in enumerate(["火车和轮船属于什么类别？", "锣鼓和笛子属于什么类别？",
                            "南方和北方属于什么类别？"], start=10):
        items.append(_item(f"MOCA_B_{no:02d}", no, t, list(ok), domain="抽象"))
    # 延迟回忆 5
    for no, t in enumerate(["延迟回忆：一种花（桃花）", "延迟回忆：一种蔬菜（洋葱）",
                            "延迟回忆：一种家具（桌子）", "延迟回忆：一种颜色（蓝色）",
                            "延迟回忆：一种厨房用具（筷子）"], start=13):
        items.append(_item(f"MOCA_B_{no:02d}", no, t, list(ok), domain="延迟回忆"))
    # 视知觉 3
    items.append(_item("MOCA_B_18", 18, "视知觉：在重叠图片中找出物品（共 10 件）",
                       [_opt("3", "找出 9-10 个", 3.0), _opt("2", "找出 6-8 个", 2.0),
                        _opt("1", "找出 4-5 个", 1.0), _opt("0", "找出 3 个或以下", 0.0)],
                       domain="视知觉"))
    # 命名 4
    for no, t in enumerate(["命名：斑马", "命名：孔雀", "命名：老虎", "命名：蝴蝶"],
                           start=19):
        items.append(_item(f"MOCA_B_{no:02d}", no, t, list(ok), domain="命名"))
    # 注意（白底）1
    items.append(_item("MOCA_B_23", 23, "注意（白底）：只读圆形中的数字",
                       [_opt("1", "完全正确或只有一次错误", 1.0), _opt("0", "2 个或以上错误", 0.0)],
                       domain="注意"))
    # 注意（黑底）2
    items.append(_item("MOCA_B_24", 24, "注意（黑底）：只读圆形和正方形中的数字",
                       [_opt("2", "2 个或以下错误", 2.0), _opt("1", "3 个错误", 1.0),
                        _opt("0", "4 个或以上错误", 0.0)],
                       domain="注意"))
    cutoffs = [
        CutoffConfig("EDUCATION", "文盲/小学", "文盲/小学（≤6 年）", True,
                     edu_years_min=0, edu_years_max=6, threshold=19.0),
        CutoffConfig("EDUCATION", "中学", "中学（7-12 年）", True,
                     edu_years_min=7, edu_years_max=12, threshold=22.0),
        CutoffConfig("EDUCATION", "大学", "大学（>12 年）", True,
                     edu_years_min=13, edu_years_max=None, threshold=24.0),
    ]
    return ScaleConfig(
        code="MOCA_B", name="蒙特利尔认知评估基础量表（中文版）",
        full_name="Montreal Cognitive Assessment - Basic (MoCA-B)",
        scoring_type="ITEMIZED", score_min=0.0, score_max=30.0,
        summary="Nasreddine 等 2004 年编制、2014 年推出基础版，用于快速筛查 MCI，"
                "适用于文盲与低教育老人，满分 30 分。",
        instruction=("涵盖执行功能、词语流畅性、定向、计算、抽象、延迟回忆、视知觉、命名、"
                     "注意等认知域。节点（异常值指小于等于节点）：文盲/小学 19 分、"
                     "中学 22 分、大学 24 分。"),
        items=items, cutoffs=cutoffs,
        remark="抽象题「橘子香蕉」为练习、不计分；即刻回忆不计分。",
    )


# ---------------------------------------------------------------------------
# 6. CDR —— 临床痴呆评定量表（复杂评分，6 域，0/0.5/1/2/3）
# ---------------------------------------------------------------------------

def _build_cdr() -> ScaleConfig:
    def cdr_opts(anchors):
        return [OptionConfig(code=c, text=t, score=s)
                for c, t, s in anchors]

    anchors = {
        "CDR_MEMORY": [
            ("0", "无记忆缺损或只有轻微的、偶尔的健忘", 0.0),
            ("0.5", "经常性的轻微健忘；对事情能部分回忆；「良性健忘」", 0.5),
            ("1", "中度记忆缺损，对近事遗忘突出，记忆缺损妨碍日常活动", 1.0),
            ("2", "严重记忆缺损；能记住过去非常熟悉的事情，新发生的事件很快遗忘", 2.0),
            ("3", "严重记忆丧失；仅存片段的记忆", 3.0),
        ],
        "CDR_ORIENTATION": [
            ("0", "能完全正确定向", 0.0),
            ("0.5", "对时间关联性有轻微的困难，其余能完全正确定向", 0.5),
            ("1", "对时间关联性有中度困难；检查时对地点仍有定向能力；但在某些场合可能有地理定向能力障碍", 1.0),
            ("2", "对时间关联性有严重困难；通常对时间不能定向，常有地点失定向", 2.0),
            ("3", "仅对病人自己有定向力", 3.0),
        ],
        "CDR_JUDGMENT": [
            ("0", "能很好地解决日常问题，处理事务和财务，判断力良好", 0.0),
            ("0.5", "在解决问题、辨别事物间的异同点方面有轻微缺损", 0.5),
            ("1", "在解决问题、辨别事物间的异同点方面有中度困难；通常还能维持社交事务判断力", 1.0),
            ("2", "在解决问题、辨别事物间的异同点方面有严重损害；社会判断力通常受损", 2.0),
            ("3", "不能做判断，或不能解决问题", 3.0),
        ],
        "CDR_COMMUNITY": [
            ("0", "和平常一样能独立处理工作、购物、义务劳动及社会群体活动", 0.0),
            ("0.5", "在这些活动方面仅有轻微损害", 0.5),
            ("1", "已不能独立进行这些活动；可以从事其中部分活动，不经意的观察似乎正常", 1.0),
            ("2", "不能独立进行室外活动；但可被带到家庭以外的场所参加活动", 2.0),
            ("3", "不能独立进行室外活动；病重得不能被带到家庭以外的场所参加活动", 3.0),
        ],
        "CDR_HOME": [
            ("0", "家庭生活、业余爱好和需用智力的兴趣均很好保持", 0.0),
            ("0.5", "家庭生活、业余爱好和需用智力的兴趣有轻微损害", 0.5),
            ("1", "家庭活动有肯定的轻度障碍，放弃难度大的家务，放弃复杂的爱好和兴趣", 1.0),
            ("2", "仅能做简单的家务，兴趣明显受限，而且维持的差", 2.0),
            ("3", "丧失有意义的家庭活动", 3.0),
        ],
        "CDR_PERSONAL_CARE": [
            ("0", "完全自理", 0.0),
            ("0.5", "完全自理", 0.5),
            ("1", "须旁人督促或提醒", 1.0),
            ("2", "穿衣、个人卫生及个人事务料理都需要帮助", 2.0),
            ("3", "个人自理方面依赖别人给予很大帮助；经常大小便失禁", 3.0),
        ],
    }
    items = [
        _item("CDR_MEMORY", 1, "记忆力（主要项目）", cdr_opts(anchors["CDR_MEMORY"]),
              domain="记忆力", max_score=3.0),
        _item("CDR_ORIENTATION", 2, "定向力", cdr_opts(anchors["CDR_ORIENTATION"]),
              domain="定向力", max_score=3.0),
        _item("CDR_JUDGMENT", 3, "判断与解决问题的能力", cdr_opts(anchors["CDR_JUDGMENT"]),
              domain="判断与解决问题", max_score=3.0),
        _item("CDR_COMMUNITY", 4, "社会事务", cdr_opts(anchors["CDR_COMMUNITY"]),
              domain="社会事务", max_score=3.0),
        _item("CDR_HOME", 5, "家务与业余爱好", cdr_opts(anchors["CDR_HOME"]),
              domain="家务与业余爱好", max_score=3.0),
        _item("CDR_PERSONAL_CARE", 6, "个人自理能力", cdr_opts(anchors["CDR_PERSONAL_CARE"]),
              domain="个人自理", max_score=3.0),
    ]
    return ScaleConfig(
        code="CDR", name="临床痴呆评定量表", full_name="Clinical Dementia Rating (CDR)",
        scoring_type="CDR", score_min=0.0, score_max=3.0,
        summary="对 6 个功能域（记忆力、定向力、判断与解决问题、社会事务、家务与业余爱好、"
                "个人自理）分别评定，综合得出整体 CDR 评分与 CDR-SB。",
        instruction=("分别对知情者和受试者本人进行访谈。只有当能力的减退是由认知障碍引起时才计分。"
                     "6 个功能域各记 0 / 0.5 / 1 / 2 / 3 分；以记忆力为主要项目、其余 5 项为次要项目，"
                     "按 Morris 规则综合出整体 CDR；CDR-SB = 6 域得分之和。"),
        items=items, cutoffs=[],
        remark="CDR 整体评分与 CDR-SB 由算法计算，详见 scoring/scales/cdr.py。",
    )


# ---------------------------------------------------------------------------
# 注册表
# ---------------------------------------------------------------------------

ALL_SCALES: List[ScaleConfig] = [
    _build_scd_q9(),
    _build_gds(),
    _build_faq(),
    _build_mmse(),
    _build_moca_b(),
    _build_cdr(),
]

SCALES: Dict[str, ScaleConfig] = {s.code: s for s in ALL_SCALES}


def get_scale(code: str) -> ScaleConfig:
    """按编码获取量表配置。"""
    if code not in SCALES:
        raise KeyError(f"未知量表编码: {code}，可选值: {list(SCALES.keys())}")
    return SCALES[code]
