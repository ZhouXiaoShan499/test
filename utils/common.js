// utils/common.js —— 全局公共工具
// 把多个页面重复的常量与函数收拢到这里，避免改一处漏三处。

// 打卡类型配置（首页、打卡页共用）
const CHECKIN_TYPES = [
  { key: 'early', name: '早起', emoji: '🌅' },
  { key: 'study', name: '自习', emoji: '📖' },
  { key: 'sport', name: '运动', emoji: '🏃' },
  { key: 'read', name: '读书', emoji: '📚' },
  { key: 'water', name: '喝水', emoji: '💧' }
]

// 校区列表（首页、笔记、校区、个人中心共用）
const CAMPUS_LIST = ['东湖校区', '南山校区', '西溪校区']

// 笔记标签（笔记列表页「全部」为首项，编辑页不带「全部」）
const ALL_TAGS = ['学习', '生活', '社团', '考试', '读书', '美食']

// 把 Date 转成 YYYY-MM-DD（本地时区）
function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 今天的日期 key
function todayKey() {
  return toDateKey(new Date())
}

// 计算连续打卡天数
// daySet: { 'YYYY-MM-DD': true } 的打卡日期集合
function calcStreak(daySet) {
  let streak = 0
  const cursor = new Date()
  // 今天还没打卡，则从昨天开始往前数
  if (!daySet[toDateKey(cursor)]) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (daySet[toDateKey(cursor)]) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// 把日期值格式化成 YYYY-MM-DD（兼容 Date 对象 / 时间戳 / 字符串）
function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 把日期值格式化成 MM-DD（列表页展示用）
function formatShortDate(value) {
  const full = formatDate(value)
  return full ? full.slice(5) : ''
}

module.exports = {
  CHECKIN_TYPES,
  CAMPUS_LIST,
  ALL_TAGS,
  toDateKey,
  todayKey,
  calcStreak,
  formatDate,
  formatShortDate
}
