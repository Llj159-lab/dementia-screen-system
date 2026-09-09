const api = require('../../services/api');

Page({
  data: {
    form: { gender: 'unknown', medicalHistory: [] },
    genderLabels: ['男', '女', '未知'],
    genderValues: ['male', 'female', 'unknown'],
    genderIndex: 2,
    educationLabels: ['文盲', '小学', '初中', '高中/大专', '本科及以上'],
    maritalLabels: ['已婚', '未婚'],
    historyOptions: [
      { label: '糖尿病', value: 'diabetes' },
      { label: '高血压', value: 'hypertension' },
      { label: '心脏病', value: 'heart_disease' },
      { label: '脑卒中', value: 'stroke' },
      { label: '其他', value: 'other' },
    ],
    loading: false,
  },
  onInput(event) { this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value }); },
  onGenderChange(event) { const index = Number(event.detail.value); this.setData({ genderIndex: index, 'form.gender': this.data.genderValues[index] }); },
  onDateChange(event) { this.setData({ 'form.birthDate': event.detail.value }); },
  onEducationChange(event) { this.setData({ 'form.educationLevel': this.data.educationLabels[Number(event.detail.value)] }); },
  onMaritalChange(event) { this.setData({ 'form.maritalStatus': this.data.maritalLabels[Number(event.detail.value)] }); },
  onHistoryChange(event) { this.setData({ 'form.medicalHistory': event.detail.value }); },
  back() { wx.navigateBack(); },
  submit() {
    const form = this.data.form;
    if (!form.name || !form.patientCode) { wx.showToast({ title: '姓名和患者编号必填', icon: 'none' }); return; }
    this.setData({ loading: true });
    const profile = {
      ...(form.profile || {}),
      educationLevel: form.educationLevel || null,
      occupation: form.occupation || null,
      maritalStatus: form.maritalStatus || null,
      medicalHistory: form.medicalHistory || [],
      allergyHistory: form.allergyHistory || null,
    };
    api.createPatient({
      patientCode: form.patientCode,
      name: form.name,
      gender: form.gender,
      birthDate: form.birthDate || null,
      profile,
    }).then((data) => {
      getApp().globalData.selectedPatient = data.patient;
      wx.showToast({ title: '建档成功' });
      setTimeout(() => wx.switchTab({ url: '/pages/scales/scales' }), 500);
    }).catch((error) => wx.showToast({ title: error.message || '提交失败', icon: 'none' })).finally(() => this.setData({ loading: false }));
  },
});
