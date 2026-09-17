const api = require('../../services/api');

Page({
  data: { scale: {}, items: [], currentIndex: 0, currentItem: null, answers: {}, progress: 0, startedAt: 0, loading: false },
  onLoad() {
    const scale = getApp().globalData.selectedScale;
    if (!scale || !scale.items) { wx.showToast({ title: '量表数据不存在', icon: 'none' }); return; }
    this.setData({ scale, items: scale.items, currentItem: scale.items[0], startedAt: Date.now(), progress: 100 / scale.items.length });
  },
  selectOption(event) {
    const answers = { ...this.data.answers, [this.data.currentItem.code]: event.currentTarget.dataset.code };
    this.setData({ answers });
  },
  previous() { this.moveTo(this.data.currentIndex - 1); },
  next() {
    if (!this.data.answers[this.data.currentItem.code]) { wx.showToast({ title: '请先完成本题', icon: 'none' }); return; }
    if (this.data.currentIndex === this.data.items.length - 1) { this.submit(); return; }
    this.moveTo(this.data.currentIndex + 1);
  },
  moveTo(index) { this.setData({ currentIndex: index, currentItem: this.data.items[index], progress: ((index + 1) / this.data.items.length) * 100 }); },
  submit() {
    if (this.data.items.some((item) => !this.data.answers[item.code])) { wx.showToast({ title: '请完成全部题目', icon: 'none' }); return; }
    this.setData({ loading: true });
    const answers = this.data.items.map((item) => ({ itemCode: item.code, optionCode: this.data.answers[item.code], answerStatus: 'answered', value: {}, observation: {} }));
    api.createAssessment({ patientId: getApp().globalData.selectedPatient.patientId, scaleCode: this.data.scale.scaleCode, scaleVersion: this.data.scale.version, status: 'submitted', durationSeconds: Math.round((Date.now() - this.data.startedAt) / 1000), answers }).then((data) => {
      getApp().globalData.latestAssessment = data.assessment;
      const patientId = getApp().globalData.selectedPatient.patientId;
      api.getAssessments({ patientId, pageSize: 200 }).then((list) => {
        const completedCodes = new Set((list.items || []).map((item) => item.scaleCode));
        if (completedCodes.size >= 6) {
          wx.redirectTo({ url: `/pages/assessment-complete/assessment-complete?patientId=${patientId}` });
          return;
        }
        wx.redirectTo({ url: `/pages/result/result?assessmentId=${data.assessment.assessmentId}` });
      }).catch(() => wx.redirectTo({ url: `/pages/result/result?assessmentId=${data.assessment.assessmentId}` }));
    }).catch((error) => wx.showToast({ title: error.message || '提交失败', icon: 'none' })).finally(() => this.setData({ loading: false }));
  },
});
