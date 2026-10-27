// pages/mine/mine.js
const app = getApp()
const { todayKey, calcStreak } = require('../../utils/common')

Page({
  data: {
    nickName: '同学',
    campus: '东湖校区',
    avatarText: '同',
    streak: 0,
    noteCount: 0,
    checkinCount: 0,
    collectCount: 0,
    menuList: [
      { key: 'checkin', name: '我的打卡', emoji: '✅' },
      { key: 'notes', name: '我的笔记', emoji: '📝' },
      { key: 'collect', name: '我的收藏', emoji: '⭐' },
      { key: 'signup', name: '我的报名', emoji: '🎪' }
    ],
    settingList: [
      { key: 'nickname', name: '修改昵称', emoji: '👤' },
      { key: 'privacy', name: '隐私设置', emoji: '🔒' },
      { key: 'feedback', name: '意见反馈', emoji: '💬' }
    ]
  },

  onLoad() {
    this.refreshBase()
  },

  onShow() {
    this.refreshBase()
    this.loadStats()
  },

  onPullDownRefresh() {
    this.loadStats(() => wx.stopPullDownRefresh())
  },

  refreshBase() {
    const nickName = app.globalData.nickName || '同学'
    this.setData({
      nickName,
      campus: app.globalData.campus,
      avatarText: nickName.slice(0, 1)
    })
  },

  // 统计：连续打卡、笔记数、打卡总数、收藏数
  loadStats(done) {
    const collectList = wx.getStorageSync('collectNotes') || []
    this.setData({ collectCount: collectList.length })

    const db = app.getDB()
    if (!db) {
      if (typeof done === 'function') done()
      return
    }

    Promise.all([
      db.collection('checkins').where({ _openid: '{openid}' }).orderBy('dateKey', 'desc').limit(100).get(),
      db.collection('notes').where({ _openid: '{openid}' }).orderBy('createdAt', 'desc').limit(20).get()
    ])
      .then((results) => {
        const checkins = results[0].data || []
        const notes = (results[1].data || []).filter((n) => !n.deletedAt)

        const daySet = {}
        checkins.forEach((item) => {
          daySet[item.dateKey] = true
        })

        const streak = calcStreak(daySet)

        this.setData({
          streak,
          checkinCount: Object.keys(daySet).length,
          noteCount: notes.length
        })
        if (typeof done === 'function') done()
      })
      .catch((err) => {
        console.error('统计加载失败', err)
        if (typeof done === 'function') done()
      })
  },

  // 菜单点击
  onMenuTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'checkin') {
      wx.navigateTo({ url: '/pages/checkin/checkin' })
    } else if (key === 'notes') {
      wx.switchTab({ url: '/pages/notes/notes' })
    } else if (key === 'collect') {
      wx.showToast({ title: `已收藏 ${this.data.collectCount} 篇笔记`, icon: 'none' })
    } else {
      wx.showToast({ title: '还没有报名记录', icon: 'none' })
    }
  },

  // 设置项点击
  onSettingTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'nickname') {
      this.editNickName()
    } else if (key === 'privacy') {
      wx.showToast({ title: '笔记可在编辑页设为私密', icon: 'none' })
    } else {
      wx.showToast({ title: '感谢你的反馈！', icon: 'none' })
    }
  },

  // 修改昵称
  editNickName() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '输入新昵称',
      content: this.data.nickName,
      success: (res) => {
        if (res.confirm && res.content) {
          const name = res.content.trim().slice(0, 12)
          if (!name) return
          app.setNickName(name)
          this.refreshBase()
          wx.showToast({ title: '已修改', icon: 'success' })
        }
      }
    })
  },

  onShareAppMessage() {
    return {
      title: '校园笔记 · 一起打卡记录',
      path: '/pages/index/index'
    }
  }
})
