const { getStoredSession } = require('./services/auth');

App({
  globalData: {
    apiBaseUrl: 'https://adscdbackend-311006-10-1479821149.sh.run.tcloudbase.com/api/v1',
    session: null,
    selectedPatient: null,
    selectedScale: null,
    assessmentDraft: null,
  },
  onLaunch() {
    this.globalData.session = getStoredSession();
  },
});
