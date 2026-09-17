const api = require('../../services/api');
const offline = require('../../services/offline');

Page({
  data: { pendingPatients: 0, pendingAssessments: 0, completedCount: 0, lastSyncAt: '', syncing: false, hasPending: false },
  onShow() { this.refresh(); },
  refresh() {
    const queue = offline.loadQueue();
    const stats = offline.loadStats();
    this.setData({
      pendingPatients: queue.filter((item) => item.type === 'patient').length,
      pendingAssessments: queue.filter((item) => item.type === 'assessment').length,
      completedCount: stats.completedCount || 0,
      lastSyncAt: stats.lastSyncAt || '',
      hasPending: queue.length > 0,
    });
  },
  back() { wx.navigateBack(); },
  clearCache() {
    offline.clearQueue();
    wx.showToast({ title: '离线缓存已清除' });
    this.refresh();
  },
  exportData() {
    wx.showToast({ title: '已复制离线数据到控制台', icon: 'none' });
    console.log('offline queue', offline.loadQueue());
  },
  syncNow() {
    const queue = offline.loadQueue();
    if (!queue.length) { wx.showToast({ title: '没有待同步数据', icon: 'none' }); return; }
    this.setData({ syncing: true });
    const tasks = queue.map((item) => {
      if (item.type === 'patient') return api.createPatient(item.payload);
      if (item.type === 'assessment') return api.createAssessment(item.payload);
      return Promise.resolve();
    });
    Promise.allSettled(tasks).then((results) => {
      const success = results.filter((r) => r.status === 'fulfilled').length;
      const remaining = queue.filter((_, i) => results[i].status === 'rejected');
      offline.saveQueue(remaining);
      const stats = offline.loadStats();
      offline.saveStats({ lastSyncAt: new Date().toLocaleString('zh-CN'), completedCount: (stats.completedCount || 0) + success });
      wx.showToast({ title: success ? `已同步${success}条` : '同步失败' });
      this.refresh();
    }).finally(() => this.setData({ syncing: false }));
  },
});
