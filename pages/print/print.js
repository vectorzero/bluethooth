import {
  BluetoothMode
} from '../../utils/bluetooth/index.js'
import {
  printBuffer
} from '../../utils/printBuffer.js'
const app = getApp()
const bluetooth = new BluetoothMode()
const printConfig = { // 蓝牙打印机服务索引映射
  'HM-A300-03b2': 0,
  'HM-A320-': 2,
  'HM-A300-': 2
}
Page({
  currentCharacteristic: {
    deviceId: '',
    serviceId: '',
    characteristicId: '',
  },
  printValue: printBuffer,
  data: {
    devicesData: [],
    currentDeviceId: '',
    printerBrand: '',
    printerName: '',
    platform: ''
  },

  onLoad() {
    this.setData({
      platform: app.globalData.systemInfo.platform
    })
    this.connectLastDevice()
  },

  onUnload() {
    bluetooth.closeAll(this.data.currentDeviceId)
  },

  closeDevice() {
    bluetooth.closeConnection(this.data.currentDeviceId)
    this.setData({
      currentDeviceId: -1
    })
    wx.setStorageSync('lastDeviceId', '')
  },

  // 连接上次连接的设备
  connectLastDevice() {
    const lastDeviceId = wx.getStorageSync('lastDeviceId')
    if (lastDeviceId) {
      bluetooth.initBluetooth().then(() => {
        // 监听发现新的设备
        let flag = false
        bluetooth.on('newDevice', data => {
          this.setData({
            devicesData: data
          })
          const currentDevice = data.find(v => v.deviceId === lastDeviceId)
          if (!flag && currentDevice) {
            flag = true
            this.connectionBluetooth(currentDevice.deviceId, currentDevice.name)
            console.log('currentDevice', currentDevice)
          }
        })
      })
    } else {
      this.startBluetooth()
    }
  },

  // 点击连接蓝牙设备
  handleConnect(e) {
    const deviceId = e.currentTarget.dataset.id
    const deviceName = e.currentTarget.dataset.name
    this.connectionBluetooth(deviceId, deviceName)
  },

  connectionBluetooth(deviceId, deviceName) {
    wx.showLoading({
      title: '正在连接中...',
    })
    bluetooth.connect(deviceId).then(res => {
      wx.showToast({
        icon: 'none',
        title: '连接成功！',
      })
      wx.setStorageSync('lastDeviceId', deviceId)
      let i = 0
      for (let k in printConfig) {
        if (deviceName.includes(k)) {
          i = printConfig[k]
          return
        }
      }
      const characteristicId = res[i].characteristics.find(v => v.properties.write === true).uuid
      this.currentCharacteristic = {
        ...res[i],
        characteristicId
      }
      this.setData({
        currentDeviceId: deviceId
      })
      this.junglePrint(deviceName)
      // 停止搜索 减少资源
      bluetooth.stop()
    }).catch(err => {
      console.log('connect fail', err)
      wx.showToast({
        icon: 'none',
        title: `连接失败: ${err.errMsg}`,
      })
    })
  },

  // 扫描设备
  startBluetooth() {
    this.setData({
      currentDeviceId: -1
    })
    this._initBluetooth()
  },

  // 扫码连接已识别的设备
  scanBlue() {
    const that = this;
    wx.scanCode({
      onlyFromCamera: true,
      success(res) {
        let obj = {}
        const code = res.result
        const devicesData = that.data.devicesData
        devicesData.forEach(item => {
          if (item.advertisData) {
            const str = item.advertisData.replace(/:/g, "")
            const mac = str.substring(6, str.length)
            if (code.includes(mac)) {
              obj = item
            }
          }
        })
        if (obj) {
          that.connectionBluetooth(obj.deviceId, obj.name);
        } else {
          wx.showToast({
            title: '无法找到对应的设备，请重试',
            icon: 'none'
          })
        }
      }
    })
  },

  //初始化蓝牙适配器
  _initBluetooth() {
    // 调用蓝牙子类的初始化事件
    bluetooth.initBluetooth().then(res => {
      // 监听发现新的设备
      bluetooth.on('newDevice', data => {
        this.setData({
          devicesData: data
        })
      })
    })
  },

  // 打印
  handlePrint() {
    wx.showLoading({
      title: '正在打印中...',
    })
    bluetooth.write({
      ...this.currentCharacteristic,
      value: this.printValue,
      platform: this.data.platform
    }).then(() => {
      wx.showToast({
        icon: 'none',
        title: '打印成功！',
      })
    }).catch(err => {
      wx.showToast({
        icon: 'none',
        title: `打印失败: ${err.errMsg}`,
      })
    })
  },

  // 判断打印机
  junglePrint(name) {
    let printerBrand = ''
    let printerName = ''
    if (name.includes('XT423')) {
      printerBrand = '芝柯'
      printerName = 'XT423'
    } else if (name.includes('CC3')) {
      printerBrand = '芝柯'
      printerName = 'CC3'
    } else if (name.includes('HM-A300')) {
      printerBrand = '汉印'
      printerName = 'HM-A300'
    } else if (name.includes('Printer')) {
      printerBrand = '佳博'
      printerName = 'JB'
    } else {
      printerBrand = '不支持此类型打印机'
      printerName = ''
    }
    this.setData({
      printerBrand,
      printerName
    })
  }
})