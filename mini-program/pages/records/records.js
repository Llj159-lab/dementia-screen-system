const api = require('../../services/api');

Page({
  data: { records: [] },
  onShow() {
    const patient = getApp().globalData.selectedPatient;
    api.getAssessments(patient ? { patientId: patient.patientId } : {}).then((data) => this.setData({ records: data.items || [] })).catch((error) => wx.showToast({ title: error.message || '加载失败', icon: 'none' }));
  },
  open(event) { wx.navigateTo({ url: `/pages/result/result?assessmentId=${event.currentTarget.dataset.id}` }); },
});
