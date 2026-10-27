import React, { useEffect, useMemo, useState } from 'react'
import './shome.css'
import { getStudentProfile, sameSchool, timeAgo, getApiBase, friendlyError } from './profile'
import { getRoleAccounts, updateRoleAccount } from './authStore'

const schoolParam = () => {
  const school = getStudentProfile().school || ''
  return school ? `&school=${encodeURIComponent(school)}` : ''
}

const DEFAULT_CLASSES = [
  { classId: 'class-10a', className: 'Class 10A' },
  { classId: 'class-10b', className: 'Class 10B' },
  { classId: 'class-9a', className: 'Class 9A' },
  { classId: 'class-9b', className: 'Class 9B' },
]

const loadLocalClasses = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('cognify_classList_v1') || 'null')
    if (Array.isArray(saved) && saved.length > 0) {
      return saved
        .map(item => ({
          classId: item.id || item.classId,
          className: item.name || item.className || item.id,
        }))
        .filter(c => c.classId && c.className)
    }
  } catch { /* fallback */ }
  return []
}

const API_BASE = getApiBase()
const LEVEL_LABEL = { above: 'Above average', average: 'Average', below: 'Below average' }
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const PRIORITY_ORDER = ['high', 'medium', 'low']
const TOPIC_STATUS = ['todo', 'doing', 'done']
const TOPIC_STATUS_LABEL = { todo: 'To learn', doing: 'Learning', done: 'Done' }

const firstNameOf = student => {
  const full = String(student.fullName || '').trim()
  if (full) return full.split(/\s+/)[0]
  return String(student.username || student.email || 'Student').split(/[@.]/)[0]
}

const greetingFor = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const toDateStr = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const todayStr = () => {
  const now = new Date()
  return toDateStr(now.getFullYear(), now.getMonth(), now.getDate())
}

