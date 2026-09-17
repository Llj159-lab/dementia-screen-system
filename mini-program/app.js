const { getStoredSession } = require('./services/auth');

App({
  globalData: {
    apiBaseUrl: 'http://localhost:3000/api/v1',
    session: null,
    selectedPatient: null,
    selectedScale: null,
    assessmentDraft: null,
  },
  onLaunch() {
    this.globalData.session = getStoredSession();
  },
});
