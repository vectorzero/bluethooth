import {
  promisifyAll,
  promisify
} from 'miniprogram-api-promise';
const wxp = {}
// promisify all wx's api
promisifyAll(wx, wxp)
// console.log(wxp.getSystemInfoSync())
// wxp.getSystemInfo().then(console.log)
// wxp.showModal().then(wxp.openSetting())

// compatible usage
// wxp.getSystemInfo({success(res) {console.log(res)}})

// promisify single api
// promisify(wx.getSystemInfo)().then(console.log)

App({
  onLaunch: function () {
    wxp.getSystemInfo().then(res => {
      this.globalData.systemInfo = res
    })
  },
  globalData: {
    systemInfo: {}
  }
})