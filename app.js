// app.js
App({
  globalData: {
    // 当前选中的校区，默认第一个
    campus: '东湖校区',
    // 用户昵称（本地保存，可修改）
    nickName: '同学',
    // 云开发是否可用（初始化失败时页面要给出提示，而不是一直转圈）
    cloudReady: false
  },

  onLaunch() {
    // 初始化云开发（使用系统默认云环境，不传任何参数）
    if (wx.cloud) {
      try {
        wx.cloud.init()
        this.globalData.cloudReady = true
      } catch (err) {
        console.error('云开发初始化失败', err)
        this.globalData.cloudReady = false
      }
    } else {
      console.error('当前环境不支持云开发')
      this.globalData.cloudReady = false
    }

    // 读取本地保存的校区和昵称
    const campus = wx.getStorageSync('campus')
    if (campus) {
      this.globalData.campus = campus
    }
    const nickName = wx.getStorageSync('nickName')
    if (nickName) {
      this.globalData.nickName = nickName
    }
  },

  // 获取数据库引用：云开发没准备好时返回 null，避免页面直接报错卡住
  getDB() {
    if (!wx.cloud) return null
    try {
      return wx.cloud.database()
    } catch (err) {
      console.error('数据库引用失败', err)
      return null
    }
  },

  // 切换校区：同时更新全局数据和本地存储
  setCampus(name) {
    this.globalData.campus = name
    wx.setStorageSync('campus', name)
  },

  // 修改昵称
  setNickName(name) {
    this.globalData.nickName = name
    wx.setStorageSync('nickName', name)
  },

  // 全局转发配置
  onShareAppMessage() {
    return {
      title: '校园笔记 · 打卡与记录',
      path: '/pages/index/index'
    }
  }
})
