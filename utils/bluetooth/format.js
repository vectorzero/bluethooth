const gbk = require('./gbk.js');

const hexStringToBuff = str => { //str='中国：WXHSH'
  const buffer = new ArrayBuffer((sumStrLength(str)) * 4)
  const dataView = new DataView(buffer)
  const data = str.toString();
  let p = 0; //ArrayBuffer 偏移量
  let temp = null
  for (let i = 0; i < data.length; i++) {
    if (isCN(data[i])) { //是中文
      //调用GBK 转码
      const t = gbk.encode(data[i]);
      for (let j = 0; j < 2; j++) {
        //const code = t[j * 2] + t[j * 2 + 1];
        const code = t[j * 3 + 1] + t[j * 3 + 2];
        temp = parseInt(code, 16)
        //temp = strToHexCharCode(code);
        dataView.setUint8(p++, temp)
      }
    } else {
      temp = data.charCodeAt(i);
      dataView.setUint8(p++, temp)
    }
  }
  return buffer;
}

function strToHexCharCode(str) {
  if (str === "")
    return "";
  let hexCharCode = [];
  hexCharCode.push("0x");
  for (var i = 0; i < str.length; i++) {
    hexCharCode.push((str.charCodeAt(i)).toString(16));
  }
  return hexCharCode.join("");
}

function sumStrLength(str) {
  let length = 0;
  const data = str.toString();
  for (var i = 0; i < data.length; i++) {
    if (isCN(data[i])) { //是中文
      length += 2;
    } else {
      length += 1;
    }
  }
  return length;
}

function isCN(str) {
  if (/^[\u3220-\uFA29]+$/.test(str)) {
    return true;
  } else {
    return false;
  }
}

//汉字转码
function hexStringToArrayBuffer(str) {
  const buffer = new ArrayBuffer((str.length / 2) + 1)
  const dataView = new DataView(buffer)
  for (let i = 0; i < str.length / 2; i++) {
    const temp = parseInt(str[i * 2] + str[i * 2 + 1], 16)
    dataView.setUint8(i, temp)
  }
  dataView.setUint8((str.length / 2), 0x0a)
  return buffer;
}

function send0X0A() {
  const buffer = new ArrayBuffer(1)
  const dataView = new DataView(buffer)
  dataView.setUint8(0, 0x0a)
  return buffer;
}

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
  let hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    })
  return hexArr.join('');
}

function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
}

module.exports = {
  hexStringToArrayBuffer,
  hexStringToBuff,
  send0X0A,
  ab2hex,
  inArray
}