function StudentHome({ student, onLogout }) {
  const uid = String(student.username || student.email || 'student').toLowerCase()
  const [activeView, setActiveView] = useState('subjects')
  const [viewHistory, setViewHistory] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuClosing, setMenuClosing] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)
  const [pfAccount, setPfAccount] = useState(null)
  const [pfName, setPfName] = useState('')
  const [pfSchool, setPfSchool] = useState('')
  const [pfBoard, setPfBoard] = useState('')
  const [pfClassName, setPfClassName] = useState('')
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pfMsg, setPfMsg] = useState('')
  const [pfError, setPfError] = useState('')

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('cognify_theme')
      if (saved === 'light' || saved === 'dark') return saved
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    } catch { /* default below */ }
    return 'light'
  })

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('cognify_theme', theme)
    } catch { /* non-critical */ }
  }, [theme])

  const [subjects, setSubjects] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cognify_subjects_${uid}`) || 'null')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [records, setRecords] = useState([])
  const [worksheets, setWorksheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewingWorksheet, setViewingWorksheet] = useState(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifSeen, setNotifSeen] = useState(() => {
    try {
      return Number(localStorage.getItem(`cognify_student_notif_seen_${uid}`) || 0)
    } catch {
      return 0
    }
  })
  const [notifAssignments, setNotifAssignments] = useState([])
  const [notifSubmissions, setNotifSubmissions] = useState([])
  const [subjectScans, setSubjectScans] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cognify_subject_scans_${uid}`) || 'null')
      return saved && typeof saved === 'object' ? saved : {}
    } catch {
      return {}
    }
  })

  // Self-scan state (per subject)
  const [scanFile, setScanFile] = useState(null)
  const [scanPreview, setScanPreview] = useState(null)
  const [questionFile, setQuestionFile] = useState(null)
  const [questionPreview, setQuestionPreview] = useState(null)
  const [scanClassId, setScanClassId] = useState('')
  const [scanName, setScanName] = useState(
    String(student.fullName || student.username || student.email || '')
  )
  const [scanState, setScanState] = useState('idle')
  const [scanError, setScanError] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [allClassNames, setAllClassNames] = useState(() => {
    const local = loadLocalClasses()
    return local.length > 0 ? local : DEFAULT_CLASSES
  })

  // My assignments (from teacher, by class)
  const [allAssignments, setAllAssignments] = useState([])
  const [mySubmissions, setMySubmissions] = useState([])
  const [submitFiles, setSubmitFiles] = useState({})
  const [submittingId, setSubmittingId] = useState(null)
  const [submitError, setSubmitError] = useState('')

  // Calendar (student's own)
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [events, setEvents] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cognify_student_events_${uid}`) || 'null')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventNote, setNewEventNote] = useState('')

  // To-do (student's own)
  const [todos, setTodos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cognify_student_todos_${uid}`) || 'null')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const [newTodoText, setNewTodoText] = useState('')
  const [newTodoPriority, setNewTodoPriority] = useState('medium')

  // Topics management: custom topics + per-topic status
  const [customTopics, setCustomTopics] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cognify_student_topics_${uid}`) || 'null')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const [topicStatus, setTopicStatus] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cognify_student_topic_status_${uid}`) || 'null')
      return saved && typeof saved === 'object' ? saved : {}
    } catch {
      return {}
    }
  })
  const [newTopicName, setNewTopicName] = useState('')

  // Daily tasks (fresh list every day)
  const todayKey = todayStr()
  const [dailyTasks, setDailyTasks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cognify_student_daily_${uid}_${todayKey}`) || 'null')
      return Array.isArray(saved) ? saved : []
    } catch {
      return []
    }
  })
  const [newDailyText, setNewDailyText] = useState('')
  const [dailyPlan, setDailyPlan] = useState(null)
  const [planState, setPlanState] = useState('idle')
  const [planError, setPlanError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(`cognify_subjects_${uid}`, JSON.stringify(subjects))
    } catch { /* tiny data — app keeps working in memory */ }
  }, [subjects, uid])

  useEffect(() => {
    try {
      localStorage.setItem(`cognify_subject_scans_${uid}`, JSON.stringify(subjectScans))
    } catch { /* tiny data — app keeps working in memory */ }
  }, [subjectScans, uid])

  useEffect(() => {
    try {
      localStorage.setItem(`cognify_student_events_${uid}`, JSON.stringify(events))
    } catch { /* tiny data — app keeps working in memory */ }
  }, [events, uid])

  useEffect(() => {
    try {
      localStorage.setItem(`cognify_student_todos_${uid}`, JSON.stringify(todos))
    } catch { /* tiny data — app keeps working in memory */ }
  }, [todos, uid])

  useEffect(() => {
    try {
      localStorage.setItem(`cognify_student_topics_${uid}`, JSON.stringify(customTopics))
    } catch { /* tiny data */ }
  }, [customTopics, uid])

  useEffect(() => {
    try {
      localStorage.setItem(`cognify_student_topic_status_${uid}`, JSON.stringify(topicStatus))
    } catch { /* tiny data */ }
  }, [topicStatus, uid])

  useEffect(() => {
    try {
      localStorage.setItem(`cognify_student_daily_${uid}_${todayKey}`, JSON.stringify(dailyTasks))
    } catch { /* tiny data */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyTasks])

  useEffect(() => {
    const candidates = [student.fullName, student.username, student.email].filter(Boolean)
    const load = async () => {
      for (const name of candidates) {
        try {
          const response = await fetch(`${API_BASE}/api/students/lookup?name=${encodeURIComponent(name)}${schoolParam()}`)
          if (!response.ok) continue
          const data = await response.json()
          if (data.matches && data.matches.length > 0) {
            setRecords(data.matches)
            setWorksheets(data.worksheets || [])
            setScanName(name)
            break
          }
        } catch {
          // backend down — dashboard still works, data section stays empty
        }
      }
      setLoading(false)
    }
    load()
  }, [student.email, student.fullName, student.username])

  // Assignments given to my classes + my submissions.
  useEffect(() => {
    if (activeView !== 'assignments') return
    const candidates = [student.fullName, student.username, student.email].filter(Boolean)
    const load = async () => {
      let classes = []
      for (const name of candidates) {
        try {
          const response = await fetch(`${API_BASE}/api/students/classes?name=${encodeURIComponent(name)}${schoolParam()}`)
          if (!response.ok) continue
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            classes = data.map(item => ({ id: item.id, name: item.name }))
            break
          }
        } catch { /* backend down — assignments stay empty */ }
      }
      if (classes.length === 0) {
        const seen = new Map()
        records.forEach(record => {
          if (record.classId && !seen.has(record.classId)) seen.set(record.classId, record.className || record.classId)
        })
        classes = [...seen.entries()].map(([id, name]) => ({ id, name }))
      }
      try {
        const response = await fetch(`${API_BASE}/api/assignments`)
        if (response.ok) {
          const list = await response.json()
          if (Array.isArray(list)) {
            const ids = new Set(classes.map(item => item.id))
            setAllAssignments(list.filter(item => ids.has(item.classId) && sameSchool(item.school, getStudentProfile().school)).sort((a, b) => b.createdAt - a.createdAt))
          }
        }
      } catch { /* backend down */ }
      try {
        const who = scanName.trim() || candidates[0] || ''
        if (!who) return
        const response = await fetch(`${API_BASE}/api/submissions?student=${encodeURIComponent(who)}`)
        if (response.ok) {
          const list = await response.json()
          if (Array.isArray(list)) setMySubmissions(list)
        }
      } catch { /* backend down */ }
    }
    load()
  }, [activeView, records, scanName, student.email, student.fullName, student.username])

  const handleSubmitAssignment = async assignment => {
    const file = submitFiles[assignment.id]
    if (!file) {
      setSubmitError('Choose a file first.')
      return
    }
    if (!scanName.trim()) {
      setSubmitError('Your name is missing — log out and back in.')
      return
    }
    setSubmittingId(assignment.id)
    setSubmitError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('assignmentId', assignment.id)
      formData.append('studentName', scanName.trim())
      const response = await fetch(`${API_BASE}/api/submissions`, { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not submit')
      setMySubmissions(current => [...current.filter(record => record.assignmentId !== assignment.id), data])
      setSubmitFiles(current => {
        const next = { ...current }
        delete next[assignment.id]
        return next
      })
    } catch (error) {
      setSubmitError(friendlyError(error, 'Could not submit'))
    }
    setSubmittingId(null)
  }

  const recordClasses = useMemo(() => {
    const seen = new Map()
    records.forEach(record => {
      if (record.classId && !seen.has(record.classId)) {
        seen.set(record.classId, record.className || record.classId)
      }
    })
    return [...seen.entries()].map(([classId, className]) => ({ classId, className }))
  }, [records])

  // Always fetch class list from backend with fallback to localStorage & starter defaults
  useEffect(() => {
    let active = true
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/classes/names`)
        if (response.ok) {
          const data = await response.json()
          if (active && Array.isArray(data) && data.length > 0) {
            setAllClassNames(data.map(item => ({
              classId: item.id || item.classId,
              className: item.name || item.className,
            })))
            return
          }
        }
      } catch { /* fallback to /api/classes */ }

      try {
        const response = await fetch(`${API_BASE}/api/classes`)
        if (response.ok) {
          const data = await response.json()
          if (active && Array.isArray(data) && data.length > 0) {
            setAllClassNames(data.map(item => ({
              classId: item.id || item.classId,
              className: item.name || item.className,
            })))
            return
          }
        }
      } catch { /* fallback to local storage */ }

      if (active) {
        const local = loadLocalClasses()
        setAllClassNames(local.length > 0 ? local : DEFAULT_CLASSES)
      }
    }

    fetchClasses()
    return () => { active = false }
  }, [])

  // Comprehensive, deduplicated class options: enrolled classes + profile class + all available classes
  const classOptions = useMemo(() => {
    const map = new Map()

    // 1. Enrolled/past classes from student records
    records.forEach(record => {
      const id = record.classId
      const name = record.className || record.classId
      if (id && name) map.set(id, { classId: id, className: name })
    })

    // 2. Class from student profile if present
    const profileClass = student.className || getStudentProfile().className
    if (profileClass) {
      const match = allClassNames.find(
        c => c.className.toLowerCase() === profileClass.toLowerCase() || c.classId === profileClass
      )
      if (match) {
        map.set(match.classId, { classId: match.classId, className: match.className })
      } else {
        map.set(profileClass, { classId: profileClass, className: profileClass })
      }
    }

    // 3. All classes from backend / localStorage
    allClassNames.forEach(c => {
      if (c.classId && c.className && !map.has(c.classId)) {
        map.set(c.classId, { classId: c.classId, className: c.className })
      }
    })

    // 4. Default fallback if somehow still empty
    if (map.size === 0) {
      DEFAULT_CLASSES.forEach(c => map.set(c.classId, c))
    }

    return Array.from(map.values())
  }, [records, allClassNames, student.className])

  const scanClassName = (classOptions.find(c => c.classId === scanClassId) || {}).className || ''

  // Automatically select the student's profile class or known class when available
  useEffect(() => {
    if (scanClassId) return
    const profileClass = student.className || getStudentProfile().className
    if (profileClass) {
      const match = classOptions.find(
        c => c.className.toLowerCase() === profileClass.toLowerCase() || c.classId === profileClass
      )
      if (match) {
        setScanClassId(match.classId)
        return
      }
    }
    if (recordClasses.length === 1) {
      setScanClassId(recordClasses[0].classId)
    }
  }, [classOptions, recordClasses, scanClassId, student.className])

  // Fresh scanner each time a different subject opens (cleans preview, retains valid class).
  useEffect(() => {
    if (scanPreview) URL.revokeObjectURL(scanPreview)
    if (questionPreview) URL.revokeObjectURL(questionPreview)
    setScanFile(null)
    setScanPreview(null)
    setQuestionFile(null)
    setQuestionPreview(null)
    setScanResult(null)
    setScanState('idle')
    setScanError('')
    const profileClass = student.className || getStudentProfile().className
    if (!scanClassId && profileClass) {
      const match = classOptions.find(
        c => c.className.toLowerCase() === profileClass.toLowerCase() || c.classId === profileClass
      )
      if (match) setScanClassId(match.classId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject])

  const handleScanFile = event => {
    const file = event.target.files[0]
    if (scanPreview) URL.revokeObjectURL(scanPreview)
    setScanResult(null)
    setScanError('')
    if (!file) {
      setScanFile(null)
      setScanPreview(null)
      return
    }
    setScanFile(file)
    if (file.type.startsWith('image/')) setScanPreview(URL.createObjectURL(file))
    else setScanPreview(null)
  }

  const handleQuestionFile = event => {
    const file = event.target.files[0]
    if (questionPreview) URL.revokeObjectURL(questionPreview)
    if (!file) {
      setQuestionFile(null)
      setQuestionPreview(null)
      return
    }
    setQuestionFile(file)
    if (file.type.startsWith('image/')) setQuestionPreview(URL.createObjectURL(file))
    else setQuestionPreview(null)
  }

  const handleStudentScan = async event => {
    event.preventDefault()
    if (!scanFile) {
      setScanError('Upload your answer paper first')
      return
    }
    if (!scanName.trim()) {
      setScanError('Enter the name your teacher uses for you')
      return
    }
    if (!scanClassId) {
      setScanError('Select your class')
      return
    }
    setScanState('scanning')
    setScanError('')
    try {
      const formData = new FormData()
      formData.append('paper', scanFile)
      if (questionFile) {
        formData.append('questionPaper', questionFile)
      }
      formData.append('studentName', scanName.trim())
      formData.append('subject', selectedSubject || '')
      const myProfile = getStudentProfile()
      if (myProfile.school) formData.append('school', myProfile.school)
      if (myProfile.board) formData.append('board', myProfile.board)
      const response = await fetch(`${API_BASE}/api/classes/${scanClassId}/analyze`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not analyse paper')
      const studentData = {
        ...data.student,
        weakAreas: data.student.weakAreas || data.student.supportNeeds || data.student.weakTopics || [],
      }
      setScanResult(studentData)
      setScanState('complete')
      // Remember this subject's assessment: boxes stay empty until a scan lands.
      if (selectedSubject && data.student) {
        const key = selectedSubject.trim().toLowerCase()
        setSubjectScans(prev => ({
          ...prev,
          [key]: {
            papersCount: studentData.papersCount || 1,
            level: studentData.performanceLevel,
            levelLabel: LEVEL_LABEL[studentData.performanceLevel] || studentData.performanceLevel,
            insights: studentData.insights || '',
            strengths: studentData.strengths || [],
            weakAreas: studentData.weakAreas || [],
            recommendations: studentData.recommendations || [],
            trend: studentData.trend || 'new',
          },
        }))
      }
    } catch (error) {
      setScanState('idle')
      setScanError(friendlyError(error, 'Could not analyse paper'))
    }
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const openMenu = () => {
    setMenuClosing(false)
    setMenuOpen(true)
  }

  const closeMenu = () => {
    setMenuClosing(true)
    window.setTimeout(() => {
      setMenuOpen(false)
      setMenuClosing(false)
    }, 250)
  }

  const goView = view => {
    closeMenu()
    if (view === activeView) return
    setViewHistory(history => [...history, activeView].slice(-20))
    setActiveView(view)
    try {
      window.history.pushState({ view }, '', window.location.pathname)
    } catch { /* ignore */ }
  }

  const goBackView = () => {
    if (selectedSubject) {
      setSelectedSubject(null)
      return
    }
    const prev = viewHistory[viewHistory.length - 1]
    if (prev) {
      setViewHistory(viewHistory.slice(0, -1))
      setActiveView(prev)
      try {
        window.history.replaceState({ view: prev }, '', window.location.pathname)
      } catch { /* ignore */ }
    } else {
      setActiveView('subjects')
      try {
        window.history.replaceState({ view: 'subjects' }, '', window.location.pathname)
      } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    try {
      window.history.replaceState({ view: 'subjects' }, '', window.location.pathname)
    } catch { /* ignore */ }

    const handlePopState = event => {
      if (selectedSubject) {
        setSelectedSubject(null)
      }
      const targetView = event.state?.view || 'subjects'
      setActiveView(targetView)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedSubject])

  // Profile: view details, update them, change password.
  const openProfile = () => {
    const id = String(localStorage.getItem('cognify_student_id') || '').toLowerCase()
    const account = getRoleAccounts('student').find(item =>
      String(item.username || '').toLowerCase() === id || String(item.email || '').toLowerCase() === id
    ) || null
    setPfAccount(account)
    setPfName(account ? account.fullName || '' : '')
    setPfSchool(account ? account.school || '' : '')
    setPfBoard(account ? account.board || '' : '')
    setPfClassName(account ? account.className || '' : '')
    setPwCurrent('')
    setPwNew('')
    setPwConfirm('')
    setPfMsg('')
    setPfError('')
    // Accounts created before school details existed open straight
    // into completion mode so nothing stays blank.
    const incomplete = Boolean(account && (!account.school || !account.board || !account.className))
    setProfileEditing(incomplete)
    if (incomplete) setPfMsg('Your account is missing school details — fill them in below.')
    setProfileOpen(true)
  }

  const saveProfile = event => {
    event.preventDefault()
    setPfError('')
    setPfMsg('')
    if (!pfAccount) {
      setPfError('Account not found — log out and back in.')
      return
    }
    if (!pfName.trim() || !pfSchool.trim() || !pfBoard || !pfClassName.trim()) {
      setPfError('Name, school, board and class are required.')
      return
    }
    const updated = updateRoleAccount('student', pfAccount.username, {
      fullName: pfName.trim(),
      school: pfSchool.trim(),
      board: pfBoard,
      className: pfClassName.trim(),
    })
    try {
      const profile = getStudentProfile()
      localStorage.setItem('cognify_student_profile', JSON.stringify({
        ...profile,
        fullName: pfName.trim(),
        school: pfSchool.trim(),
        board: pfBoard,
        className: pfClassName.trim(),
      }))
    } catch { /* non-critical */ }
    setPfAccount(updated)
    setProfileEditing(false)
    setPfMsg('Profile updated.')
  }

  const savePassword = event => {
    event.preventDefault()
    setPfError('')
    setPfMsg('')
    if (!pfAccount) {
      setPfError('Account not found — log out and back in.')
      return
    }
    if (pwCurrent !== pfAccount.password) {
      setPfError('Current password is incorrect.')
      return
    }
    if (pwNew.length < 8) {
      setPfError('New password must be at least 8 characters.')
      return
    }
    if (pwNew !== pwConfirm) {
      setPfError('New passwords do not match.')
      return
    }
    const updated = updateRoleAccount('student', pfAccount.username, { password: pwNew })
    setPfAccount(updated)
    setPwCurrent('')
    setPwNew('')
    setPwConfirm('')
    setPfMsg('Password changed successfully.')
  }

  // Assessment shown per subject, only from that subject's own scans.
  const entryFor = name => subjectScans[String(name || '').trim().toLowerCase()]

  // ---- subjects ----
  const addSubject = event => {
    event.preventDefault()
    const name = newSubjectName.trim()
    if (!name) return
    setSubjects(current => [...current, { id: `${Date.now()}`, name }])
    setNewSubjectName('')
    setShowAddSubject(false)
  }

  const deleteSubject = id => {
    const subject = subjects.find(item => item.id === id)
    if (!subject) return
    if (!window.confirm(`Remove "${subject.name}" from your subjects? Your scan records stay safe.`)) return
    setSubjects(current => current.filter(item => item.id !== id))
    if (selectedSubject === subject.name) setSelectedSubject(null)
  }

  // ---- calendar ----
  const changeMonth = delta => {
    const next = new Date(calYear, calMonth + delta, 1)
    setCalYear(next.getFullYear())
    setCalMonth(next.getMonth())
  }

  const monthCells = (() => {
    const firstWeekday = (new Date(calYear, calMonth, 1).getDay() + 6) % 7
    const days = new Date(calYear, calMonth + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= days; d++) cells.push(d)
    return cells
  })()

  const eventsOn = dateStr => events.filter(event => event.date === dateStr)

  const addEvent = event => {
    event.preventDefault()
    const title = newEventTitle.trim()
    if (!title || !selectedDate) return
    setEvents(current => [...current, { id: `${Date.now()}`, date: selectedDate, title, note: newEventNote.trim() }].sort((a, b) => a.date.localeCompare(b.date)))
    setNewEventTitle('')
    setNewEventNote('')
  }

  const upcomingEvents = events.filter(event => event.date >= todayKey).slice(0, 6)

  // ---- todos ----
  const addTodo = event => {
    event.preventDefault()
    const text = newTodoText.trim()
    if (!text) return
    setTodos(current => [...current, { id: `${Date.now()}`, text, priority: PRIORITY_ORDER.includes(newTodoPriority) ? newTodoPriority : 'medium', done: false }])
    setNewTodoText('')
  }

  const toggleTodo = id => {
    setTodos(current => current.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo))
  }

  const deleteTodo = id => {
    setTodos(current => current.filter(todo => todo.id !== id))
  }

  const remainingTodos = todos.filter(todo => !todo.done).length

  // ---- topics management ----
  const scanTopics = (() => {
    const seen = new Map()
    records.forEach(record => {
      (record.weakTopics || []).forEach(topic => {
        const key = String(topic).trim().toLowerCase()
        if (!key || seen.has(key)) return
        seen.set(key, { name: String(topic).trim(), from: record.className || 'Scanned paper' })
      })
    })
    return [...seen.values()]
  })()

  const allTopics = (() => {
    const merged = new Map()
    scanTopics.forEach(topic => {
      const key = topic.name.toLowerCase()
      merged.set(key, { ...topic, custom: false, status: topicStatus[key] || 'todo' })
    })
    customTopics.forEach(topic => {
      const key = String(topic.name).trim().toLowerCase()
      if (!key || merged.has(key)) return
      merged.set(key, { name: topic.name, from: 'Added by you', custom: true, status: topicStatus[key] || 'todo' })
    })
    return [...merged.values()]
  })()

  const cycleTopicStatus = key => {
    const current = topicStatus[key] || 'todo'
    const next = TOPIC_STATUS[(TOPIC_STATUS.indexOf(current) + 1) % TOPIC_STATUS.length]
    setTopicStatus(prev => ({ ...prev, [key]: next }))
  }

  const addCustomTopic = event => {
    event.preventDefault()
    const name = newTopicName.trim()
    if (!name) return
    setCustomTopics(current => [...current, { id: `${Date.now()}`, name }])
    setNewTopicName('')
  }

  const deleteCustomTopic = id => {
    setCustomTopics(current => current.filter(item => item.id !== id))
  }

  // ---- daily tasks ----
  const addDailyTask = event => {
    event.preventDefault()
    const text = newDailyText.trim()
    if (!text) return
    setDailyTasks(current => [...current, { id: `${Date.now()}`, text, done: false }])
    setNewDailyText('')
  }

  const dailyDone = dailyTasks.filter(task => task.done).length

  // ---- AI daily plan: assignments + worksheets + todos + weak topics ----
  const generateDailyPlan = async () => {
    setPlanState('loading')
    setPlanError('')
    try {
      const candidates = [student.fullName, student.username, student.email].filter(Boolean)
      const classIds = new Set()
      records.forEach(record => { if (record.classId) classIds.add(record.classId) })
      for (const name of candidates) {
        try {
          const response = await fetch(`${API_BASE}/api/students/classes?name=${encodeURIComponent(name)}`)
          if (!response.ok) continue
          const data = await response.json()
          if (Array.isArray(data)) data.forEach(item => { if (item.id) classIds.add(item.id) })
        } catch { /* backend down — plan from local data only */ }
      }
      let assignments = []
      try {
        const response = await fetch(`${API_BASE}/api/assignments`)
        if (response.ok) {
          const list = await response.json()
          if (Array.isArray(list)) assignments = list.filter(item => classIds.has(item.classId))
        }
      } catch { /* backend down */ }
      let submittedIds = new Set()
      const who = scanName.trim() || candidates[0] || ''
      if (who) {
        try {
          const response = await fetch(`${API_BASE}/api/submissions?student=${encodeURIComponent(who)}`)
          if (response.ok) {
            const list = await response.json()
            if (Array.isArray(list)) submittedIds = new Set(list.map(item => item.assignmentId))
          }
        } catch { /* backend down */ }
      }
      let best = null
      let bestDate = ''
      records.forEach(record => {
        const history = record.history || []
        const date = history.length > 0 ? history[history.length - 1].date : ''
        if (!best || date > bestDate) {
          best = record
          bestDate = date
        }
      })
      const weakTopics = [...new Set(records.flatMap(record => record.weakTopics || []))].slice(0, 8)
      const response = await fetch(`${API_BASE}/api/daily-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: firstNameOf(student),
          level: best ? best.performanceLevel : 'average',
          assignments: assignments
            .filter(item => !submittedIds.has(item.id))
            .map(item => ({ title: item.title, className: item.className })),
          worksheets: worksheets.map(item => ({ title: item.title })),
          todos: todos.filter(item => !item.done).map(item => ({ text: item.text, priority: item.priority })),
          weakTopics,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not generate plan')
      setDailyPlan(data)
    } catch (error) {
      setPlanError(error.message)
    }
    setPlanState('idle')
  }

  const usePlanAsToday = () => {
    if (!dailyPlan || !Array.isArray(dailyPlan.tasks)) return
    setDailyTasks(current => {
      const existing = new Set(current.map(item => item.text.trim().toLowerCase()))
      const fresh = dailyPlan.tasks
        .filter(item => item.text && !existing.has(item.text.trim().toLowerCase()))
        .map((item, index) => ({ id: `${Date.now()}-${index}`, text: item.text.trim(), done: false }))
      return [...current, ...fresh]
    })
    setDailyPlan(null)
  }

  // Notifications: fresh assignments + worksheets for me, my turn-ins, AI reminders.
  const loadNotifData = async () => {
    const candidates = [student.fullName, student.username, student.email].filter(Boolean)
    const classIds = new Set()
    records.forEach(record => { if (record.classId) classIds.add(record.classId) })
    for (const name of candidates) {
      try {
        const response = await fetch(`${API_BASE}/api/students/classes?name=${encodeURIComponent(name)}${schoolParam()}`)
        if (!response.ok) continue
        const data = await response.json()
        if (Array.isArray(data)) data.forEach(item => { if (item.id) classIds.add(item.id) })
      } catch { /* backend down */ }
    }
    try {
      const response = await fetch(`${API_BASE}/api/assignments`)
      if (response.ok) {
        const list = await response.json()
        if (Array.isArray(list)) {
          const mine = getStudentProfile().school
          setNotifAssignments(list.filter(item => classIds.has(item.classId) && sameSchool(item.school, mine)).sort((a, b) => b.createdAt - a.createdAt))
        }
      }
    } catch { /* backend down */ }
    try {
      const who = scanName.trim() || candidates[0] || ''
      if (!who) return
      const response = await fetch(`${API_BASE}/api/submissions?student=${encodeURIComponent(who)}`)
      if (response.ok) {
        const list = await response.json()
        if (Array.isArray(list)) setNotifSubmissions(list)
      }
    } catch { /* backend down */ }
  }

  useEffect(() => {
    loadNotifData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const buildStudentNotif = () => {
    const activity = []
    notifAssignments.forEach(item => {
      activity.push({
        id: `asg-${item.id}`,
        time: item.createdAt,
        icon: '📚',
        title: `New assignment: ${item.title}`,
        body: item.className,
      })
    })
    worksheets.forEach(item => {
      if (!item.createdAt) return
      activity.push({
        id: `ws-${item.id}`,
        time: item.createdAt,
        icon: '📝',
        title: `New worksheet: ${item.title}`,
        body: item.className || '',
      })
    })
    notifSubmissions.forEach(record => {
      const assignment = notifAssignments.find(item => item.id === record.assignmentId)
      activity.push({
        id: `sub-${record.id}`,
        time: record.submittedAt,
        icon: '✅',
        title: `You turned in ${assignment ? assignment.title : 'an assignment'}`,
        body: '',
      })
    })
    activity.sort((a, b) => b.time - a.time)

    const reminders = []
    const pending = notifAssignments.filter(item => !notifSubmissions.some(record => record.assignmentId === item.id))
    if (pending.length > 0) {
      reminders.push({
        id: 'rem-pend',
        icon: '⏳',
        title: `${pending.length} assignment${pending.length > 1 ? 's' : ''} waiting`,
        body: pending.slice(0, 2).map(item => item.title).join(', '),
      })
    }
    const weakCount = new Set(records.flatMap(record => record.weakTopics || [])).size
    if (weakCount > 0) {
      reminders.push({ id: 'rem-weak', icon: '🎯', title: `${weakCount} weak topics need work`, body: 'See Topics management' })
    }
    if (records.some(record => record.trend === 'improving')) {
      reminders.push({ id: 'rem-up', icon: '📈', title: `You're improving — keep going!`, body: '' })
    } else if (records.some(record => record.trend === 'declining')) {
      reminders.push({ id: 'rem-down', icon: '🔔', title: 'A recent paper slipped — review it', body: '' })
    }
    return { activity: activity.slice(0, 15), reminders: reminders.slice(0, 4) }
  }

  const openNotif = () => {
    loadNotifData()
    setNotifOpen(true)
    const now = Date.now()
    setNotifSeen(now)
    try {
      localStorage.setItem(`cognify_student_notif_seen_${uid}`, String(now))
    } catch { /* non-critical */ }
  }

  const notifData = buildStudentNotif()
  const notifUnread = notifData.activity.filter(item => item.time > notifSeen).length

  return (
    <div className="student-app">
      <header className="student-header">
        {(activeView !== 'subjects' || selectedSubject) && (
          <button className="header-back-button" type="button" aria-label="Go back" title="Go back" onClick={goBackView}>← Back</button>
        )}
        <button className="sh-menu-btn" type="button" aria-label="Open navigation" onClick={openMenu}>☰</button>
        <div className="student-greeting">
          <span className="brand-mark">C</span>
          <div>
            <p className="brand-name">Cognify</p>
            <p className="greeting">{greetingFor()}, {firstNameOf(student)}!</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" aria-label="Toggle theme" title="Toggle dark/light mode" className="sh-theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button type="button" aria-label="Notifications" className="sh-notif-bell" onClick={openNotif}>🔔{notifUnread > 0 && <span className="sh-notif-badge">{notifUnread > 9 ? '9+' : notifUnread}</span>}</button>
          <button type="button" aria-label="Profile" className="sh-profile-btn" onClick={openProfile}>👤</button>
          <button className="sh-logout" type="button" onClick={onLogout}>🚪 Log out</button>
        </div>
      </header>

      {notifOpen && (
        <div className="sh-notif-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setNotifOpen(false)}>
          <div className="sh-notif-panel" role="dialog" aria-label="Notifications">
            <div className="sh-notif-header"><strong>Notifications</strong><button type="button" aria-label="Close" onClick={() => setNotifOpen(false)}>×</button></div>
            {notifData.reminders.length > 0 && (
              <><p className="sh-notif-section">AI reminders</p>
              {notifData.reminders.map(item => (
                <div className="sh-notif-item" key={item.id}><span className="sh-notif-icon">{item.icon}</span><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}</div></div>
              ))}</>
            )}
            <p className="sh-notif-section">Latest activity</p>
            {notifData.activity.length === 0 ? (
              <p className="sh-notif-empty">Nothing yet — assignments and worksheets appear here.</p>
            ) : notifData.activity.map(item => (
              <div className="sh-notif-item" key={item.id}><span className="sh-notif-icon">{item.icon}</span><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}<span className="sh-notif-time">{timeAgo(item.time)}</span></div></div>
            ))}
          </div>
        </div>
      )}

      {menuOpen && (
        <div className={`sh-drawer-layer ${menuClosing ? 'closing' : ''}`} role="presentation" onMouseDown={event => event.target === event.currentTarget && closeMenu()}>
          <aside className="sh-drawer" aria-label="Student navigation">
            <div className="sh-drawer-header">
              <div className="sh-drawer-brand"><span className="brand-mark">C</span><strong>Cognify</strong></div>
              <button className="sh-drawer-close" type="button" aria-label="Close menu" onClick={closeMenu}>×</button>
            </div>
            <p className="sh-drawer-label">My space</p>
            <nav className="sh-drawer-nav">
              <button type="button" className={activeView === 'subjects' ? 'selected' : ''} onClick={() => goView('subjects')}>📚 <span>Subjects</span></button>
              <button type="button" className={activeView === 'calendar' ? 'selected' : ''} onClick={() => goView('calendar')}>📅 <span>Calendar</span></button>
              <button type="button" className={activeView === 'todos' ? 'selected' : ''} onClick={() => goView('todos')}>✅ <span>To-do List</span></button>
              <button type="button" className={activeView === 'topics' ? 'selected' : ''} onClick={() => goView('topics')}>🧭 <span>Topics management</span></button>
              <button type="button" className={activeView === 'worksheets' ? 'selected' : ''} onClick={() => goView('worksheets')}>📝 <span>Worksheets</span></button>
              <button type="button" className={activeView === 'assignments' ? 'selected' : ''} onClick={() => goView('assignments')}>📚 <span>Assignments</span></button>
              <button type="button" className={activeView === 'daily' ? 'selected' : ''} onClick={() => goView('daily')}>☀️ <span>Daily task</span></button>
            </nav>
            <button className="sh-drawer-logout" type="button" onClick={onLogout}>🚪 <span>Log out</span></button>
          </aside>
        </div>
      )}

      <main className="student-main">
        {(activeView !== 'subjects' || selectedSubject) && (
          <button className="sh-back sh-back-top" type="button" onClick={goBackView}>← Back</button>
        )}
        <nav className="sh-tabs" aria-label="Student workspace">
          <button className={activeView === 'subjects' ? 'active' : ''} onClick={() => goView('subjects')} type="button">My Subjects</button>
          <button className={activeView === 'worksheets' ? 'active' : ''} onClick={() => goView('worksheets')} type="button">My Worksheets</button>
          <button className={activeView === 'assignments' ? 'active' : ''} onClick={() => goView('assignments')} type="button">Assignments</button>
        </nav>

        {activeView === 'subjects' && (
          selectedSubject ? (
            <section>
              <button className="sh-back" type="button" onClick={() => setSelectedSubject(null)}>← Back to subjects</button>
              <p className="section-kicker">Subject overview</p>
              <h1>{selectedSubject}</h1>

              <div className="sh-scan-card">
                <p className="section-kicker">AI scanner</p>
                <h2>Scan your {selectedSubject} paper</h2>
                <p className="detail-subtitle">Your result is saved automatically — your teacher sees it in your class list.</p>
                <form onSubmit={handleStudentScan}>
                  <div className="sh-scan-files-grid">
                    <label className={`sh-file-label ${scanFile ? 'has-file' : ''}`}>
                      <input type="file" accept="image/*,.pdf" onChange={handleScanFile} hidden />
                      <span>{scanFile ? '✓' : '📄'}</span>
                      <div className="sh-file-label-text">
                        <strong>{scanFile ? scanFile.name : 'Upload Your Answer Paper'}</strong>
                        <small>{scanFile ? `${(scanFile.size / 1024).toFixed(1)} KB · Click to change` : 'Required · Photo or PDF of your written work'}</small>
                      </div>
                      {scanFile && (
                        <button
                          type="button"
                          className="sh-file-clear-btn"
                          aria-label="Remove answer paper"
                          onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (scanPreview) URL.revokeObjectURL(scanPreview)
                            setScanFile(null)
                            setScanPreview(null)
                          }}
                        >
                          ×
                        </button>
                      )}
                    </label>

                    <label className={`sh-file-label sh-qp-file-label ${questionFile ? 'has-file' : ''}`}>
                      <input type="file" accept="image/*,.pdf" onChange={handleQuestionFile} hidden />
                      <span>{questionFile ? '✓' : '📋'}</span>
                      <div className="sh-file-label-text">
                        <div className="sh-file-label-heading">
                          <strong>{questionFile ? questionFile.name : 'Upload Question Paper'}</strong>
                          <span className="sh-qp-recommended-badge">Recommended</span>
                        </div>
                        <small>{questionFile ? `${(questionFile.size / 1024).toFixed(1)} KB · Click to change` : 'Optional · For direct question-by-question evaluation'}</small>
                      </div>
                      {questionFile && (
                        <button
                          type="button"
                          className="sh-file-clear-btn"
                          aria-label="Remove question paper"
                          onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (questionPreview) URL.revokeObjectURL(questionPreview)
                            setQuestionFile(null)
                            setQuestionPreview(null)
                          }}
                        >
                          ×
                        </button>
                      )}
                    </label>
                  </div>

                  {scanPreview && (
                    <div className="sh-preview-container">
                      <span className="sh-preview-title">Answer Paper preview:</span>
                      <img src={scanPreview} alt="Answer paper preview" className="sh-scan-preview" />
                    </div>
                  )}
                  {questionPreview && (
                    <div className="sh-preview-container">
                      <span className="sh-preview-title">Question Paper preview:</span>
                      <img src={questionPreview} alt="Question paper preview" className="sh-scan-preview" />
                    </div>
                  )}

                  <label className="sh-field-label">Your name (must match the name your teacher uses)
                    <input type="text" value={scanName} onChange={event => setScanName(event.target.value)} placeholder="e.g. Kabir Singh" />
                  </label>
                  <label className="sh-field-label">Your class
                    <select value={scanClassId} onChange={event => setScanClassId(event.target.value)}>
                      <option value="">Select class</option>
                      {classOptions.map(c => <option key={c.classId} value={c.classId}>{c.className}</option>)}
                    </select>
                  </label>
                  {scanError && <p className="sh-form-error">{scanError}</p>}
                  <div className="sh-scan-actions">
                    <button className="sh-primary" type="submit" disabled={scanState === 'scanning'}>
                      {scanState === 'scanning'
                        ? (questionFile ? 'Cross-referencing against question paper…' : 'Scanning…')
                        : (questionFile ? '🔍 Evaluate paper with Question Paper' : '🔍 Scan my paper')}
                    </button>
                  </div>
                </form>

                {scanResult && (
                  <div className="sh-scan-result">
                    <div className="sh-result-top">
                      <span className={`status-pill ${scanResult.performanceLevel}`}>{LEVEL_LABEL[scanResult.performanceLevel] || scanResult.performanceLevel}</span>
                      {scanResult.hasQuestionPaper && (
                        <span className="sh-qp-verified-badge" title="AI evaluated answer sheet against question paper questions">
                          📋 Evaluated against Question Paper
                        </span>
                      )}
                    </div>
                    <p className="sh-insight">{scanResult.insights}</p>
                    {scanResult.papersCount >= 2 && (
                      <div className="sh-progress-box">
                        📈 Paper {scanResult.papersCount} in {selectedSubject} — trend: {scanResult.trend}.
                      </div>
                    )}
                    {scanResult.strengths && scanResult.strengths.length > 0 && (
                      <p><strong>Strengths:</strong> {scanResult.strengths.join('; ')}</p>
                    )}
                    {scanResult.weakAreas && scanResult.weakAreas.length > 0 && (
                      <p><strong>Needs help:</strong> {scanResult.weakAreas.join('; ')}</p>
                    )}
                    {scanResult.recommendations && scanResult.recommendations.length > 0 && (
                      <p><strong>Next steps:</strong> {scanResult.recommendations.join('; ')}</p>
                    )}
                    <p className="detail-subtitle">Saved{scanClassName ? ` to ${scanClassName}` : ''} — your teacher can see this.</p>
                  </div>
                )}
              </div>
              {(() => {
                const entry = entryFor(selectedSubject)
                if (!entry) {
                  return <p className="detail-subtitle">No scanned papers in {selectedSubject} yet — scan your first paper above.</p>
                }
                return (
                  <div className="sh-detail-card">
                    <p><span className={`status-pill ${entry.level}`}>{entry.levelLabel}</span></p>
                    <p className="sh-insight">{entry.insights}</p>
                    {entry.papersCount >= 2 && (
                      <p><strong>Progress:</strong> Paper {entry.papersCount} — trend: {entry.trend}.</p>
                    )}
                    {entry.strengths && entry.strengths.length > 0 && (
                      <p><strong>Strengths:</strong> {entry.strengths.join('; ')}</p>
                    )}
                    {entry.weakAreas && entry.weakAreas.length > 0 && (
                      <p><strong>Needs help:</strong> {entry.weakAreas.join('; ')}</p>
                    )}
                    {entry.recommendations && entry.recommendations.length > 0 && (
                      <p><strong>Next steps:</strong> {entry.recommendations.join('; ')}</p>
                    )}
                  </div>
                )
              })()}
            </section>
          ) : (
            <section>
              <div className="sh-section-head">
                <div><p className="section-kicker">Your learning space</p><h1>My Subjects</h1></div>
                <button className="sh-primary" type="button" onClick={() => setShowAddSubject(true)}>＋ Add subject</button>
              </div>
              {subjects.length === 0 ? (
                <div className="sh-empty"><span>📚</span><p>No subjects yet</p><span>Add your first subject to get started.</span></div>
              ) : (
                <div className="sh-grid">
                  {subjects.map(subject => (
                    <article className="sh-card" key={subject.id} role="button" tabIndex={0}
                      aria-label={`Open ${subject.name}`}
                      onClick={() => setSelectedSubject(subject.name)}
                      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedSubject(subject.name); } }}>
                      <div className="sh-card-top">
                        <span className="sh-card-icon">📖</span>
                        <button className="sh-delete" type="button" aria-label={`Remove ${subject.name}`} title={`Remove ${subject.name}`}
                          onClick={event => { event.stopPropagation(); deleteSubject(subject.id); }}>🗑</button>
                      </div>
                      <h2>{subject.name}</h2>
                      <div className="sh-card-stats">
                        {(() => {
                          const entry = entryFor(subject.name)
                          return entry ? (
                            <span><span className={`status-pill ${entry.level}`}>{entry.levelLabel}</span></span>
                          ) : (
                            <span className="detail-subtitle">No scans yet</span>
                          )
                        })()}
                        <span className="detail-subtitle">{worksheets.length} worksheet{worksheets.length === 1 ? '' : 's'}</span>
                      </div>
                      {(() => {
                        const entry = entryFor(subject.name)
                        return entry && entry.insights ? (
                          <p className="sh-insight">{entry.insights.slice(0, 120)}{entry.insights.length > 120 ? '…' : ''}</p>
                        ) : null
                      })()}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )
        )}

        {activeView === 'worksheets' && (
          <section>
            <p className="section-kicker">Practice material</p>
            <h1>My Worksheets</h1>
            {loading ? (
              <p className="detail-subtitle">Loading…</p>
            ) : worksheets.length === 0 ? (
              <div className="sh-empty"><span>📝</span><p>No worksheets yet</p><span>Worksheets your teacher generates for you appear here.</span></div>
            ) : (
              <div className="sh-grid">
                {worksheets.map(item => (
                  <article className="sh-card" key={item.id}>
                    <div className="sh-card-top">
                      <span className="sh-card-icon">📝</span>
                      <span className={`source-badge ${item.source === 'ai' ? 'source-ai' : 'source-upload'}`}>
                        {item.source === 'ai' ? '✦ AI' : '⬆ Upload'}
                      </span>
                    </div>
                    <h2>{item.title}</h2>
                    <p className="detail-subtitle">{item.className || ''}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}</p>
                    <div className="sh-card-actions">
                      {item.worksheet ? (
                        <button className="sh-outline" type="button" onClick={() => setViewingWorksheet(item)}>View</button>
                      ) : item.fileId ? (
                        <a className="sh-outline sh-file-action" href={`${API_BASE}/api/worksheets/file/${item.fileId}`} target="_blank" rel="noreferrer">Open File</a>
                      ) : (
                        <button className="sh-outline" type="button" onClick={() => setViewingWorksheet(item)}>View</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeView === 'calendar' && (
          <section>
            <div className="sh-section-head">
              <div><p className="section-kicker">Planner</p><h1>Calendar</h1></div>
              <button className="sh-outline" type="button" onClick={() => { const n = new Date(); setCalYear(n.getFullYear()); setCalMonth(n.getMonth()); setSelectedDate(toDateStr(n.getFullYear(), n.getMonth(), n.getDate())); }}>Today</button>
            </div>
            <div className="sh-cal-layout">
              <div className="sh-cal-card">
                <div className="sh-cal-nav">
                  <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button>
                  <strong>{MONTH_NAMES[calMonth]} {calYear}</strong>
                  <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>›</button>
                </div>
                <div className="sh-cal-grid">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={index} className="sh-cal-dow">{day}</span>)}
                  {monthCells.map((day, index) => {
                    if (day === null) return <span key={`blank-${index}`} />
                    const dateStr = toDateStr(calYear, calMonth, day)
                    const count = eventsOn(dateStr).length
                    const classes = ['sh-cal-day']
                    if (dateStr === todayKey) classes.push('is-today')
                    if (dateStr === selectedDate) classes.push('is-selected')
                    return <button key={dateStr} type="button" className={classes.join(' ')} onClick={() => setSelectedDate(dateStr)}>{day}{count > 0 && <span className="sh-event-dots">{'•'.repeat(Math.min(count, 3))}</span>}</button>
                  })}
                </div>
              </div>
              <div className="sh-cal-card">
                <p className="section-kicker">{selectedDate ? `Events · ${selectedDate}` : 'Select a day'}</p>
                {selectedDate && eventsOn(selectedDate).length > 0 && (
                  <ul className="sh-day-events">
                    {eventsOn(selectedDate).map(event => (
                      <li key={event.id}><div><strong>{event.title}</strong>{event.note && <p>{event.note}</p>}</div><button className="sh-delete" type="button" aria-label={`Delete ${event.title}`} onClick={() => setEvents(current => current.filter(item => item.id !== event.id))}>🗑</button></li>
                    ))}
                  </ul>
                )}
                {selectedDate ? (
                  <form className="sh-event-form" onSubmit={addEvent}>
                    <input type="text" value={newEventTitle} onChange={event => setNewEventTitle(event.target.value)} placeholder="Add important date, e.g. Unit test" required />
                    <input type="text" value={newEventNote} onChange={event => setNewEventNote(event.target.value)} placeholder="Note (optional)" />
                    <button className="sh-primary" type="submit">Mark date</button>
                  </form>
                ) : (
                  <p className="detail-subtitle">Click any day to add or view important dates.</p>
                )}
                {upcomingEvents.length > 0 && (
                  <><p className="section-kicker sh-upcoming-title">Coming up</p><ul className="sh-day-events">{upcomingEvents.map(event => <li key={event.id}><div><strong>{event.title}</strong><p>{event.date}{event.note ? ` · ${event.note}` : ''}</p></div></li>)}</ul></>
                )}
              </div>
            </div>
          </section>
        )}

        {activeView === 'todos' && (
          <section>
            <p className="section-kicker">Planner</p>
            <h1>To-do List</h1>
            <p className="detail-subtitle">{todos.length === 0 ? 'Nothing here yet.' : `${remainingTodos} of ${todos.length} remaining.`}</p>
            <form className="sh-todo-form" onSubmit={addTodo}>
              <input type="text" value={newTodoText} onChange={event => setNewTodoText(event.target.value)} placeholder="Add a task, e.g. Revise formulas" required />
              <div className="sh-priority-picker" role="group" aria-label="Priority">
                {['high', 'medium', 'low'].map(priority => (
                  <button key={priority} type="button" className={`sh-priority-pill priority-${priority} ${newTodoPriority === priority ? 'selected' : ''}`} onClick={() => setNewTodoPriority(priority)}>{priority[0].toUpperCase() + priority.slice(1)}</button>
                ))}
              </div>
              <button className="sh-primary" type="submit">Add</button>
            </form>
            {todos.length > 0 && PRIORITY_ORDER.map(priority => {
              const group = todos.filter(todo => todo.priority === priority)
              if (group.length === 0) return null
              return (
                <div key={priority} className="sh-todo-group">
                  <p className={`sh-todo-group-title priority-${priority}`}>{priority[0].toUpperCase() + priority.slice(1)} priority ({group.filter(todo => !todo.done).length} open)</p>
                  <ul className="sh-todo-items">
                    {group.map(todo => (
                      <li key={todo.id} className={todo.done ? 'done' : ''}>
                        <button type="button" aria-label={todo.done ? 'Mark as not done' : 'Mark as done'} className={`sh-todo-check ${todo.done ? 'checked' : ''}`} onClick={() => toggleTodo(todo.id)}>{todo.done ? '✓' : ''}</button>
                        <span className="sh-todo-text">{todo.text}</span>
                        <button className="sh-delete" type="button" aria-label={`Delete ${todo.text}`} onClick={() => deleteTodo(todo.id)}>🗑</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>
        )}

        {activeView === 'topics' && (
          <section>
            <p className="section-kicker">Study map</p>
            <h1>Topics management</h1>
            <p className="detail-subtitle">Weak topics from your scans appear here automatically — tap one to move it along. Add your own below.</p>
            <form className="sh-todo-form" onSubmit={addCustomTopic}>
              <input type="text" value={newTopicName} onChange={event => setNewTopicName(event.target.value)} placeholder="Add a topic, e.g. Trigonometry" required />
              <button className="sh-primary" type="submit">Add</button>
            </form>
            {allTopics.length === 0 ? (
              <div className="sh-empty"><span>🧭</span><p>No topics yet</p><span>Scan-based weak topics and your own additions show up here.</span></div>
            ) : (
              <ul className="sh-todo-items sh-topics">
                {allTopics.map(topic => {
                  const key = topic.name.toLowerCase()
                  const status = topic.status
                  return (
                    <li key={key}>
                      <button type="button" className={`sh-topic-status ${status}`} title="Tap to move along" onClick={() => cycleTopicStatus(key)}>
                        {status === 'todo' ? '○' : status === 'doing' ? '◐' : '●'}
                      </button>
                      <span className="sh-todo-text">
                        {topic.name}
                        <span className="sh-topic-from">{topic.from} · {TOPIC_STATUS_LABEL[status]}</span>
                      </span>
                      {topic.custom && <button className="sh-delete" type="button" aria-label={`Delete ${topic.name}`} onClick={() => deleteCustomTopic(topic.id)}>🗑</button>}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )}

        {activeView === 'daily' && (
          <section>
            <p className="section-kicker">Today · {todayKey}</p>
            <h1>Daily task</h1>
            <p className="detail-subtitle">{dailyTasks.length === 0 ? 'Plan today below — the list is fresh every morning.' : `${dailyDone} of ${dailyTasks.length} done today.`}</p>
            {dailyPlan ? (
              <div className="sh-plan-box">
                <p className="section-kicker">{dailyPlan.aiGenerated ? '✦ AI daily plan' : 'Daily plan'}</p>
                <p className="sh-plan-focus">{dailyPlan.focus}</p>
                <ol className="sh-plan-tasks">
                  {dailyPlan.tasks.map((item, index) => (
                    <li key={index}><strong>{item.text}</strong>{item.reason && <span className="sh-hint"> — {item.reason}</span>}</li>
                  ))}
                </ol>
                <div className="sh-scan-actions">
                  <button className="sh-primary" type="button" onClick={usePlanAsToday}>Use as today's plan</button>
                  <button className="sh-outline" type="button" onClick={() => setDailyPlan(null)}>Dismiss</button>
                </div>
              </div>
            ) : (
              <div className="sh-scan-actions">
                <button className="sh-primary" type="button" disabled={planState === 'loading'} onClick={generateDailyPlan}>
                  {planState === 'loading' ? 'Building your plan…' : '✦ Generate today\u2019s plan'}
                </button>
              </div>
            )}
            {planError && <p className="sh-form-error">{planError}</p>}
            <form className="sh-todo-form" onSubmit={addDailyTask}>
              <input type="text" value={newDailyText} onChange={event => setNewDailyText(event.target.value)} placeholder="Add today's task, e.g. 30 min revision" required />
              <button className="sh-primary" type="submit">Add</button>
            </form>
            {dailyTasks.length > 0 && (
              <ul className="sh-todo-items sh-daily">
                {dailyTasks.map(task => (
                  <li key={task.id} className={task.done ? 'done' : ''}>
                    <button type="button" aria-label={task.done ? 'Mark as not done' : 'Mark as done'} className={`sh-todo-check ${task.done ? 'checked' : ''}`} onClick={() => setDailyTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done } : item))}>{task.done ? '✓' : ''}</button>
                    <span className="sh-todo-text">{task.text}</span>
                    <button className="sh-delete" type="button" aria-label={`Delete ${task.text}`} onClick={() => setDailyTasks(current => current.filter(item => item.id !== task.id))}>🗑</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeView === 'assignments' && (
          <section>
            <p className="section-kicker">Homework</p>
            <h1>Assignments</h1>
            <p className="detail-subtitle">Work your teacher gave your class — submit your file here.</p>
            {submitError && <p className="sh-form-error">{submitError}</p>}
            {allAssignments.length === 0 ? (
              <div className="sh-empty"><span>📚</span><p>No assignments yet</p><span>Assignments from your teacher appear here.</span></div>
            ) : (
              <div className="sh-grid">
                {allAssignments.map(assignment => {
                  const submission = mySubmissions.find(record => record.assignmentId === assignment.id)
                  return (
                    <article className="sh-card" key={assignment.id}>
                      <div className="sh-card-top">
                        <span className="sh-card-icon">📚</span>
                        {submission
                          ? <span className="status-pill above">Submitted ✓</span>
                          : <span className="status-pill average">Pending</span>}
                      </div>
                      <h2>{assignment.title}</h2>
                      <p className="detail-subtitle">{assignment.className} · given {new Date(assignment.createdAt).toLocaleDateString()}</p>
                      {submission ? (
                        <p className="detail-subtitle">Turned in: {submission.fileName} · <a className="sh-file-link" href={`${API_BASE}/api/submissions/file/${submission.fileId}`} target="_blank" rel="noreferrer">view</a></p>
                      ) : (
                        <div className="sh-submit-row">
                          <label className="sh-file-btn">Choose file
                            <input type="file" accept="image/*,.pdf" hidden onChange={event => setSubmitFiles(current => ({ ...current, [assignment.id]: event.target.files[0] || null }))} />
                          </label>
                          <span className="detail-subtitle">{submitFiles[assignment.id] ? submitFiles[assignment.id].name : 'No file chosen'}</span>
                          <button className="sh-primary" type="button" disabled={submittingId === assignment.id} onClick={() => handleSubmitAssignment(assignment)}>
                            {submittingId === assignment.id ? 'Submitting…' : 'Submit'}
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {showAddSubject && (
        <div className="sh-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowAddSubject(false)}>
          <form className="sh-modal" onSubmit={addSubject}>
            <div className="sh-modal-head"><div><p className="section-kicker">New subject</p><h2>Add subject</h2></div><button type="button" className="sh-close" aria-label="Close" onClick={() => setShowAddSubject(false)}>×</button></div>
            <label>Subject name<input autoFocus type="text" value={newSubjectName} onChange={event => setNewSubjectName(event.target.value)} placeholder="For example, Mathematics" required /></label>
            <button className="sh-primary sh-submit" type="submit">Add subject</button>
          </form>
        </div>
      )}

      {profileOpen && (
        <div className="sh-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setProfileOpen(false)}>
          <div className="sh-modal sh-wide" role="dialog" aria-label="My profile">
            <div className="sh-modal-head"><div><p className="section-kicker">Student account</p><h2>My Profile</h2></div><button type="button" className="sh-close" aria-label="Close" onClick={() => setProfileOpen(false)}>×</button></div>
            {!pfAccount ? (
              <p className="detail-subtitle">Account not found — log out and back in.</p>
            ) : !profileEditing ? (
              <div className="sh-profile-details">
                <p><span>Full name</span><strong>{pfAccount.fullName || '—'}</strong></p>
                <p><span>Username</span><strong>{pfAccount.username || '—'}</strong></p>
                <p><span>Email</span><strong>{pfAccount.email || '—'}</strong></p>
                <p><span>School</span><strong>{pfAccount.school || '—'}</strong></p>
                <p><span>Board</span><strong>{pfAccount.board || '—'}</strong></p>
                <p><span>Class</span><strong>{pfAccount.className || '—'}</strong></p>
                <button className="sh-primary sh-submit" type="button" onClick={() => { setProfileEditing(true); setPfMsg(''); setPfError('') }}>Update details</button>
              </div>
            ) : (
              <form onSubmit={saveProfile}>
                <label>Full name<input type="text" value={pfName} onChange={event => setPfName(event.target.value)} required /></label>
                <label>School name<input type="text" value={pfSchool} onChange={event => setPfSchool(event.target.value)} required /></label>
                <label>Board<select value={pfBoard} onChange={event => setPfBoard(event.target.value)} required><option value="">Select board</option><option value="CBSE">CBSE</option><option value="ICSE">ICSE</option><option value="State">State</option><option value="Other">Other</option></select></label>
                <label>Class<input type="text" value={pfClassName} onChange={event => setPfClassName(event.target.value)} required /></label>
                <button className="sh-primary sh-submit" type="submit">Save changes</button>
                <button className="sh-outline sh-submit" type="button" onClick={() => setProfileEditing(false)}>Cancel</button>
              </form>
            )}
            {pfAccount && (
              <form className="sh-profile-password" onSubmit={savePassword}>
                <p className="section-kicker">Change password</p>
                <label>Current password<input type="password" value={pwCurrent} onChange={event => setPwCurrent(event.target.value)} required /></label>
                <label>New password (min 8 characters)<input type="password" value={pwNew} onChange={event => setPwNew(event.target.value)} required /></label>
                <label>Confirm new password<input type="password" value={pwConfirm} onChange={event => setPwConfirm(event.target.value)} required /></label>
                <button className="sh-outline sh-submit" type="submit">Change password</button>
              </form>
            )}
            {pfError && <p className="sh-form-error">{pfError}</p>}
            {pfMsg && <p className="sh-profile-msg">{pfMsg}</p>}
          </div>
        </div>
      )}

      {viewingWorksheet && (
        <div className="sh-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setViewingWorksheet(null)}>
          <div className="sh-modal sh-wide" role="dialog" aria-label={viewingWorksheet.title}>
            <div className="sh-modal-head"><div><p className="section-kicker">{viewingWorksheet.className || 'Worksheet'}</p><h2>{viewingWorksheet.title}</h2></div><button type="button" className="sh-close" aria-label="Close" onClick={() => setViewingWorksheet(null)}>×</button></div>
            {viewingWorksheet.worksheet ? (
              <>
                <p className="sh-insight">{viewingWorksheet.worksheet.instructions}</p>
                <ol className="sh-questions">{viewingWorksheet.worksheet.questions.map((q, i) => <li key={i}><strong>{q.topic}: </strong>{q.q}{q.hint && <span className="sh-hint"> Hint: {q.hint}</span>}</li>)}</ol>
                {viewingWorksheet.worksheet.checklist && viewingWorksheet.worksheet.checklist.length > 0 && (
                  <div className="sh-checklist"><strong>Self-check before submitting:</strong><ul>{viewingWorksheet.worksheet.checklist.map((c, i) => <li key={i}>☐ {c}</li>)}</ul></div>
                )}
                <div className="sh-modal-actions">
                  <button className="sh-primary" type="button" onClick={() => window.print()}>🖨 Print</button>
                  <button className="sh-outline" type="button" onClick={() => setViewingWorksheet(null)}>Close</button>
                </div>
              </>
            ) : viewingWorksheet.fileId ? (
              <div className="sh-file-modal-content">
                <p className="sh-insight">This worksheet was uploaded by your teacher as a file.</p>
                <div className="sh-modal-actions">
                  <a className="sh-primary sh-download-link" href={`${API_BASE}/api/worksheets/file/${viewingWorksheet.fileId}`} target="_blank" rel="noreferrer">
                    📄 View / Download File
                  </a>
                  <button className="sh-outline" type="button" onClick={() => setViewingWorksheet(null)}>Close</button>
                </div>
              </div>
            ) : (
              <div className="sh-modal-actions">
                <button className="sh-outline" type="button" onClick={() => setViewingWorksheet(null)}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentHome
