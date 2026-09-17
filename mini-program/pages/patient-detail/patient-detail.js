const api = require('../../services/api');

const GENDER_LABELS = { male: '男', female: '女', unknown: '未填写' };
const SCALE_CODES = ['SCD_Q9', 'GDS', 'FAQ', 'MMSE', 'MOCA_B', 'CDR'];

function ageLabel(birthDate) {
  if (!birthDate) return '年龄未填写';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '年龄未填写';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? `${age}岁` : '年龄未填写';
}

function withinDays(dateString, days) {
  if (!dateString) return false;
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function buildMonthlySeries(records, scaleCode) {
  const year = new Date().getFullYear();
  const buckets = Array.from({ length: 12 }, () => ({ sum: 0, count: 0 }));
  records.filter((item) => item.scaleCode === scaleCode && item.scoreSummary && item.scoreSummary.totalScore !== null).forEach((item) => {
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
    const bucket = buckets[date.getMonth()];
    bucket.sum += item.scoreSummary.totalScore;
    bucket.count += 1;
  });
  return buckets.map((bucket) => (bucket.count ? Math.round((bucket.sum / bucket.count) * 100) / 100 : null));
}

function analyseTrend(series) {
  const present = series.filter((value) => value !== null);
  if (present.length < 2) return '本年数据不足，暂无法分析趋势';
  const first = present[0];
  const last = present[present.length - 1];
  if (last > first) return `本年得分呈上升趋势，最近一次 ${last} 分`;
  if (last < first) return `近半年得分呈下降趋势，建议加强随访`;
  return '本年得分基本持平，建议按计划随访';
}

function drawLineChart(canvas, labels, series) {
  const query = wx.createSelectorQuery();
  query.select(`#${canvas.id}`).fields({ node: true, size: true }).exec((result) => {
    const node = result[0] && result[0].node;
    if (!node) return;
    const width = result[0].width;
    const height = result[0].height;
    const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 2;
    node.width = width * dpr;
    node.height = height * dpr;
    const ctx = node.getContext('2d');
    ctx.scale(dpr, dpr);
    const padding = { top: 14, bottom: 24, left: 34, right: 12 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const values = series.map((value) => (value === null ? 0 : value));
    const maxScore = Math.max(10, ...values);
    const points = series.map((value, index) => ({
      x: padding.left + (chartWidth * index) / (series.length - 1),
      y: padding.top + chartHeight - (chartHeight * (value === null ? 0 : value)) / maxScore,
      value,
    }));
    ctx.strokeStyle = '#eef1f5';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + (chartHeight * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = '#98a1ad';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(Math.round((maxScore * (4 - i)) / 4)), padding.left - 5, y + 3);
    }
    labels.forEach((label, index) => {
      if (index % 2 !== 0) return;
      const x = padding.left + (chartWidth * index) / (labels.length - 1);
      ctx.fillStyle = '#98a1ad';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, height - 8);
    });
    const drawn = points.filter((point) => point.value !== null);
    if (drawn.length > 0) {
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, 'rgba(36, 112, 232, .22)');
      gradient.addColorStop(1, 'rgba(36, 112, 232, 0)');
      ctx.beginPath();
      ctx.moveTo(drawn[0].x, padding.top + chartHeight);
      drawn.forEach((point) => ctx.lineTo(point.x, point.y));
      ctx.lineTo(drawn[drawn.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.beginPath();
      drawn.forEach((point, index) => (index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
      ctx.strokeStyle = '#2470e8';
      ctx.lineWidth = 2;
      ctx.stroke();
      drawn.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#2470e8';
        ctx.fill();
      });
    }
  });
}

Page({
  data: { patient: { profile: {} }, records: [], completedCount: 0, statusText: '', statusClass: 'red', trendData: [] },
  onLoad(options) {
    const patientId = options.patientId || getApp().globalData.selectedPatient.patientId;
    Promise.all([api.getPatient(patientId), api.getAssessments({ patientId, pageSize: 200 })]).then(([patientData, assessmentData]) => {
      const patient = patientData.patient;
      const history = patient.profile && Array.isArray(patient.profile.medicalHistory) ? patient.profile.medicalHistory : [];
      const records = assessmentData.items || [];
      const latest = new Map();
      records.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).forEach((item) => { if (!latest.has(item.scaleCode)) latest.set(item.scaleCode, item); });
      const recentScales = new Set();
      records.forEach((item) => { if (withinDays(item.createdAt, 30)) recentScales.add(item.scaleCode); });
      let statusText = '未测评';
      let statusClass = 'red';
      if (recentScales.size === 6) { statusText = '已测评'; statusClass = 'green'; }
      else if (recentScales.size > 0) { statusText = '未完全测评'; statusClass = 'yellow'; }
      const labels = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);
      const trendData = SCALE_CODES.map((scaleCode) => {
        const series = buildMonthlySeries(records, scaleCode);
        return { scaleCode, series, analysis: analyseTrend(series) };
      });
      this.setData({
        patient: {
          ...patient,
          initial: patient.name ? patient.name.slice(0, 1) : '?',
          genderLabel: GENDER_LABELS[patient.gender] || '未填写',
          ageLabel: ageLabel(patient.birthDate),
          profile: { ...(patient.profile || {}), medicalHistoryText: history.length ? history.join('、') : '无' },
        },
        records,
        completedCount: latest.size,
        statusText,
        statusClass,
        trendData,
      });
      setTimeout(() => {
        this.data.trendData.forEach((item) => drawLineChart({ id: `trend-${item.scaleCode}` }, labels, item.series));
      }, 120);
    }).catch((error) => wx.showToast({ title: error.message || '加载失败', icon: 'none' }));
  },
  back() { wx.navigateBack(); },
  viewComprehensive() {
    if (this.data.completedCount < 6) { wx.showToast({ title: '六项测评完成后生成综合报告', icon: 'none' }); return; }
    wx.navigateTo({ url: `/pages/comprehensive-report/comprehensive-report?patientId=${this.data.patient.patientId}` });
  },
  startAssessment() {
    getApp().globalData.selectedPatient = this.data.patient;
    wx.switchTab({ url: '/pages/scales/scales' });
  },
});
