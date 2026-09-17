Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/patients/patients', text: '患者', icon: '♙' },
      { pagePath: '/pages/scales/scales', text: '测评', icon: '▣' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: '♙' },
    ],
  },
  pageLifetimes: {
    show() { this.updateSelected(); },
  },
  methods: {
    updateSelected() {
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      const route = current ? current.route : '';
      const selected = route === 'pages/patients/patients' ? 0 : route === 'pages/scales/scales' ? 1 : route === 'pages/profile/profile' ? 2 : -1;
      this.setData({ selected });
    },
    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index);
      this.setData({ selected: index });
      wx.switchTab({ url: this.data.list[index].pagePath });
    },
  },
});
