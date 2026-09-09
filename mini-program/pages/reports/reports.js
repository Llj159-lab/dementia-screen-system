const api = require('../../services/api');

Page({
  data: { records: [], patientId: '' },
  onLoad(options) {
    const patientId = options.patientId || (getApp().globalData.selectedPatient && getApp().globalData.selectedPatient.patientId);
    this.setData({ patientId });
    api.getAssessments({ patientId }).then((data) => {
      const records = (data.items || []).map((item) => ({
        ...item,
        scoreText: item.scoreSummary && item.scoreSummary.totalScore !== null ? `${item.scoreSummary.totalScore}分` : '待评分',
      }));
      this.setData({ records });
    }).catch((error) => wx.showToast({ title: error.message || '加载失败', icon: 'none' }));
  },
  back() { wx.navigateBack(); },
  open(event) { wx.navigateTo({ url: `/pages/result/result?assessmentId=${event.currentTarget.dataset.id}` }); },
  download(event) {
    const app = getApp();
    const session = app.globalData.session;
    const id = event.currentTarget.dataset.id;
    wx.downloadFile({
      url: `${app.globalData.apiBaseUrl}/reports/assessments/${encodeURIComponent(id)}.pdf`,
      header: { Authorization: `Bearer ${session.token}` },
      success: (response) => {
        if (response.statusCode !== 200) { wx.showToast({ title: '报告下载失败', icon: 'none' }); return; }
        wx.openDocument({ filePath: response.tempFilePath, fileType: 'pdf', showMenu: true, fail: () => wx.showToast({ title: '无法打开报告', icon: 'none' }) });
      },
      fail: () => wx.showToast({ title: '报告下载失败', icon: 'none' }),
    });
  },
});
