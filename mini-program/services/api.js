const { request } = require('./request');

module.exports = {
  login: (username, password) => request({ url: '/auth/web/login', method: 'POST', data: { username, password } }),
  getPatients: (params = {}) => request({ url: `/patients?page=${params.page || 1}&pageSize=${params.pageSize || 20}&keyword=${encodeURIComponent(params.keyword || '')}` }),
  createPatient: (data) => request({ url: '/patients', method: 'POST', data }),
  getPatient: (patientId) => request({ url: `/patients/${encodeURIComponent(patientId)}` }),
  deletePatient: (patientId) => request({ url: `/patients/${encodeURIComponent(patientId)}`, method: 'DELETE' }),
  getScales: () => request({ url: '/scales' }),
  getScale: (scaleCode) => request({ url: `/scales/${encodeURIComponent(scaleCode)}` }),
  createAssessment: (data) => request({ url: '/assessments', method: 'POST', data }),
  getAssessments: (params = {}) => request({ url: `/assessments?page=${params.page || 1}&pageSize=${params.pageSize || 20}${params.patientId ? `&patientId=${encodeURIComponent(params.patientId)}` : ''}` }),
  getAssessment: (assessmentId) => request({ url: `/assessments/${encodeURIComponent(assessmentId)}` }),
};
