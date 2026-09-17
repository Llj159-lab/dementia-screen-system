const api = require('../../services/api');

const GENDER_LABELS = { male: '男', female: '女', unknown: '未填写' };

function formatPatient(patient, selectedId) {
  const birth = patient.birthDate && new Date(patient.birthDate);
  let ageLabel = '未填写';
  if (birth && !Number.isNaN(birth.getTime())) {
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
    ageLabel = `${age}岁`;
  }
  return { ...patient, initial: patient.name ? patient.name.slice(0, 1) : '?', genderLabel: GENDER_LABELS[patient.gender] || '未填写', ageLabel, selected: patient.patientId === selectedId };
}

Page({
  data: { patients: [], keyword: '' },
  onLoad() { this.load(); },
  load() {
    api.getPatients({ keyword: this.data.keyword }).then((data) => {
      const selected = getApp().globalData.selectedPatient;
      this.setData({ patients: (data.items || []).map((item) => formatPatient(item, selected && selected.patientId)) });
    }).catch((error) => wx.showToast({ title: error.message || '加载失败', icon: 'none' }));
  },
  onKeywordInput(event) { this.setData({ keyword: event.detail.value }); },
  select(event) {
    const patient = this.data.patients.find((item) => item.patientId === event.currentTarget.dataset.id);
    getApp().globalData.selectedPatient = patient;
    wx.navigateBack();
  },
  back() { wx.navigateBack(); },
});
