const api = require('../../services/api');

const GENDER_LABELS = { male: '男', female: '女', unknown: '未填写' };

function formatPatient(patient) {
  if (!patient) return null;
  const birthDate = patient.birthDate && new Date(patient.birthDate);
  let ageLabel = '未填写';
  if (birthDate && !Number.isNaN(birthDate.getTime())) {
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    if (now.getMonth() < birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())) age -= 1;
    ageLabel = age >= 0 ? `${age}岁` : '未填写';
  }
  return { ...patient, initial: patient.name ? patient.name.slice(0, 1) : '?', genderLabel: GENDER_LABELS[patient.gender] || '未填写', ageLabel };
}

Page({
  data: {
    scales: [],
    selectedPatient: null,
    allAssessmentStarted: false,
    colors: ['#2f8df5', '#61c978', '#ffbd3e', '#ff9045', '#38c4c8', '#8a65d9'],
  },
  onShow() {
    this.setData({ selectedPatient: formatPatient(getApp().globalData.selectedPatient) });
    api.getScales().then((data) => this.setData({ scales: data.scales || [] })).catch((error) => wx.showToast({ title: error.message || '量表加载失败', icon: 'none' }));
  },
  back() { wx.navigateBack(); },
  choosePatient() { wx.navigateTo({ url: '/pages/patient-picker/patient-picker' }); },
  openScale(event) {
    if (!this.data.selectedPatient) { wx.showToast({ title: '请先选择患者', icon: 'none' }); return; }
    getApp().globalData.selectedScale = this.data.scales.find((item) => item.scaleCode === event.currentTarget.dataset.code);
    wx.navigateTo({ url: `/pages/scale-guide/scale-guide?scaleCode=${event.currentTarget.dataset.code}` });
  },
  viewReports() {
    const patient = this.data.selectedPatient;
    if (!patient) { wx.showToast({ title: '请先选择患者', icon: 'none' }); return; }
    wx.navigateTo({ url: `/pages/reports/reports?patientId=${patient.patientId}` });
  },
  startAllAssessments() {
    if (!this.data.selectedPatient) { wx.showToast({ title: '请先选择患者', icon: 'none' }); return; }
    const app = getApp();
    app.globalData.assessmentQueue = this.data.scales.slice();
    app.globalData.assessmentQueueIndex = 0;
    this.startNextAssessment();
  },
  startNextAssessment() {
    const app = getApp();
    const nextScale = app.globalData.assessmentQueue[app.globalData.assessmentQueueIndex];
    if (!nextScale) { wx.showToast({ title: '全套测评已完成' }); return; }
    app.globalData.selectedScale = nextScale;
    wx.navigateTo({ url: `/pages/scale-guide/scale-guide?scaleCode=${nextScale.scaleCode}&all=true` });
  },
});
