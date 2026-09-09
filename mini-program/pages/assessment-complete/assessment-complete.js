const api = require('../../services/api');

Page({
  data: { completedCount: 6, completionPercent: 100, totalDurationText: '—', records: [], patientId: '' },
  onLoad(options) {
    const patient = getApp().globalData.selectedPatient;
    const patientId = options.patientId || (patient && patient.patientId);
    this.setData({ patientId });
    api.getAssessments({ patientId, pageSize: 200 }).then((data) => {
      const records = data.items || [];
      const latest = new Map();
      records.forEach((item) => {
        if (!latest.has(item.scaleCode)) latest.set(item.scaleCode, item);
      });
      const selected = [...latest.values()];
      const totalSeconds = selected.reduce((sum, item) => sum + (item.durationSeconds || 0), 0);
      this.setData({ records: selected, completedCount: selected.length, completionPercent: Math.round((selected.length / 6) * 100), totalDurationText: this.formatDuration(totalSeconds) });
    }).catch((error) => wx.showToast({ title: error.message || '加载测评记录失败', icon: 'none' }));
  },
  formatDuration(seconds) {
    if (!seconds) return '—';
    return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
  },
  viewReport() {
    if (this.data.completedCount < 6) { wx.showToast({ title: '六项测评完成后生成综合报告', icon: 'none' }); return; }
    wx.redirectTo({ url: `/pages/comprehensive-report/comprehensive-report?patientId=${this.data.patientId}` });
  },
  viewRecords() { wx.navigateTo({ url: '/pages/records/records' }); },
});
