Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    }
  },
  methods: {
    handleTabTap(event) {
      const { key, url } = event.currentTarget.dataset || {};

      if (!key || !url || key === this.properties.active) {
        return;
      }

      wx.redirectTo({ url });
    }
  }
});
