const { clearSession } = require('../../services/auth');

Page({
  data: { displayName: '开发测试用户' },
  onShow() { const session = getApp().globalData.session; this.setData({ displayName: session && session.user ? session.user.displayName : '开发测试用户' }); },
  records() { wx.navigateTo({ url: '/pages/records/records' }); },
  patients() { wx.switchTab({ url: '/pages/patients/patients' }); },
  offlineSync() { wx.navigateTo({ url: '/pages/offline-sync/offline-sync' }); },
  logout() { clearSession(); getApp().globalData.session = null; wx.reLaunch({ url: '/pages/login/login' }); },
});
