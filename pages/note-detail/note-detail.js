// pages/note-detail/note-detail.js
const app = getApp()
const { ALL_TAGS, CAMPUS_LIST, formatDate } = require('../../utils/common')

Page({
  data: {
    mode: 'create', // create | view | edit
    noteId: '',
    title: '',
    content: '',
    images: [],
    tags: ALL_TAGS,
    selectedTags: [],
    campus: '',
    campusList: CAMPUS_LIST,
    isPublic: true,
    authorName: '',
    dateText: '',
    likeCount: 0,
    isMine: false,
    saving: false,
    autoSaveTip: '',
    // 工具栏状态
    boldOn: false,
    listOn: false
  },

  onLoad(options) {
    const campus = app.globalData.campus
    if (options && options.id) {
      this.setData({ mode: 'view', noteId: options.id, campus })
      this.loadNote(options.id)
    } else {
      this.setData({ mode: 'create', campus })
    }
  },

  // 读取笔记详情
  loadNote(id) {
    const db = app.getDB()
    if (!db) {
      wx.showToast({ title: '云数据还没准备好', icon: 'none' })
      return
    }
    db.collection('notes')
      .doc(id)
      .get()
      .then((res) => {
        const note = res.data || {}
        // 判断是否本人笔记（用于控制编辑权限）
        const isMine = note._openid === '{openid}'
        this.setData({
          title: note.title || '',
          content: note.content || '',
          images: note.images || [],
          selectedTags: note.tags || [],
          campus: note.campus || app.globalData.campus,
          isPublic: note.isPublic !== false,
          authorName: note.authorName || '同学',
          likeCount: note.likeCount || 0,
          isMine,
          dateText: formatDate(note.createdAt)
        })
      })
      .catch((err) => {
        console.error('笔记读取失败', err)
        wx.showToast({ title: '笔记不存在或无权查看', icon: 'none' })
      })
  },

  // 进入编辑模式（仅本人）
  onEdit() {
    if (!this.data.isMine) {
      wx.showToast({ title: '只能编辑自己的笔记', icon: 'none' })
      return
    }
    this.setData({ mode: 'edit' })
    wx.setNavigationBarTitle({ title: '编辑笔记' })
  },

  // 标题输入
  onTitleInput(e) {
    this.setData({ title: e.detail.value })
    this.markAutoSave()
  },

  // 正文输入
  onContentInput(e) {
    this.setData({ content: e.detail.value })
    this.markAutoSave()
  },

  // 自动保存提示
  markAutoSave() {
    if (this.data.mode !== 'create') return
    this.setData({ autoSaveTip: '内容已暂存' })
    if (this._tipTimer) clearTimeout(this._tipTimer)
    this._tipTimer = setTimeout(() => {
      this.setData({ autoSaveTip: '' })
    }, 1500)
  },

  // 标签选择
  onTagTap(e) {
    const tag = e.currentTarget.dataset.tag
    const selected = this.data.selectedTags.slice()
    const idx = selected.indexOf(tag)
    if (idx > -1) {
      selected.splice(idx, 1)
    } else {
      selected.push(tag)
    }
    this.setData({ selectedTags: selected })
  },

  // 校区选择
  onCampusChange(e) {
    const index = Number(e.detail.value)
    this.setData({ campus: this.data.campusList[index] })
  },

  // 公开 / 私密切换
  onPrivacyChange(e) {
    this.setData({ isPublic: e.detail.value })
  },

  // 工具栏：加粗（在正文末尾插入加粗标记）
  onBold() {
    const next = !this.data.boldOn
    this.setData({
      boldOn: next,
      content: next ? this.data.content + '**加粗文字**' : this.data.content
    })
  },

  // 工具栏：列表
  onList() {
    const next = !this.data.listOn
    this.setData({
      listOn: next,
      content: next ? this.data.content + '\n- 列表项' : this.data.content
    })
  },

  // 工具栏：插入图片（真正上传到云存储）
  onImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file) return
        const ext = (file.tempFilePath.match(/\.(\w+)$/) || [])[1] || 'jpg'
        const cloudPath = `notes/${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`

        wx.showLoading({ title: '上传中…' })
        wx.cloud.uploadFile({
          cloudPath,
          filePath: file.tempFilePath,
          success: (upRes) => {
            wx.hideLoading()
            const images = this.data.images.concat(upRes.fileID)
            this.setData({ images })
            this.markAutoSave()
            wx.showToast({ title: '图片已插入', icon: 'none' })
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('图片上传失败', err)
            wx.showToast({ title: '图片上传失败', icon: 'none' })
          }
        })
      },
      fail: () => {}
    })
  },

  // 工具栏：附件
  onAttach() {
    this.setData({ content: this.data.content + '\n[附件]' })
    wx.showToast({ title: '已插入附件占位', icon: 'none' })
  },

  // 保存笔记
  onSave() {
    const title = (this.data.title || '').trim()
    const content = (this.data.content || '').trim()

    if (!title) {
      wx.showToast({ title: '请先写个标题', icon: 'none' })
      return
    }
    if (!content) {
      wx.showToast({ title: '正文还没写哦', icon: 'none' })
      return
    }
    if (this.data.saving) return

    const db = app.getDB()
    if (!db) {
      wx.showToast({ title: '云数据还没准备好', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    const noteData = {
      title,
      content,
      tags: this.data.selectedTags,
      campus: this.data.campus,
      isPublic: this.data.isPublic,
      images: this.data.images
    }

    if (this.data.mode === 'create') {
      db.collection('notes')
        .add({
          data: Object.assign({}, noteData, {
            authorName: app.globalData.nickName,
            likeCount: 0,
            createdAt: db.serverDate()
          })
        })
        .then(() => {
          this.setData({ saving: false })
          wx.showToast({ title: '保存成功', icon: 'success' })
          setTimeout(() => {
            wx.navigateBack()
          }, 800)
        })
        .catch((err) => {
          console.error('保存失败', err)
          this.setData({ saving: false })
          wx.showToast({ title: '保存失败，请重试', icon: 'none' })
        })
    } else {
      // 越权校验：只有本人才能更新自己的笔记
      if (!this.data.isMine) {
        wx.showToast({ title: '只能编辑自己的笔记', icon: 'none' })
        return
      }
      db.collection('notes')
        .doc(this.data.noteId)
        .update({
          data: Object.assign({}, noteData, {
            updatedAt: db.serverDate()
          })
        })
        .then(() => {
          this.setData({ saving: false, mode: 'view' })
          wx.setNavigationBarTitle({ title: '笔记' })
          wx.showToast({ title: '已更新', icon: 'success' })
        })
        .catch((err) => {
          console.error('更新失败', err)
          this.setData({ saving: false })
          wx.showToast({ title: '更新失败，请重试', icon: 'none' })
        })
    }
  },

  // 点赞
  onLike() {
    if (this.data.mode !== 'view') return
    const db = app.getDB()
    if (!db) {
      wx.showToast({ title: '云数据还没准备好', icon: 'none' })
      return
    }
    const _ = db.command
    db.collection('notes')
      .doc(this.data.noteId)
      .update({
        data: { likeCount: _.inc(1) }
      })
      .then(() => {
        this.setData({ likeCount: this.data.likeCount + 1 })
        wx.showToast({ title: '已点赞', icon: 'none' })
      })
      .catch((err) => {
        console.error('点赞失败', err)
        wx.showToast({ title: '点赞失败', icon: 'none' })
      })
  },

  // 收藏（本地记录）
  onCollect() {
    const id = this.data.noteId
    if (!id) return
    const list = wx.getStorageSync('collectNotes') || []
    if (list.indexOf(id) > -1) {
      wx.showToast({ title: '已经收藏过啦', icon: 'none' })
      return
    }
    list.push(id)
    wx.setStorageSync('collectNotes', list)
    wx.showToast({ title: '已收藏', icon: 'success' })
  },

  // 评论（先给提示）
  onComment() {
    wx.showToast({ title: '评论功能即将上线', icon: 'none' })
  },

  // 预览图片
  onPreviewImage(e) {
    const src = e.currentTarget.dataset.src
    if (!src) return
    wx.previewImage({
      current: src,
      urls: this.data.images
    })
  },

  onShareAppMessage() {
    return {
      title: this.data.title || '校园笔记',
      path: `/pages/note-detail/note-detail?id=${this.data.noteId}`
    }
  }
})
