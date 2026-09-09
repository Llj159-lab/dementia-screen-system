const SESSION_KEY = 'cognitive_screen_session';

function getStoredSession() {
  try {
    return wx.getStorageSync(SESSION_KEY) || null;
  } catch (error) {
    return null;
  }
}

function saveSession(session) {
  wx.setStorageSync(SESSION_KEY, session);
  return session;
}

function clearSession() {
  wx.removeStorageSync(SESSION_KEY);
}

function loginWithDevelopmentToken() {
  const app = getApp();
  const token = wx.getStorageSync('cognitive_screen_dev_token');
  if (!token) {
    return Promise.reject(new Error('尚未配置开发 Token，请在登录页填写后重试'));
  }
  const session = { token, user: { displayName: '开发测试用户', roleCodes: ['researcher'] } };
  app.globalData.session = saveSession(session);
  return Promise.resolve(session);
}

module.exports = {
  getStoredSession,
  saveSession,
  clearSession,
  loginWithDevelopmentToken,
};
