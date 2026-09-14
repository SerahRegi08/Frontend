// Separate credential stores per role.
// A teacher account can never open the student side and vice versa,
// because login only ever reads its own role's store.
const ROLE_KEY = {
  teacher: { accounts: 'cognify_teacher_accounts', usernames: 'cognify_teacher_usernames' },
  student: { accounts: 'cognify_student_accounts', usernames: 'cognify_student_usernames' },
}

const normalizeRole = role => String(role || '').toLowerCase() === 'student' ? 'student' : 'teacher'

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function writeArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// One-time migration from the old shared stores. Every existing account
// keeps working on its own side; nothing is deleted.
export function migrateAuthStores() {
  try {
    if (localStorage.getItem('cognify_auth_migrated_v1')) return
    const oldAccounts = readArray('cognify_accounts')
    const oldUsernames = readArray('cognify_usernames')
    if (oldAccounts.length === 0 && oldUsernames.length === 0) {
      localStorage.setItem('cognify_auth_migrated_v1', 'done')
      return
    }
    const byRole = { teacher: [], student: [] }
    oldAccounts.forEach(account => {
      byRole[normalizeRole(account.role)].push(account)
    })
    const accountNames = new Set()
    byRole.teacher.forEach(a => { if (a.username) accountNames.add(String(a.username).toLowerCase()) })
    byRole.student.forEach(a => { if (a.username) accountNames.add(String(a.username).toLowerCase()) })
    // Usernames with no matching account stay reserved on both sides,
    // exactly like the old global reservation behaved.
    const orphanNames = oldUsernames.filter(name => !accountNames.has(String(name).toLowerCase()))
    writeArray(ROLE_KEY.teacher.accounts, [...readArray(ROLE_KEY.teacher.accounts), ...byRole.teacher])
    writeArray(ROLE_KEY.student.accounts, [...readArray(ROLE_KEY.student.accounts), ...byRole.student])
    writeArray(ROLE_KEY.teacher.usernames, [...readArray(ROLE_KEY.teacher.usernames), ...byRole.teacher.map(a => a.username).filter(Boolean), ...orphanNames])
    writeArray(ROLE_KEY.student.usernames, [...readArray(ROLE_KEY.student.usernames), ...byRole.student.map(a => a.username).filter(Boolean), ...orphanNames])
    localStorage.setItem('cognify_auth_migrated_v1', 'done')
  } catch {
    // storage unavailable — login keeps working in memory for this session
  }
}

migrateAuthStores()

export function getRoleAccounts(role) {
  return readArray(ROLE_KEY[normalizeRole(role)].accounts)
}

export function saveRoleAccount(role, account) {
  const key = ROLE_KEY[normalizeRole(role)].accounts
  writeArray(key, [...readArray(key), account])
}

export function getRoleUsernames(role) {
  return readArray(ROLE_KEY[normalizeRole(role)].usernames)
}

export function saveRoleUsername(role, username) {
  const key = ROLE_KEY[normalizeRole(role)].usernames
  writeArray(key, [...readArray(key), username])
}

export function updateRoleAccount(role, username, patch) {
  const key = ROLE_KEY[normalizeRole(role)].accounts
  const uname = String(username || '').toLowerCase()
  const next = readArray(key).map(account =>
    String(account.username || '').toLowerCase() === uname ? { ...account, ...patch } : account
  )
  writeArray(key, next)
  return next.find(account => String(account.username || '').toLowerCase() === uname) || null
}
