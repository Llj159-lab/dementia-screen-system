const { getStoredSession, clearSession } = require('./auth');

function createRequestId() {
  return `mini-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function request({ url, method = 'GET', data, responseType = 'text' }) {
  const app = getApp();
  const session = app.globalData.session || getStoredSession();
  const headers = { 'X-Request-Id': createRequestId() };
  if (session && session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}${url}`,
      method,
      data,
      header: headers,
      responseType,
      success(response) {
        const payload = response.data;
        if (response.statusCode === 401) {
          clearSession();
          app.globalData.session = null;
        }
        if (response.statusCode < 200 || response.statusCode >= 300 || !payload || payload.code !== 0) {
          const message = payload && payload.message ? payload.message : `请求失败（${response.statusCode}）`;
          reject(Object.assign(new Error(message), { statusCode: response.statusCode, payload }));
          return;
        }
        resolve(payload.data);
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络请求失败，请确认后端服务正在运行'));
      },
    });
  });
}

module.exports = { request };
