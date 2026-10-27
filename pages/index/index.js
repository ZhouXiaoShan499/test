// pages/index/index.js
const app = getApp()
const {
  CHECKIN_TYPES,
  CAMPUS_LIST,
  todayKey,
  calcStreak
} = require('../../utils/common')

// 快捷入口
const QUICK_ENTRIES = [
  { key: 'checkin', name: '打卡', emoji: '✅', url: '/pages/checkin/checkin' },
  { key: 'note', name: '记笔记', emoji: '✍️', url: '/pages/note-detail/note-detail' },
  { key: 'timetable', name: '课表', emoji: '🗓️', url: '/pages/campus/campus' },
  { key: 'market', name: '二手', emoji: '🛍️', url: '/pages/campus/campus' },
  { key: 'activity', name: '活动报名', emoji: '🎪', url: '/pages/campus/campus' }
]

Page({
  data: {
    campus: '东湖校区',
    campusList: CAMPUS_LIST,
    nickName: '同学',
    checkinTypes: CHECKIN_TYPES,
    quickEntries: QUICK_ENTRIES,
    todayChecked: false,
    todayTypeName: '',
    streak: 0,
    noteCount: 0,
    latestNote: null,
    activities: [],
    hotNotes: [],
    rankList: []
  },

  onLoad() {
    this.setData({
      campus: app.globalData.campus,
      nickName: app.globalData.nickName
    })
  },

  onShow() {
    // 每次回到首页都刷新数据，保证打卡后状态同步
    this.setData({ campus: app.globalData.campus })
    this.loadAll()
  },

  onPullDownRefresh() {
    this.loadAll(() => wx.stopPullDownRefresh())
  },

  // 一次性加载首页需要的所有数据
  loadAll(done) {
    const db = app.getDB()
    if (!db) {
      if (typeof done === 'function') done()
      return
    }

    Promise.all([
      this.loadMyCheckins(db),
      this.loadMyNotes(db),
      this.loadActivities(db),
      this.loadHotNotes(db),
      this.loadRank(db)
    ])
      .catch((err) => {
        console.error('首页数据加载失败', err)
      })
      .then(() => {
        if (typeof done === 'function') done()
      })
  },

  // 我的打卡：判断今天是否已打卡 + 计算连续天数（只查自己的记录）
  loadMyCheckins(db) {
    return db
      .collection('checkins')
      .where({ _openid: '{openid}' })
      .orderBy('dateKey', 'desc')
      .limit(100)
      .get()
      .then((res) => {
        const list = res.data || []
        const today = todayKey()
        const todayRecord = list.find((item) => item.dateKey === today)

        // 用日期集合计算连续打卡天数
        const daySet = {}
        list.forEach((item) => {
          daySet[item.dateKey] = true
        })
        const streak = calcStreak(daySet)

        const typeConf = todayRecord
          ? CHECKIN_TYPES.find((t) => t.key === todayRecord.type)
          : null

        this.setData({
          todayChecked: !!todayRecord,
          todayTypeName: typeConf ? typeConf.name : '',
          streak
        })
      })
  },

  // 我的笔记数量 + 最近一条（只查自己的笔记）
  loadMyNotes(db) {
    return db
      .collection('notes')
      .where({ _openid: '{openid}' })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
      .then((res) => {
        const list = (res.data || []).filter((n) => !n.deletedAt)
        this.setData({
          noteCount: list.length,
          latestNote: list.length ? list[0] : null
        })
      })
  },

  // 最近校区活动
  loadActivities(db) {
    return db
      .collection('activities')
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get()
      .then((res) => {
        this.setData({ activities: res.data || [] })
      })
  },

  // 热门公开笔记
  loadHotNotes(db) {
    return db
      .collection('notes')
      .where({ isPublic: true })
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get()
      .then((res) => {
        this.setData({ hotNotes: res.data || [] })
      })
  },

  // 今日打卡排行榜（每人每天限一次，按打卡时间先后排序）
  loadRank(db) {
    const today = todayKey()
    return db
      .collection('checkins')
      .where({ dateKey: today })
      .orderBy('createdAt', 'asc')
      .limit(50)
      .get()
      .then((res) => {
        const rankList = (res.data || []).map((item) => {
          const conf = CHECKIN_TYPES.find((t) => t.key === item.type)
          return {
            name: item.nickName || '同学',
            emoji: conf ? conf.emoji : '✅',
            typeName: conf ? conf.name : '打卡'
          }
        })
        this.setData({ rankList })
      })
  },

  // 切换校区
  onCampusChange(e) {
    const index = Number(e.detail.value)
    const name = this.data.campusList[index]
    app.setCampus(name)
    this.setData({ campus: name })
    wx.showToast({ title: `已切换到${name}`, icon: 'none' })
    this.loadAll()
  },

  // 快捷入口跳转
  onQuickTap(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.navigateTo({ url })
  },

  // 去打卡页
  goCheckin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' })
  },

  // 去笔记列表
  goNotes() {
    wx.switchTab({ url: '/pages/notes/notes' })
  },

  // 去校区页
  goCampus() {
    wx.switchTab({ url: '/pages/campus/campus' })
  },

  // 打开笔记详情
  openNote(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/note-detail/note-detail?id=${id}` })
  },

  // 搜索（先给个提示，后续可扩展）
  onSearchTap() {
    wx.showToast({ title: '去「笔记」页搜索吧', icon: 'none' })
  },

  onMessageTap() {
    wx.showToast({ title: '暂无新消息', icon: 'none' })
  },

  onShareAppMessage() {
    return {
      title: '校园笔记 · 一起打卡记录',
      path: '/pages/index/index'
    }
  }
})
