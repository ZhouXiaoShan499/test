// pages/campus/campus.js
const app = getApp()
const { CAMPUS_LIST } = require('../../utils/common')

// 校区基础信息（静态展示用）
const CAMPUS_INFO = {
  东湖校区: {
    address: '东湖路 88 号',
    openTime: '07:00 - 22:00',
    phone: '0571-8888 0001',
    desc: '绿树成荫的老校区，图书馆和操场都在中心位置。'
  },
  南山校区: {
    address: '南山街 12 号',
    openTime: '07:30 - 21:30',
    phone: '0571-8888 0002',
    desc: '新校区，教学楼和实验楼连在一起，走两步就到。'
  },
  西溪校区: {
    address: '西溪路 200 号',
    openTime: '08:00 - 21:00',
    phone: '0571-8888 0003',
    desc: '安静的小校区，适合自习和读书。'
  }
}

// 功能入口
const FUNC_ENTRIES = [
  { key: 'timetable', name: '课表', emoji: '🗓️' },
  { key: 'classroom', name: '空教室', emoji: '🪑' },
  { key: 'activity', name: '活动', emoji: '🎪' },
  { key: 'market', name: '二手', emoji: '🛍️' },
  { key: 'lost', name: '失物招领', emoji: '🔎' }
]

// 附近服务
const NEARBY = [
  { name: '打印店', desc: '图书馆一楼 · 8:00-20:00', emoji: '🖨️' },
  { name: '食堂', desc: '一食堂 / 二食堂 · 11:00-13:00', emoji: '🍚' },
  { name: '快递点', desc: '南门快递驿站 · 9:00-19:00', emoji: '📦' }
]

Page({
  data: {
    campus: '东湖校区',
    campusList: CAMPUS_LIST,
    info: CAMPUS_INFO['东湖校区'],
    funcEntries: FUNC_ENTRIES,
    nearby: NEARBY,
    activities: [],
    viewMode: 'list' // list | map
  },

  onLoad() {
    this.setData({ campus: app.globalData.campus })
    this.refreshInfo()
    this.loadActivities()
  },

  onShow() {
    if (this.data.campus !== app.globalData.campus) {
      this.setData({ campus: app.globalData.campus })
      this.refreshInfo()
      this.loadActivities()
    }
  },

  onPullDownRefresh() {
    this.loadActivities(() => wx.stopPullDownRefresh())
  },

  refreshInfo() {
    const info = CAMPUS_INFO[this.data.campus] || CAMPUS_INFO['东湖校区']
    this.setData({ info })
  },

  // 切换校区
  onCampusChange(e) {
    const index = Number(e.detail.value)
    const name = this.data.campusList[index]
    app.setCampus(name)
    this.setData({ campus: name })
    this.refreshInfo()
    this.loadActivities()
  },

  // 加载该校区活动
  loadActivities(done) {
    const db = app.getDB()
    if (!db) {
      this.setData({ activities: [] })
      if (typeof done === 'function') done()
      return
    }

    db.collection('activities')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
      .then((res) => {
        const list = (res.data || []).filter(
          (a) => !a.campus || a.campus === this.data.campus
        )
        this.setData({ activities: list })
        if (typeof done === 'function') done()
      })
      .catch((err) => {
        console.error('校区活动加载失败', err)
        this.setData({ activities: [] })
        if (typeof done === 'function') done()
      })
  },

  // 列表 / 地图切换
  onViewToggle(e) {
    this.setData({ viewMode: e.currentTarget.dataset.mode })
  },

  // 功能入口点击
  onFuncTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'activity') {
      wx.showToast({ title: '活动列表就在下方', icon: 'none' })
      return
    }
    wx.showToast({ title: '这个功能马上就来', icon: 'none' })
  },

  // 打电话
  onCall() {
    wx.makePhoneCall({
      phoneNumber: this.data.info.phone.replace(/[^0-9]/g, ''),
      fail: () => {}
    })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.campus} · 校园信息`,
      path: '/pages/campus/campus'
    }
  }
})
