import {
  PublishtionModel
} from 'publishtion.js'

import {
  hexStringToBuff
} from 'format.js'

const tips = {
  0: '正常',
  10000: '未初始化蓝牙适配器',
  10001: '当前蓝牙适配器不可用，请打开手机蓝牙后重试',
  10002: '没有找到指定设备',
  10003: '连接失败',
  10004: '没有找到指定服务',
  10005: '没有找到指定特征值',
  10006: '当前连接已断开',
  10007: '当前特征值不支持此操作',
  10008: '其余所有系统上报的异常',
  10009: 'Android 系统特有，系统版本低于 4.3 不支持 BLE',
  10012: '连接超时',
  10013: '连接 deviceId 为空或者是格式不正确',
  20000: '蓝牙适配器不可用，蓝牙可能被关闭',
}

class BluetoothMode extends PublishtionModel {

  //获取搜索到的蓝牙设备
  data = []

  //初始化蓝牙适配器
  initBluetooth() {
    return new Promise((resolve, reject) => {
      this._initBluetooth().then(res => {
        this._getBluetoothState()
        return this._search()
      }).then(res => {
        // 开启监听 
        this._onDFound()
        resolve(res)
      })
    })
  }

  _initBluetooth() {
    return new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        success: res => {
          console.log('初始化蓝牙模块成功')
          resolve()
        },
        fail: error => {
          console.log(error)
          this._showTips(error.errCode)
        }
      })
    })
  }

  // 连接低功耗蓝牙
  connection(deviceId) {
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId,
        success: res => {
          this._setDevice(deviceId)
          // 暂停搜索
          this.stop()
          resolve({
            res,
            deviceId
          })
        },
        fail: err => {
          reject(err)
        }
      })
    })
  }

  connect(deviceId) {
    return new Promise((resolve, reject) => {
      this.connection(deviceId).then(res => {
        return this.getServiceList(res.deviceId)
      }).then(res => {
        let promiseList = []
        for (let i in res.services) {
          promiseList.push(this.getBLEDeviveChar({
            deviceId,
            serviceId: res.services[i].uuid
          }))
        }
        return Promise.all(promiseList)
      }).then(res => {
        resolve(res)
      }).catch(err => {
        console.log('connect err', err)
        reject(err)
      })
    })
  }

  // 启用低功耗蓝牙设备特征值变化时的 notify 功能，订阅特征值。
  // 注意：必须设备的特征值支持 notify 或者 indicate 才可以成功调用。
  notify({
    deviceId,
    serviceId,
    characteristicId
  }) {
    return new Promise((resolve, reject) => {
      wx.notifyBLECharacteristicValueChange({
        state: true, // 启用 notify 功能
        // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
        deviceId,
        // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
        serviceId,
        // 这里的 characteristicId 需要在 getBLEDeviceCharacteristics 接口中获取
        characteristicId,
        success(res) {
          resolve(res)
          console.log('notifyBLECharacteristicValueChange success', res.errMsg)
        }
      })
    })
  }

  // 获取服务列表
  getServiceList(deviceId) {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceServices({
        // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
        deviceId,
        success(res) {
          console.log('device services:', res.services)
          resolve({
            services: res.services,
            deviceId
          })
        },
        fail(err) {
          console.log('getBLEDeviceServices err', err)
          reject(err)
        }
      })
    })
  }

  // 获取蓝牙设备某个服务中所有特征值 getBLEDeviceCharacteristics
  getBLEDeviveChar({
    deviceId,
    serviceId
  }) {
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceCharacteristics({
        // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
        deviceId,
        // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
        serviceId,
        success(res) {
          res.deviceId = deviceId
          res.serviceId = serviceId
          resolve(res)
          console.log('device getBLEDeviceCharacteristics:', res.characteristics)
        }
      })
    })
  }

  // 断开与低功耗蓝牙设备的连接。
  closeConnection(deviceId) {
    wx.closeBLEConnection({
      deviceId,
      success(res) {
        console.log('closeBLEConnection', res)
      }
    })
  }

  //向低功耗蓝牙设备特征值中写入二进制数据。
  write({
    deviceId,
    serviceId,
    characteristicId,
    value,
    platform
  }) {
    let datalen = 16;
    if (platform == 'ios') {
      datalen = 120;
    }
    const buffer = hexStringToBuff(value)
    let pos = 0;
    let bytes = buffer.byteLength;
    let promiseList = []
    //根据Android不同型号进行调整，保险起见20字节一包发送，iOS可以最大185个字节一包
    while (bytes > 0) {
      let tmpBuffer;
      if (bytes > datalen) {
        tmpBuffer = buffer.slice(pos, pos + datalen);
        pos += datalen;
        bytes -= datalen;
      } else {
        tmpBuffer = buffer.slice(pos, pos + bytes);
        pos += bytes;
        bytes -= bytes;
      }
      promiseList.push(this._write({
        deviceId,
        serviceId,
        characteristicId,
        value: tmpBuffer
      }))
    }
    return Promise.all(promiseList)
  }

  _write({
    deviceId,
    serviceId,
    characteristicId,
    value,
  }) {
    return new Promise((resolve, reject) => {
      wx.writeBLECharacteristicValue({
        // 这里的 deviceId 需要在 getBluetoothDevices 或 onBluetoothDeviceFound 接口中获取
        deviceId,
        // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
        serviceId,
        // 这里的 characteristicId 需要在 getBLEDeviceCharacteristics 接口中获取
        characteristicId,
        // 这里的value是ArrayBuffer类型
        value,
        success(res) {
          resolve(res)
          console.log('writeBLECharacteristicValue success', res.errMsg)
        },
        fail(err) {
          reject(err)
          console.log('writeBLECharacteristicValue fail', err.errMsg)
        }
      })
    })
  }

  // 停止搜寻附近的蓝牙外围设备
  stop() {
    return new Promise((resolve, reject) => {
      wx.stopBluetoothDevicesDiscovery({
        success(res) {
          console.log('stopBluetoothDevicesDiscovery', res)
          resolve(res)
        }
      })
    })
  }

  // 关闭蓝牙适配器
  close() {
    wx.closeBluetoothAdapter()
  }

  // 关闭所有蓝牙相关的连接
  closeAll(deviceId) {
    if (deviceId) {
      this.closeConnection(deviceId)
    }
    this.stop()
    setTimeout(() => {
      this.close()
    })
  }

  // 获取设备Id
  getDevice() {
    return wx.getStorageSync('deviceId')
  }

  // 开启蓝牙搜索
  _search() {
    wx.showLoading({
      title: '正在搜索中...',
    })
    return new Promise((resolve, reject) => {
      wx.startBluetoothDevicesDiscovery({
        success: res => {
          resolve(res)
        },
        fail: err => {
          reject(err)
        },
        complete: res => {
          setTimeout(() => {
            wx.hideLoading()
          }, 2000)
        }
      })
    })
  }

  //返回ArrayBuffe
  _hexStringToArrayBuffer(str) {
    if (!str) {
      return new ArrayBuffer(0);
    }
    let buffer = new ArrayBuffer(str.length);
    let dataView = new DataView(buffer)
    let ind = 0;
    for (let i = 0, len = str.length; i < len; i += 2) {
      let code = parseInt(str.substr(i, 2), 16)
      dataView.setUint8(ind, code)
      ind++
    }
    return buffer;
  }

  // 开启监听获取到新的设备
  _onDFound() {
    wx.onBluetoothDeviceFound(devices => {
      this._getDevices().then(res => {
        const devices = this.data.filter(v => Boolean(v.RSSI))
        this.publish(devices, 'newDevice')
      })
    })
  }

  // 获取寻找的所有设备
  _getDevices() {
    return new Promise((resolve, reject) => {
      wx.getBluetoothDevices({
        success: res => {
          let array = []
          for (let x in res.devices) {
            if (res.devices[x].name !== '未知设备') {
              // const bf = res.devices[x].advertisData.slice(4, 10);
              // const mac = Array.prototype.map.call(new Uint8Array(bf), x => ('00' + x.toString(16)).slice(-2)).join(':');
              // res.devices[x].mac = mac.toUpperCase()
              res.devices[x].advertisData = this._ab2hex(res.devices[x].advertisData)
              array.push(res.devices[x])
            }
          }
          this.data = array
          console.log('devices', array)
          resolve(array)
        }
      })
    })
  }

  // 获取蓝牙适配器的状态
  _getBluetoothState() {
    wx.onBluetoothAdapterStateChange(res => {
      if (res.available) {
        console.log('蓝牙模块可用')
      } else {
        wx.showModal({
          title: '提示',
          content: '蓝牙已被关闭',
          showCancel: false,
          success(res) {
            if (res.confirm) {
              console.log('用户点击确定')
            } else if (res.cancel) {
              console.log('用户点击取消')
            }
          }
        })
        this._showTips(20000)
        console.log('蓝牙模块不可用')
      }
      if (res.discovering) {
        console.log('蓝牙适配器处于搜索状态')
      } else {
        console.log('蓝牙适配器不处于搜索状态')
      }
    })
  }

  // ArrayBuffer转16进度字符串示例
  _ab2hex(buffer) {
    let hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2)
      }
    )
    return hexArr.join('');
  }

  // 错误提示
  _showTips(code) {
    code && wx.showToast({
      title: tips[code],
      icon: 'none'
    })
  }

  // 储存设备Id
  _setDevice(id) {
    wx.setStorageSync('deviceId', id)
  }

}

export {
  BluetoothMode
}