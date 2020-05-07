const app = getApp()
var util = require('../../utils/util.js');
var time = 0;
var imageData = [];
var k = 0;
var strArray;
var platform = 'ios'

function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
}

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}

function strToBinary(str) {
  var result = [];
  var list = str.split("");
  for (var i = 0; i < list.length; i++) {
    if (i != 0) {
      result.push(" ");
    }
    var item = list[i];
    var binaryStr = item.charCodeAt().toString(2);
    if (binaryStr) {
      result.push(binartStr);
    }
  }
  return result.join("");
}

Page({
  data: {
    devices: [],
    connected: false,
    chs: [],
    lastList: []
  },
  onLoad() {
    wx.getSystemInfo({
      success: function (res) {
        platform = res.platform
      }
    })
  },
  //初始化蓝牙模块
  openBluetoothAdapter() {
    this.setData({
      connected: false
    })
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('openBluetoothAdapter success', res)
        this.startBluetoothDevicesDiscovery()
      },
      fail: (res) => {
        if (res.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            console.log('onBluetoothAdapterStateChange', res)
            if (res.available) {
              this.startBluetoothDevicesDiscovery()
            }
          })
        }
      }
    })
  },

  //获取本机蓝牙适配器状态
  getBluetoothAdapterState() {
    wx.getBluetoothAdapterState({
      success: (res) => {
        console.log('getBluetoothAdapterState', res)
        if (res.discovering) {
          this.onBluetoothDeviceFound()
        } else if (res.available) {
          this.startBluetoothDevicesDiscovery()
        }
      },
      fail: (res) => {
        console.log('error:getBluetoothAdapterState', res)
      }
    })
  },

  //开始搜寻附近的蓝牙外围设备
  startBluetoothDevicesDiscovery() {
    if (this._discoveryStarted) {
      return
    }
    this._discoveryStarted = true
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      success: (res) => {
        console.log('startBluetoothDevicesDiscovery success', res)
        this.onBluetoothDeviceFound()
      },
      fail: (res) => {
        console.log("搜索蓝牙失败");
      }
    })
  },
  stopBluetoothDevicesDiscovery() {
    this.setData({
      connected: false
    })
    wx.stopBluetoothDevicesDiscovery()
  },

  //寻找到新设备的事件的回调函数
  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if (!device.name && !device.localName) {
          return
        }
        const foundDevices = this.data.devices
        const idx = inArray(foundDevices, 'deviceId', device.deviceId)
        const data = {}
        if (idx === -1) {
          data[`devices[${foundDevices.length}]`] = device
        } else {
          data[`devices[${idx}]`] = device
        }
        this.setData(data)
      })
    })
  },

  //连接低功耗蓝牙设备
  createBLEConnection(e) {
    const ds = e.currentTarget.dataset
    const deviceId = ds.deviceId
    const name = ds.name
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        this.setData({
          lastList: [],
          connected: true,
          name,
          deviceId,
        })
        this.getBLEDeviceServices(deviceId)
      },
      fail: (res) => {
        console.log("蓝牙连接失败:", res);
      }
    })
    this.stopBluetoothDevicesDiscovery()
  },

  //获取蓝牙设备所有服务(service)
  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        for (let i = 0; i < res.services.length; i++) {
          this.getBLEDeviceCharacteristics(i, deviceId, res.services[i].uuid)
        }
      },
      fail: (res) => {
        console.log("获取蓝牙服务失败：" + JSON.stringify(res))
      }
    })
  },

  //获取蓝牙设备某个服务中所有特征值(characteristic)
  getBLEDeviceCharacteristics(index, deviceId, serviceId) {
    const that = this
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        // console.log('getBLEDeviceCharacteristics success', res.characteristics)
        for (let i = 0; i < res.characteristics.length; i++) {
          let {
            lastList
          } = that.data
          let item = res.characteristics[i]
          // if (item.properties.read) {
          //   wx.readBLECharacteristicValue({
          //     deviceId,
          //     serviceId,
          //     characteristicId: item.uuid,
          //   })
          // }
          item.deviceId = deviceId
          item.serviceId = serviceId
          let obj = {
            deviceId,
            serviceId,
            uuid: item.uuid,
            // canWrite: item.properties.write,
            key: index + '-' + i,
            val: item
          }
          if (item.properties.write) {
            wx.writeBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              value: new ArrayBuffer(1),
              success (res) {
                obj.canWrite = true
                lastList.push(obj)
                that.setData({
                  lastList
                })
              }
            })
          }
          // if (item.properties.write) {
          //   this.setData({
          //     canWrite: true
          //   })
          //   this._deviceId = deviceId
          //   this._serviceId = serviceId
          //   this._characteristicId = item.uuid
          //   // this.writeBLECharacteristicValue()
          // }
          // if (item.properties.notify || item.properties.indicate) {
          //   wx.notifyBLECharacteristicValueChange({
          //     deviceId,
          //     serviceId,
          //     characteristicId: item.uuid,
          //     state: true,
          //   })
          // }
        }
        that.onBLECharacteristicValueChange()
      },
      fail(res) {
        console.error('获取特征值失败：', res)
      }
    })
  },

  onBLECharacteristicValueChange() {
    // 操作之前先监听，保证第一时间获取数据
    wx.onBLECharacteristicValueChange((characteristic) => {
      const idx = inArray(this.data.chs, 'uuid', characteristic.characteristicId)
      const data = {}
      if (idx === -1) {
        data[`chs[${this.data.chs.length}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      } else {
        data[`chs[${idx}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      }
      // data[`chs[${this.data.chs.length}]`] = {
      //   uuid: characteristic.characteristicId,
      //   value: ab2hex(characteristic.value)
      // }
      this.setData(data)
    })
  },

  writeBLECharacteristicValue(event) {
    const obj = event.currentTarget.dataset.obj
    const data =
      `hello\r\nworld\r\n`
    var bufferstr = util.hexStringToBuff(data);
    console.log(obj.properties)
    this.printMain(bufferstr, obj.deviceId, obj.serviceId, obj.uuid, obj.properties)
  },

  printMain(buffer, deviceId, serviceId, uuid, properties) {
    if (properties.notify || properties.indicate) {
      wx.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId,
        characteristicId: uuid,
        state: true,
      })
    }
    this.setData({
      deviceId
    })
    //根据Android不同型号进行调整，保险起见20字节一包发送，iOS可以最大185个字节一包
    let datalen = 16;
    if (platform === 'ios') {
      datalen = 120;
    }
    let pos = 0;
    let bytes = buffer.byteLength;
    const that = this;
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
      console.log('deviceId', deviceId, 'serviceId', serviceId, 'uuid', uuid, 'tmpBuffer', tmpBuffer)
      wx.writeBLECharacteristicValue({
        deviceId,
        serviceId,
        characteristicId: uuid,
        value: tmpBuffer,
        success: function (res) {
          wx.showToast({
            title: '数据传输完成！',
          });
          that.closeBLEConnection()
        },
        fail: function (res) {
          wx.showToast({
            title: '数据传输失败！',
          });
        },
        complete: function (res) {
          that.onBLEConnectionStateChange()
        }
      })
    }
  },

  //断开与低功耗蓝牙设备的连接
  closeBLEConnection() {
    wx.closeBLEConnection({
      deviceId: this.data.deviceId
    })
    this.setData({
      connected: false,
      chs: []
    })
  },

  //关闭蓝牙模块
  closeBluetoothAdapter() {
    this.setData({
      connected: false
    })
    wx.closeBluetoothAdapter()
    this._discoveryStarted = false
  },

  onBLEConnectionStateChange() {
    wx.onBLEConnectionStateChange((res) => {
      // 该方法回调中可以用于处理连接意外断开等异常情况
      console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
    })
  },

  sendStr: function (bufferstr, success, failed) {
    var that = this;
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: this._serviceId,
      characteristicId: this._characteristicId,
      value: bufferstr,
      success: function (res) {
        success(res);
        console.log('发送的数据：' + bufferstr)
        console.log('message发送成功')
      },
      failed: function (res) {
        fail(res)
        console.log("数据发送失败:" + JSON.stringify(res))
      },
      complete: function (res) {
        console.log("发送完成:" + JSON.stringify(res))
      }
    })

  },

  hexCharCodeToStr(hexCharCodeStr) {
    var trimedStr = hexCharCodeStr.trim();
    var rawStr = trimedStr.substr(0, 2).toLowerCase() === '0x' ? trimedStr.substr(2) : trimedStr;
    var len = rawStr.length;
    var curCharCode;
    var resultStr = [];
    for (var i = 0; i < len; i = i + 2) {
      curCharCode = parseInt(rawStr.substr(i, 2), 16);
      resultStr.push(String.fromCharCode(curCharCode));
    }
    return resultStr.join('');
  }
})