const api = require('../../services/api');

function calculateAge(birthDate) {
  if (!birthDate) return '未填写';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '未填写';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const birthdayPassed = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 0 ? `${age}岁` : '未填写';
}

function normalizeGender(patient) {
  const profileGender = patient.profile && patient.profile.gender;
  const gender = patient.gender || profileGender;
  return GENDER_LABELS[gender] || (typeof gender === 'string' && gender.trim() ? gender.trim() : '未填写');
}

const GENDER_LABELS = { male: '男', female: '女', unknown: '未填写' };

Page({
  data: { patients: [], keyword: '', loading: false },
  onShow() { this.load(); },
  onPullDownRefresh() { this.load().finally(() => wx.stopPullDownRefresh()); },
  onKeywordInput(event) { this.setData({ keyword: event.detail.value }); },
  load() {
    this.setData({ loading: true });
    return api.getPatients({ keyword: this.data.keyword }).then((data) => {
      const patients = (data.items || []).map((patient) => ({
        ...patient,
        initial: patient.name ? patient.name.slice(0, 1) : '?',
        genderLabel: normalizeGender(patient),
        ageLabel: calculateAge(patient.birthDate || (patient.profile && patient.profile.birthDate)),
      }));
      this.setData({ patients });
    }).catch((error) => wx.showToast({ title: error.message || '加载失败', icon: 'none' })).finally(() => this.setData({ loading: false }));
  },
  create() { wx.navigateTo({ url: '/pages/patient-form/patient-form' }); },
  back() { wx.navigateBack(); },
  openPatient(event) {
    const patient = this.data.patients.find((item) => item.patientId === event.currentTarget.dataset.id);
    getApp().globalData.selectedPatient = patient;
    wx.navigateTo({ url: `/pages/patient-detail/patient-detail?patientId=${patient.patientId}` });
  },
  deletePatient(event) {
    const patientId = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除患者',
      content: '确定要删除该患者信息？',
      confirmText: '确认',
      cancelText: '取消',
      success: (result) => {
        if (!result.confirm) return;
        api.deletePatient(patientId).then(() => {
          wx.showToast({ title: '删除成功' });
          this.load();
          if (getApp().globalData.selectedPatient && getApp().globalData.selectedPatient.patientId === patientId) getApp().globalData.selectedPatient = null;
        }).catch((error) => wx.showToast({ title: error.message || '删除失败', icon: 'none' }));
      },
    });
  },
});
