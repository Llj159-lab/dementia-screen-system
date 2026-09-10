"""用已验证的 Python 评分引擎导出 golden 正确计分样例 → ts/golden/golden-cases.json。

golden 样例是跨语言一致性的权威来源：Python 引擎已通过 29 条断言，
本脚本把同一批用例跑一遍并序列化为 TS camelCase 契约，供 ts/tests/golden.test.ts 对拍。

运行：``python scripts/export_golden_cases.py``
"""

from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scoring import score
from scoring.config_data import get_scale


def max_answers(code: str) -> dict:
    """每个题目取分值最高的选项编码。"""
    return {it.code: max(it.options, key=lambda o: o.score).code
            for it in get_scale(code).items}


GDS_REVERSE_NOS = {1, 5, 7, 11, 13}


def gds_answer(no: int, depressed: bool) -> str:
    if no in GDS_REVERSE_NOS:
        return "否" if depressed else "是"
    return "是" if depressed else "否"


def gds_answers(n_depressed: int) -> dict:
    return {f"GDS_{n:02d}": gds_answer(n, n <= n_depressed) for n in range(1, 16)}


def camel_extra(extra: dict) -> dict:
    if "cdr_sb" not in extra:
        return {}
    return {
        "cdrSb": extra["cdr_sb"],
        "cdrGlobal": extra["cdr_global"],
        "domainScores": extra["domain_scores"],
        "cdrSbRange": extra["cdr_sb_range"],
    }


def make_case(code: str, answers: dict, education_years=None) -> dict:
    patient = {"education_years": education_years} if education_years is not None else None
    r = score(code, answers, patient=patient)
    return {
        "scaleCode": code,
        "educationYears": education_years,
        "answers": answers,
        "expected": {
            "totalScore": r.total_score,
            "subScores": r.sub_scores,
            "resultLabel": r.result_label,
            "cutoffGroup": r.cutoff_group,
            "cutoffValue": r.cutoff_value,
            "isAbnormal": r.is_abnormal,
            "extra": camel_extra(r.extra),
        },
    }


CDR_ZERO = {"CDR_MEMORY": "0", "CDR_ORIENTATION": "0", "CDR_JUDGMENT": "0",
            "CDR_COMMUNITY": "0", "CDR_HOME": "0", "CDR_PERSONAL_CARE": "0"}


def main() -> None:
    cases = []

    # ---- SCD-Q9（累加，0~9）----
    scd_zero = {it.code: ("从未" if it.no in (4, 5, 7) else "否")
                for it in get_scale("SCD_Q9").items}
    cases.append(make_case("SCD_Q9", max_answers("SCD_Q9")))
    cases.append(make_case("SCD_Q9", scd_zero))
    scd_half = dict(scd_zero)
    scd_half["SCD_Q9_04"] = "偶尔"
    cases.append(make_case("SCD_Q9", scd_half))

    # ---- GDS（累加，0~15，含反序）----
    cases.append(make_case("GDS", gds_answers(0)))
    cases.append(make_case("GDS", gds_answers(15)))
    cases.append(make_case("GDS", {f"GDS_{n:02d}": "否" for n in range(1, 16)}))
    cases.append(make_case("GDS", gds_answers(4)))
    cases.append(make_case("GDS", gds_answers(9)))
    cases.append(make_case("GDS", gds_answers(12)))

    # ---- FAQ（累加，0~30，含 NA）----
    cases.append(make_case("FAQ", {f"FAQ_{i:02d}": "3" for i in range(1, 11)}))
    faq_na = {f"FAQ_{i:02d}": "0" for i in range(1, 11)}
    faq_na["FAQ_01"] = "NA"
    faq_na["FAQ_02"] = "NA"
    faq_na["FAQ_03"] = "1"
    cases.append(make_case("FAQ", faq_na))

    # ---- MMSE（分项 + 教育界值）----
    mmse_full = max_answers("MMSE")
    cases.append(make_case("MMSE", mmse_full, education_years=9))
    for years in (0, 3, 6, 7, 16):
        cases.append(make_case("MMSE", mmse_full, education_years=years))
    mmse_threshold = dict(mmse_full)
    for code in ["MMSE_01", "MMSE_02", "MMSE_03", "MMSE_04", "MMSE_05", "MMSE_06"]:
        mmse_threshold[code] = "0"
    cases.append(make_case("MMSE", mmse_threshold, education_years=9))

    # ---- MoCA-B（分项 + 教育界值）----
    moca_full = max_answers("MOCA_B")
    cases.append(make_case("MOCA_B", moca_full, education_years=16))
    for years in (0, 6, 7, 12, 13):
        cases.append(make_case("MOCA_B", moca_full, education_years=years))

    # ---- CDR（复杂 Morris + CDR-SB）----
    cases.append(make_case("CDR", dict(CDR_ZERO)))
    cdr_one = dict(CDR_ZERO)
    cdr_one.update({"CDR_MEMORY": "1", "CDR_ORIENTATION": "1",
                    "CDR_JUDGMENT": "1", "CDR_COMMUNITY": "1"})
    cases.append(make_case("CDR", cdr_one))
    cdr_half = dict(CDR_ZERO)
    cdr_half["CDR_MEMORY"] = "0.5"
    cases.append(make_case("CDR", cdr_half))
    cases.append(make_case("CDR", {"CDR_MEMORY": "2", "CDR_ORIENTATION": "1",
                                   "CDR_JUDGMENT": "1", "CDR_COMMUNITY": "0.5",
                                   "CDR_HOME": "1", "CDR_PERSONAL_CARE": "0.5"}))
    cases.append(make_case("CDR", {"CDR_MEMORY": "3", "CDR_ORIENTATION": "3",
                                   "CDR_JUDGMENT": "2", "CDR_COMMUNITY": "2",
                                   "CDR_HOME": "1", "CDR_PERSONAL_CARE": "1"}))

    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                            "ts", "golden", "golden-cases.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"导出 {len(cases)} 条 golden 样例 → {out_path}")


if __name__ == "__main__":
    main()
