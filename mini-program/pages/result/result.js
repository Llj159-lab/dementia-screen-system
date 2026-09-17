const api = require('../../services/api');

Page({
  data: { assessment: { scaleCode: '', scoreSummary: {} }, patient: {}, loading: true },
  buildView(assessment, patient) {
    const summary = assessment.scoreSummary || {};
    return { assessment, patient: patient || {}, scoreText: summary.totalScore === null ? '待评分' : summary.totalScore, maximumText: summary.maximumScore ? ` / ${summary.maximumScore}` : '', statusText: summary.scoringStatus === 'calculated' ? '已完成评分' : '等待专业复核', resultText: summary.resultLabel || summary.warning || '暂无结果', abnormalClass: summary.isAbnormal ? 'abnormal' : 'normal' };
  },
  onLoad(options) {
    const latest = getApp().globalData.latestAssessment;
    if (latest && latest.assessmentId === options.assessmentId) { this.setData({ ...this.buildView(latest, getApp().globalData.selectedPatient), loading: false }); return; }
    api.getAssessment(options.assessmentId).then((data) => this.setData({ ...this.buildView(data.assessment, data.patient), loading: false })).catch((error) => wx.showToast({ title: error.message || '加载失败', icon: 'none' }));
  },
  records() { wx.navigateTo({ url: '/pages/records/records' }); },
  back() { wx.switchTab({ url: '/pages/scales/scales' }); },
});
