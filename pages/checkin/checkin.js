// pages/checkin/checkin.js
const app = getApp()
const {
  CHECKIN_TYPES,
  toDateKey,
  todayKey,
  calcStreak
} = require('../../utils/common')

Page({
  data: {
    types: CHECKIN_TYPES,
    activeType: 'study',
    todayChecked: false,
    todayTypeName: '',
    streak: 0,
    totalDays: 0,
    // 热力图：最近 28 天（4 行 × 7 列）
    heatmap: [],
    // 打卡时间线
    timeline: [],
    // 今日排行榜
    rankList: [],
    submitting: false,
    showBadge: false
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData(() => wx.stopPullDownRefresh())
  },

  // 选择打卡类型
  onTypeTap(e) {
    this.setData({ activeType: e.currentTarget.dataset.key })
  },

  // 加载打卡相关数据
  loadData(done) {
    const db = app.getDB()
    if (!db) {
      wx.showToast({ title: '云数据还没准备好', icon: 'none' })
      if (typeof done === 'function') done()
      return
    }

    // 只查自己的打卡记录：统计连续天数、热力图、时间线
    db.collection('checkins')
      .where({ _openid: '{openid}' })
      .orderBy('dateKey', 'desc')
      .limit(100)
      .get()
      .then((res) => {
        const list = res.data || []
        const today = todayKey()
        const todayRecord = list.find((item) => item.dateKey === today)

        // 日期集合，用于热力图和连续天数
        const daySet = {}
        list.forEach((item) => {
          daySet[item.dateKey] = true
        })

        // 连续打卡天数
        const streak = calcStreak(daySet)

        // 热力图：最近 28 天，按日期升序
        const heatmap = []
        for (let i = 27; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const key = toDateKey(d)
          heatmap.push({
            key,
            day: d.getDate(),
            level: daySet[key] ? 2 : 0
          })
        }

        // 时间线：最近 10 条
        const timeline = list.slice(0, 10).map((item) => {
          const conf = CHECKIN_TYPES.find((t) => t.key === item.type)
          return {
            _id: item._id,
            emoji: conf ? conf.emoji : '✅',
            name: conf ? conf.name : '打卡',
            dateKey: item.dateKey
          }
        })

        const typeConf = todayRecord
          ? CHECKIN_TYPES.find((t) => t.key === todayRecord.type)
          : null

        this.setData({
          todayChecked: !!todayRecord,
          todayTypeName: typeConf ? typeConf.name : '',
          streak,
          totalDays: Object.keys(daySet).length,
          heatmap,
          timeline
        })

        this.loadRank()
        if (typeof done === 'function') done()
      })
      .catch((err) => {
        console.error('打卡数据加载失败', err)
        wx.showToast({ title: '加载失败，请检查网络', icon: 'none' })
        if (typeof done === 'function') done()
      })
  },

  // 今日排行榜（每人每天限一次，按打卡时间先后排序）
  loadRank() {
    const db = app.getDB()
    if (!db) return
    const today = todayKey()
    db.collection('checkins')
      .where({ dateKey: today })
      .orderBy('createdAt', 'asc')
      .limit(50)
      .get()
      .then((res) => {
        const rankList = (res.data || []).map((item, index) => {
          const conf = CHECKIN_TYPES.find((t) => t.key === item.type)
          return {
            name: item.nickName || '同学',
            emoji: conf ? conf.emoji : '✅',
            typeName: conf ? conf.name : '打卡'
          }
        })
        this.setData({ rankList })
      })
      .catch((err) => {
        console.error('排行榜加载失败', err)
      })
  },

  // 立即打卡
  onCheckin() {
    if (this.data.submitting) return
    if (this.data.todayChecked) {
      wx.showToast({ title: '今天已经打过卡啦', icon: 'none' })
      return
    }

    const typeConf = CHECKIN_TYPES.find((t) => t.key === this.data.activeType)
    const db = app.getDB()
    if (!db) {
      wx.showToast({ title: '云数据还没准备好', icon: 'none' })
      return
    }
    this.setData({ submitting: true })

    db.collection('checkins')
      .add({
        data: {
          type: this.data.activeType,
          dateKey: todayKey(),
          nickName: app.globalData.nickName,
          campus: app.globalData.campus,
          createdAt: db.serverDate()
        }
      })
      .then(() => {
        this.setData({ submitting: false, showBadge: true })
        wx.vibrateShort({ type: 'light' })
        // 徽章动效 1.6 秒后自动收起
        setTimeout(() => {
          this.setData({ showBadge: false })
        }, 1600)
        this.loadData()
      })
      .catch((err) => {
        console.error('打卡失败', err)
        this.setData({ submitting: false })
        wx.showToast({ title: '打卡失败，请重试', icon: 'none' })
      })
  },

  onShareAppMessage() {
    return {
      title: `我已经连续打卡 ${this.data.streak} 天啦，一起来！`,
      path: '/pages/checkin/checkin'
    }
  }
})
