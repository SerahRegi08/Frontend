// School-scoped identity helpers. Empty school = legacy account,
// treated as wildcard so old data keeps working.
export const normSchool = value =>
  String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

export const sameSchool = (a, b) => {
  const x = normSchool(a)
  const y = normSchool(b)
  return !x || !y || x === y
}

const readProfile = key => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

export const getTeacherProfile = () => readProfile('cognify_teacher_profile')
export const getStudentProfile = () => readProfile('cognify_student_profile')

export const timeAgo = ts => {
  const seconds = Math.max(1, Math.floor((Date.now() - Number(ts)) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export const getApiBase = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:5000`
    }
    // Production default: deployed backend on Vercel
    return 'https://backend-eight-gamma-47.vercel.app'
  }
  return 'https://backend-eight-gamma-47.vercel.app'
}

export const friendlyError = (err, defaultMsg = 'An error occurred') => {
  if (!err) return defaultMsg
  const msg = typeof err === 'string' ? err : err.message || ''
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return 'Could not connect to the Cognify server. Please ensure the backend is running at port 5000.'
  }
  return msg || defaultMsg
}

