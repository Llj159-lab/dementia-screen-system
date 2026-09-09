const api = require('../../services/api');
const { saveSession } = require('../../services/auth');

Page({
  data: { username: 'researcher_demo', password: 'Researcher123!', loading: false },
  onUsernameInput(event) { this.setData({ username: event.detail.value }); },
  onPasswordInput(event) { this.setData({ password: event.detail.value }); },
  login() {
    if (!this.data.username || !this.data.password) {
      wx.showToast({ title: '请输入账号和密码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    api.login(this.data.username, this.data.password).then((data) => {
      const app = getApp();
      app.globalData.session = saveSession(data);
      wx.switchTab({ url: '/pages/patients/patients' });
    }).catch((error) => {
      const message = error.statusCode === 401 ? '账号或密码错误' : error.message || '登录失败，请检查后端服务和请求地址';
      wx.showToast({ title: message, icon: 'none', duration: 3000 });
      console.error('登录失败：', error);
    }).finally(() => this.setData({ loading: false }));
  },
});
