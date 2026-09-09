const api = require('../../services/api');

const SCALE_NAMES = { SCD_Q9: '主观认知下降', GDS: '老年抑郁', FAQ: '功能活动', MMSE: '基础认知', MOCA_B: 'MoCA-B', CDR: '临床痴呆' };
const GENDER_LABELS = { male: '男', female: '女', unknown: '未填写' };

function duration(seconds) { return seconds ? `${Math.floor(seconds / 60)}分${seconds % 60}秒` : '未记录'; }
function score(item) { return item.scoreSummary && item.scoreSummary.totalScore !== null ? `${item.scoreSummary.totalScore}/${item.scoreSummary.maximumScore}` : '待评分'; }
function age(birthDate) { if (!birthDate) return '年龄未填写'; const date = new Date(birthDate); if (Number.isNaN(date.getTime())) return '年龄未填写'; const now = new Date(); let value = now.getFullYear() - date.getFullYear(); if (now.getMonth() < date.getMonth() || (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())) value -= 1; return `${value}岁`; }

Page({
  data: { patient: {}, results: [], values: [], patientId: '' },
  onLoad(options) {
    const selected = getApp().globalData.selectedPatient;
    const patientId = options.patientId || (selected && selected.patientId);
    this.setData({ patientId });
    Promise.all([api.getPatient(patientId), api.getAssessments({ patientId, pageSize: 200 })]).then(([patientData, assessmentData]) => {
      const patient = patientData.patient;
      const latest = new Map();
      (assessmentData.items || []).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).forEach((item) => { if (!latest.has(item.scaleCode)) latest.set(item.scaleCode, item); });
      const results = [...latest.values()].map((item) => ({ ...item, name: SCALE_NAMES[item.scaleCode] || item.scaleCode, durationText: duration(item.durationSeconds), scoreText: score(item), label: item.scoreSummary.resultLabel || (item.scoreSummary.scoringStatus === 'calculated' ? '已完成' : '待评分'), abnormal: item.scoreSummary.isAbnormal }));
      const values = results.map((item) => item.scoreSummary.maximumScore ? (item.scoreSummary.totalScore || 0) / item.scoreSummary.maximumScore : 0);
      this.setData({ patient: { ...patient, initial: patient.name ? patient.name.slice(0, 1) : '?', genderLabel: GENDER_LABELS[patient.gender] || '未填写', ageLabel: age(patient.birthDate) }, results, values });
      setTimeout(() => this.drawRadar(values), 100);
    }).catch((error) => wx.showToast({ title: error.message || '综合报告加载失败', icon: 'none' }));
  },
  drawRadar(values) {
    const query = wx.createSelectorQuery().in(this);
    query.select('#radar').fields({ node: true, size: true }).exec((result) => {
      const info = result[0]; const canvas = info && info.node; if (!canvas) return;
      const ctx = canvas.getContext('2d'); const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2; canvas.width = info.width * dpr; canvas.height = info.height * dpr; ctx.scale(dpr, dpr);
      const width = info.width; const height = info.height; const cx = width / 2; const cy = height / 2; const radius = Math.min(width, height) * .32; const count = 6; const labels = ['记忆', '定向', '判断', '社交', '生活', '自理']; const points = values.length === 6 ? values : [0, 0, 0, 0, 0, 0];
      ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      for (let ring = 1; ring <= 4; ring += 1) { ctx.beginPath(); for (let i = 0; i < count; i += 1) { const angle = -Math.PI / 2 + i * Math.PI * 2 / count; const r = radius * ring / 4; i ? ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r) : ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r); } ctx.closePath(); ctx.strokeStyle = '#dbe3ee'; ctx.stroke(); }
      for (let i = 0; i < count; i += 1) { const angle = -Math.PI / 2 + i * Math.PI * 2 / count; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius); ctx.strokeStyle = '#e1e7ef'; ctx.stroke(); ctx.fillStyle = '#536074'; ctx.fillText(labels[i], cx + Math.cos(angle) * (radius + 22), cy + Math.sin(angle) * (radius + 22)); }
      ctx.beginPath(); points.forEach((value, i) => { const angle = -Math.PI / 2 + i * Math.PI * 2 / count; const r = radius * Math.max(0, Math.min(1, value)); i ? ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r) : ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r); }); ctx.closePath(); ctx.fillStyle = 'rgba(36, 112, 232, .22)'; ctx.fill(); ctx.strokeStyle = '#2470e8'; ctx.lineWidth = 3; ctx.stroke();
    });
  },
  back() { wx.navigateBack(); },
  download() {
    const app = getApp(); const session = app.globalData.session;
    wx.showToast({ title: '综合报告正在生成', icon: 'none' });
    if (!session || !session.token) return;
    wx.downloadFile({ url: `${app.globalData.apiBaseUrl}/reports/assessments/${encodeURIComponent(this.data.results[0].assessmentId)}.pdf`, header: { Authorization: `Bearer ${session.token}` }, success: (response) => { if (response.statusCode === 200) wx.openDocument({ filePath: response.tempFilePath, fileType: 'pdf', showMenu: true }); else wx.showToast({ title: '报告下载失败', icon: 'none' }); }, fail: () => wx.showToast({ title: '报告下载失败', icon: 'none' }) });
  },
});
