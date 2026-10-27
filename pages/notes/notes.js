// pages/notes/notes.js
const app = getApp()
const { formatShortDate } = require('../../utils/common')

// 常用标签
const ALL_TAGS = ['全部', '学习', '生活', '社团', '考试', '读书', '美食']

// 每页数量
const PAGE_SIZE = 20

Page({
  data: {
    tags: ALL_TAGS,
    activeTag: '全部',
    keyword: '',
    viewMode: 'card', // card | list
    notes: [],
    loaded: false,
    loadingMore: false,
    hasMore: true
  },

  onLoad() {
    // 首次加载；onShow 会在 onLoad 后立刻触发，为避免双请求，用标志位区分
    this._loadedOnce = false
  },

  onShow() {
    // 从编辑页返回时刷新；首次进入由 onShow 统一触发即可，避免 onLoad+onShow 双请求
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    this.loadMore()
  },

  // 刷新：重置到第一页
  refresh(done) {
    this._page = 0
    this.setData({ hasMore: true, loaded: false })
    this.fetchNotes(0, (list) => {
      this.setData({ notes: list, loaded: true })
      if (typeof done === 'function') done()
    })
  },

  // 加载更多：追加下一页
  loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return
    const nextPage = (this._page || 0) + 1
    this.setData({ loadingMore: true })
    this.fetchNotes(nextPage, (list) => {
      if (!list.length) {
        this.setData({ hasMore: false, loadingMore: false })
        return
      }
      // 追加并去重
      const merged = this.mergeNotes(this.data.notes.concat(list))
      this.setData({
        notes: merged,
        loadingMore: false,
        hasMore: list.length >= PAGE_SIZE
      })
    })
  },

  // 抓取一页笔记：公开笔记 + 自己的笔记
  fetchNotes(page, cb) {
    const db = app.getDB()
    if (!db) {
      cb([])
      return
    }
    const skip = page * PAGE_SIZE

    // 1. 公开笔记
    const publicTask = db
      .collection('notes')
      .where({ isPublic: true })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .get()
      .then((res) => res.data || [])
      .catch((err) => {
        console.error('公开笔记加载失败', err)
        return []
      })

    // 2. 我自己的笔记（含私密，只查自己的）
    const mineTask = db
      .collection('notes')
      .where({ _openid: '{openid}' })
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(PAGE_SIZE)
      .get()
      .then((res) => res.data || [])
      .catch((err) => {
        console.error('我的笔记加载失败', err)
        return []
      })

    Promise.all([publicTask, mineTask]).then((results) => {
      const merged = this.mergeNotes(results[0].concat(results[1]))
      const filtered = this.filterNotes(merged)
      this._page = page
      cb(filtered)
    })
  },

  // 合并两组笔记并按 _id 去重，按时间倒序
  mergeNotes(list) {
    const map = {}
    const result = []
    list.forEach((n) => {
      if (!n || !n._id) return
      if (n.deletedAt) return
      if (map[n._id]) return
      map[n._id] = true
      result.push(n)
    })
    result.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime() || 0
      const tb = new Date(b.createdAt).getTime() || 0
      return tb - ta
    })
    return result
  },

  // 前端按标签和关键词过滤
  filterNotes(list) {
    const { activeTag, keyword } = this.data
    let result = list

    if (activeTag && activeTag !== '全部') {
      result = result.filter(
        (n) => Array.isArray(n.tags) && n.tags.indexOf(activeTag) > -1
      )
    }

    const kw = (keyword || '').trim()
    if (kw) {
      result = result.filter((n) => {
        const title = n.title || ''
        const content = n.content || ''
        return title.indexOf(kw) > -1 || content.indexOf(kw) > -1
      })
    }

    // 补上展示用的摘要
    return result.map((n) => {
      const content = n.content || ''
      return Object.assign({}, n, {
        summary: content.length > 60 ? content.slice(0, 60) + '…' : content,
        dateText: formatShortDate(n.createdAt)
      })
    })
  },

  // 搜索输入（防抖 300ms）
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value })
    if (this._searchTimer) clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => {
      this.refresh()
    }, 300)
  },

  onSearchConfirm() {
    if (this._searchTimer) clearTimeout(this._searchTimer)
    this.refresh()
  },

  // 标签筛选
  onTagTap(e) {
    this.setData({ activeTag: e.currentTarget.dataset.tag })
    this.refresh()
  },

  // 切换视图
  onViewToggle(e) {
    this.setData({ viewMode: e.currentTarget.dataset.mode })
  },

  // 打开笔记详情
  openNote(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/note-detail/note-detail?id=${id}` })
  },

  // 写新笔记
  goCreate() {
    wx.navigateTo({ url: '/pages/note-detail/note-detail' })
  },

  onShareAppMessage() {
    return {
      title: '校园笔记 · 一起记录校园生活',
      path: '/pages/notes/notes'
    }
  }
})
