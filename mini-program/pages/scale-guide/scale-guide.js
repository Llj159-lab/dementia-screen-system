const api = require('../../services/api');

const GUIDE_CONTENT = {
  SCD_Q9: {
    audience: '适用于60岁以上、主观感觉记忆力下降，但尚未明确诊断认知障碍的老年人。',
    diseases: '可用于初步了解主观认知下降风险，辅助发现需要进一步评估的记忆问题。',
    content: '围绕记忆问题、近期对话、重要日期、常用号码和物品放置等日常体验进行询问。',
    operation: '请根据本人最近一段时间的真实感受选择答案，不要反复思考或由他人代答。',
    notice: '本测评用于筛查，不等同于临床诊断；如结果异常，请到正规医疗机构进一步检查。',
  },
  GDS: {
    audience: '适用于60岁以上老年人，尤其是出现情绪低落、兴趣下降、孤独或睡眠变化的人群。',
    diseases: '可用于筛查老年期抑郁相关风险，不能替代精神科或心理科诊断。',
    content: '评估最近一周的生活满意度、兴趣、精力、幸福感、孤独感和希望感。',
    operation: '请选择最符合最近一周感受的“是”或“否”，每题只选择一个答案。',
    notice: '如果出现持续悲伤、明显绝望或自伤想法，请立即联系家人和专业医务人员。',
  },
  FAQ: {
    audience: '适用于60岁以上老年人，由熟悉其日常生活的家属或照护者协助完成。',
    diseases: '可辅助筛查日常生活能力下降及轻度认知损害风险。',
    content: '评估电话使用、购物、做饭、家务、兴趣活动、服药和外出等功能活动。',
    operation: '请根据患者实际能否独立完成选择；不适用的项目可选择NA。',
    notice: '请结合患者平时表现回答，不要只根据当天状态判断。',
  },
  MMSE: {
    audience: '适用于60岁以上、存在记忆、定向、计算或语言变化，需要进行基础认知筛查的人群。',
    diseases: '可辅助发现认知功能下降风险，结果需结合教育程度、病史和专业检查解释。',
    content: '包括时间和地点定向、记忆、注意计算、语言、执行指令、书写和视空间能力。',
    operation: '由评估人员逐题口头提问或展示材料，按患者实际回答记录，避免提示答案。',
    notice: '听力、视力、语言、教育背景等因素可能影响结果，请如实记录特殊情况。',
  },
  MOCA_B: {
    audience: '适用于60岁以上、需要更全面了解执行功能、记忆、语言和视空间能力的老年人。',
    diseases: '可辅助筛查轻度认知损害和早期认知功能下降风险。',
    content: '涵盖执行功能、词语流畅性、定向、计算、抽象、延迟回忆、视知觉、命名和注意。',
    operation: '请按评估人员指令完成口头回答、书写、连线及图形任务，限时题需遵守时间要求。',
    notice: '连线和画图题请在屏幕上完成；不得使用计算器、搜索工具或他人提示。',
  },
  CDR: {
    audience: '适用于60岁以上、本人或家属发现记忆及生活能力持续变化，需要进行临床分级评估的人群。',
    diseases: '可辅助评估阿尔茨海默病等痴呆相关认知和生活功能变化程度。',
    content: '通过访谈评估记忆、定向、判断与解决问题、社会活动、家庭生活及个人自理能力。',
    operation: '由专业评估人员结合患者和知情者访谈选择各维度等级，并记录必要观察。',
    notice: 'CDR需要综合访谈和临床判断；当前系统若显示待评分，请以专业人员复核为准。',
  },
};

Page({
  data: { scale: { instructions: [], scoring: {}, items: [] }, guide: {}, loading: true },
  onLoad(options) {
    const selected = getApp().globalData.selectedScale;
    const code = options.scaleCode || (selected && selected.scaleCode);
    api.getScale(code).then((data) => {
      const scale = data.scale;
      this.setData({ scale, guide: GUIDE_CONTENT[scale.scaleCode] || GUIDE_CONTENT.MMSE, loading: false });
    }).catch((error) => { this.setData({ loading: false }); wx.showToast({ title: error.message || '加载失败', icon: 'none' }); });
  },
  back() { wx.navigateBack(); },
  start() {
    getApp().globalData.selectedScale = this.data.scale;
    wx.navigateTo({ url: `/pages/assessment/assessment?scaleCode=${this.data.scale.scaleCode}` });
  },
});
