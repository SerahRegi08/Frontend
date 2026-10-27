import React, { useEffect, useRef, useState } from 'react'
import './thome.css'
import MyClasses from './myclass'
import { getTeacherProfile, getApiBase, friendlyError } from './profile'
import { getRoleAccounts, updateRoleAccount } from './authStore'

const API_BASE = getApiBase()

// PUT helper that never breaks the UI when the backend is down.
const putList = (path, data) => {
	fetch(`${API_BASE}${path}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	}).catch(() => {})
}

const normName = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
const nameMatch = (a, b) => {
	const x = normName(a)
	const y = normName(b)
	if (!x || !y) return false
	if (x === y) return true
	return x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x))
}

const timeAgo = ts => {
	const seconds = Math.max(1, Math.floor((Date.now() - Number(ts)) / 1000))
	if (seconds < 60) return 'just now'
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60) return `${minutes}m ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 24) return `${hours}h ago`
	return `${Math.floor(hours / 24)}d ago`
}

const startingClasses = [
	{ id: 'class-10a', name: 'Class 10A', icon: '📘', classAverage: 68, studentsList: [{ id: 'a1', name: 'Aarav Mehta', score: 84, specialCare: false, numericalSkills: 'secure' }, { id: 'a2', name: 'Diya Shah', score: 72, specialCare: false, numericalSkills: 'secure' }, { id: 'a3', name: 'Kabir Singh', score: 45, specialCare: true, numericalSkills: 'needs-support' }, { id: 'a4', name: 'Meera Joshi', score: 58, specialCare: false, numericalSkills: 'needs-support' }, { id: 'a5', name: 'Rohan Das', score: 81, specialCare: false, numericalSkills: 'secure' }] },
	{ id: 'class-10b', name: 'Class 10B', icon: '📗', classAverage: 0, studentsList: [] },
	{ id: 'class-9a', name: 'Class 9A', icon: '📕', classAverage: 0, studentsList: [] },
	{ id: 'class-9b', name: 'Class 9B', icon: '📙', classAverage: 0, studentsList: [] },
]

const STORAGE_KEY = 'cognify_classList_v1'

const loadClasses = () => {
	try {
		const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
		if (Array.isArray(saved) && saved.length > 0) return saved
	} catch {
		// corrupted storage — fall back to starter data
	}
	return startingClasses
}

function TeacherHome({ onLogout }) {
	const [activeView, setActiveView] = useState('dashboard')
	const [menuOpen, setMenuOpen] = useState(false)
	const [menuClosing, setMenuClosing] = useState(false)
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
	const [profileOpen, setProfileOpen] = useState(false)
	const [profileEditing, setProfileEditing] = useState(false)
	const [pfAccount, setPfAccount] = useState(null)
	const [pfName, setPfName] = useState('')
	const [pfSchool, setPfSchool] = useState('')
	const [pfBoard, setPfBoard] = useState('')
	const [pwCurrent, setPwCurrent] = useState('')
	const [pwNew, setPwNew] = useState('')
	const [pwConfirm, setPwConfirm] = useState('')
	const [pfMsg, setPfMsg] = useState('')
	const [pfError, setPfError] = useState('')
	const [classList, setClassList] = useState(loadClasses)
	const firstSaveRef = useRef(true)
	const firstAssignSaveRef = useRef(true)
	const firstWorksheetSaveRef = useRef(true)
	const classListRef = useRef(classList)
	const backendDownRef = useRef(false)
	const [showAddClass, setShowAddClass] = useState(false)
	const [newClassName, setNewClassName] = useState('Class')
	const [numberOfClasses, setNumberOfClasses] = useState('1')
	const [assignments, setAssignments] = useState(() => {
		try {
			const saved = JSON.parse(localStorage.getItem('cognify_assignments_v1') || 'null')
			return Array.isArray(saved) ? saved : []
		} catch {
			return []
		}
	})
	const [showAddAssignment, setShowAddAssignment] = useState(false)
	const [newAssignmentTitle, setNewAssignmentTitle] = useState('')
	const [newAssignmentClassId, setNewAssignmentClassId] = useState('')
	const [expandedAssignment, setExpandedAssignment] = useState(null)
	const [events, setEvents] = useState(() => {
		try {
			const saved = JSON.parse(localStorage.getItem('cognify_events_v1') || 'null')
			return Array.isArray(saved) ? saved : []
		} catch {
			return []
		}
	})
	const today = new Date()
	const [calYear, setCalYear] = useState(today.getFullYear())
	const [calMonth, setCalMonth] = useState(today.getMonth())
	const [selectedDate, setSelectedDate] = useState(null)
	const [newEventTitle, setNewEventTitle] = useState('')
	const [newEventNote, setNewEventNote] = useState('')
	const [todos, setTodos] = useState(() => {
		try {
			const saved = JSON.parse(localStorage.getItem('cognify_todos_v1') || 'null')
			return Array.isArray(saved) ? saved : []
		} catch {
			return []
		}
	})
	const [newTodoText, setNewTodoText] = useState('')
	const [newTodoPriority, setNewTodoPriority] = useState('medium')
	const [worksheets, setWorksheets] = useState(() => {
		try {
			const saved = JSON.parse(localStorage.getItem('cognify_worksheets_v1') || 'null')
			return Array.isArray(saved) ? saved : []
		} catch {
			return []
		}
	})
	const [showUploadWorksheet, setShowUploadWorksheet] = useState(false)
	const [uploadTitle, setUploadTitle] = useState('')
	const [uploadClassId, setUploadClassId] = useState('')
	const [uploadFile, setUploadFile] = useState(null)
	const [uploadError, setUploadError] = useState('')
	const [viewingWorksheet, setViewingWorksheet] = useState(null)
	const [classWorksheet, setClassWorksheet] = useState(null)
	const [worksheetState, setWorksheetState] = useState('idle')
	const [worksheetError, setWorksheetError] = useState('')
	const [insights, setInsights] = useState(null)
	const [insightsState, setInsightsState] = useState('idle')
	const [insightsError, setInsightsError] = useState('')

	const loadInsights = async () => {
		setInsightsState('loading')
		setInsightsError('')
		try {
			const response = await fetch(`${API_BASE}/api/insights`)
			const data = await response.json()
			if (!response.ok) throw new Error(data.error || 'Could not generate insights')
			setInsights(data)
			setInsightsState('complete')
		} catch (error) {
			setInsightsState('idle')
			setInsightsError(friendlyError(error, 'Could not generate insights'))
		}
	}

	useEffect(() => {
		if (activeView === 'insights' && !insights && insightsState === 'idle') loadInsights()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeView])

	const totalStudents = classList.reduce((total, classItem) => total + classItem.studentsList.length, 0)
	const needAttentionCount = classList.reduce((total, classItem) => total + (classItem.studentsList || []).filter(student => student.specialCare).length, 0)
	const papersScannedCount = classList.reduce((total, classItem) => total + (classItem.studentsList || []).filter(student => student.insights).length, 0)

	// Genuine per-class analysis: most shared struggle across scanned work.
	const classRecommendation = (() => {
		const stats = classList.map(classItem => {
			const scanned = (classItem.studentsList || []).filter(student => student.insights)
			const freq = {}
			scanned.forEach(student => (student.supportNeeds || []).forEach(need => { freq[need] = (freq[need] || 0) + 1 }))
			const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
			const below = scanned.filter(student => student.performanceLevel === 'below').length
			const weakTopics = [...new Set(scanned.flatMap(student => student.weakTopics || []))].slice(0, 5)
			const levels = scanned.map(student => student.performanceLevel)
			const dominant = ['below', 'average', 'above'].sort((a, b) => levels.filter(l => l === b).length - levels.filter(l => l === a).length)[0] || 'average'
			return { classItem, scanned: scanned.length, below, topNeed: top ? top[0] : null, topCount: top ? top[1] : 0, weakTopics, dominant }
		}).filter(stat => stat.scanned > 0)
		if (stats.length === 0) return null
		stats.sort((a, b) => (b.topCount - a.topCount) || (b.below - a.below))
		return stats[0]
	})()

	const addClasses = event => {
		event.preventDefault()
		const amount = Math.max(1, Math.min(20, Number(numberOfClasses)))
		const profile = getTeacherProfile()
		const newClasses = Array.from({ length: amount }, (_, index) => ({
			id: `${Date.now()}-${index}`,
			name: amount === 1 ? newClassName : `${newClassName} ${index + 1}`,
			icon: ['📘', '📗', '📕', '📙'][classList.length % 4],
			classAverage: 0,
			studentsList: [],
			...(profile.school ? { school: profile.school } : {}),
			...(profile.board ? { board: profile.board } : {}),
		}))

		setClassList([...classList, ...newClasses])
		setShowAddClass(false)
		setNewClassName('Class')
		setNumberOfClasses('1')
	}

	const addStudent = (classId, studentName) => {
		setClassList(currentClasses => currentClasses.map(classItem => classItem.id === classId ? {
			...classItem,
			studentsList: [...(classItem.studentsList || []), { id: `${Date.now()}-${(classItem.studentsList || []).length}`, name: studentName, score: 0, specialCare: false, numericalSkills: 'needs-support' }],
		} : classItem))
	}

	const deleteStudent = (classId, studentId) => {
		setClassList(currentClasses => currentClasses.map(classItem => {
			if (classItem.id !== classId) return classItem
			return {
				...classItem,
				studentsList: (classItem.studentsList || []).filter(student => student.id !== studentId),
			}
		}))
	}

	const updateStudentAnalysis = (classId, analyzedStudent) => {
		setClassList(currentClasses => currentClasses.map(classItem => classItem.id === classId ? { ...classItem, studentsList: [...classItem.studentsList.filter(student => student.id !== analyzedStudent.id && student.name.toLowerCase() !== analyzedStudent.name.toLowerCase()), { ...analyzedStudent, lastScan: Date.now() }] } : classItem))
	}

	const addAssignment = event => {
		event.preventDefault()
		const classItem = classList.find(item => item.id === newAssignmentClassId)
		if (!classItem) return
		const countInClass = assignments.filter(item => item.classId === classItem.id).length
		const title = newAssignmentTitle.trim() || `Assignment ${countInClass + 1}`
		const profile = getTeacherProfile()
		setAssignments(current => [...current, { id: `${Date.now()}`, title, classId: classItem.id, className: classItem.name, createdAt: Date.now(), ...(profile.school ? { school: profile.school } : {}) }])
		setShowAddAssignment(false)
		setNewAssignmentTitle('')
		setNewAssignmentClassId('')
	}

	// Turned in = paper scanned after the assignment was given, OR file submitted.
	const [submissions, setSubmissions] = useState([])
	const [notifOpen, setNotifOpen] = useState(false)
	const [notifSeen, setNotifSeen] = useState(() => {
		try {
			return Number(localStorage.getItem('cognify_teacher_notif_seen') || 0)
		} catch {
			return 0
		}
	})

	useEffect(() => {
		if (activeView !== 'assignments') return
		fetch(`${API_BASE}/api/submissions`)
			.then(response => (response.ok ? response.json() : []))
			.then(data => { if (Array.isArray(data)) setSubmissions(data) })
			.catch(() => {})
	}, [activeView])

	const assignmentProgress = assignment => {
		const classItem = classList.find(item => item.id === assignment.classId)
		const students = classItem ? (classItem.studentsList || []) : []
		const subs = submissions.filter(record => record.assignmentId === assignment.id)
		const subByStudent = {}
		students.forEach(student => {
			const hit = subs.find(record => nameMatch(record.studentName, student.name))
			if (hit) subByStudent[student.id] = hit
		})
		const turnedIn = students.filter(student => (student.lastScan && student.lastScan >= assignment.createdAt) || subByStudent[student.id])
		return { total: students.length, done: turnedIn.length, turnedInIds: new Set(turnedIn.map(student => student.id)), subByStudent }
	}

	const generateClassWorksheet = async () => {
		if (!classRecommendation) return
		setWorksheetState('loading')
		setWorksheetError('')
		try {
			const response = await fetch(`${API_BASE}/api/worksheet`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentName: `${classRecommendation.classItem.name} — class worksheet`,
					performanceLevel: classRecommendation.dominant,
					weakTopics: classRecommendation.weakTopics,
					weakAreas: classRecommendation.topNeed ? [classRecommendation.topNeed] : [],
				}),
			})
			const result = await response.json()
			if (!response.ok) throw new Error(result.error || 'Could not generate worksheet')
			setClassWorksheet(result.worksheet)
			setWorksheetState('complete')
			saveWorksheet({
				title: result.worksheet.title,
				studentName: 'Whole class',
				className: classRecommendation.classItem.name,
				source: 'ai',
				worksheet: result.worksheet,
			})
		} catch (error) {
			setWorksheetState('idle')
			setWorksheetError(friendlyError(error, 'Could not generate worksheet'))
		}
	}

	const saveWorksheet = entry => {
		setWorksheets(current => [{ id: `${Date.now()}`, createdAt: Date.now(), ...entry }, ...current])
	}

	const handleUploadWorksheet = async event => {
		event.preventDefault()
		setUploadError('')
		const classItem = classList.find(item => item.id === uploadClassId)
		if (!classItem) {
			setUploadError('Select a class for this worksheet.')
			return
		}
		if (!uploadFile) {
			setUploadError('Choose a file to upload.')
			return
		}
		if (uploadFile.size > 15 * 1024 * 1024) {
			setUploadError('Keep uploads under 15MB.')
			return
		}
		try {
			const formData = new FormData()
			formData.append('file', uploadFile)
			formData.append('title', uploadTitle.trim())
			formData.append('className', classItem.name)
			const response = await fetch(`${API_BASE}/api/worksheets/upload`, { method: 'POST', body: formData })
			const result = await response.json()
			if (!response.ok) throw new Error(result.error || 'Upload failed')
			setWorksheets(current => [result, ...current])
		} catch (error) {
			setUploadError(friendlyError(error, 'Upload failed'))
			return
		}
		setShowUploadWorksheet(false)
		setUploadTitle('')
		setUploadClassId('')
		setUploadFile(null)
	}

	const deleteWorksheet = id => {
		const entry = worksheets.find(item => item.id === id)
		if (entry && entry.fileId) {
			fetch(`${API_BASE}/api/worksheets/${id}`, { method: 'DELETE' }).catch(() => {})
		}
		setWorksheets(current => current.filter(item => item.id !== id))
		if (viewingWorksheet && viewingWorksheet.id === id) setViewingWorksheet(null)
	}

	const selectMenuItem = item => {
		closeMenu()
		if (['dashboard', 'classes', 'assignments', 'worksheets', 'calendar', 'todos', 'settings', 'insights'].includes(item)) goView(item)
	}

	// View history: Back always returns to the very previous page.
	const [viewHistory, setViewHistory] = useState([])

	const goView = view => {
		if (view === activeView) return
		setViewHistory(history => [...history, activeView].slice(-20))
		setActiveView(view)
		try {
			window.history.pushState({ view }, '', window.location.pathname)
		} catch { /* ignore */ }
	}

	const goBackView = () => {
		const prev = viewHistory[viewHistory.length - 1]
		if (prev) {
			setViewHistory(viewHistory.slice(0, -1))
			setActiveView(prev)
			try {
				window.history.replaceState({ view: prev }, '', window.location.pathname)
			} catch { /* ignore */ }
		} else {
			setActiveView('dashboard')
			try {
				window.history.replaceState({ view: 'dashboard' }, '', window.location.pathname)
			} catch { /* ignore */ }
		}
	}

	useEffect(() => {
		try {
			window.history.replaceState({ view: 'dashboard' }, '', window.location.pathname)
		} catch { /* ignore */ }

		const handlePopState = event => {
			const targetView = event.state?.view || 'dashboard'
			setActiveView(targetView)
		}
		window.addEventListener('popstate', handlePopState)
		return () => window.removeEventListener('popstate', handlePopState)
	}, [])

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

	useEffect(() => {
		document.body.style.overflow = menuOpen ? 'hidden' : ''
		return () => { document.body.style.overflow = '' }
	}, [menuOpen])

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(classList))
		} catch {
			// storage full or unavailable — app keeps working in memory
		}
		if (firstSaveRef.current) {
			// First render: let the mount load resolve first so we never
			// clobber student self-scans that arrived while closed.
			firstSaveRef.current = false
			return
		}
		putList('/api/classes', classList)
	}, [classList])

	useEffect(() => {
		try {
			localStorage.setItem('cognify_assignments_v1', JSON.stringify(assignments))
		} catch {
			// storage full or unavailable — app keeps working in memory
		}
		if (firstAssignSaveRef.current) {
			// First render: let the mount load resolve first so we never
			// clobber server data with a stale local copy.
			firstAssignSaveRef.current = false
			return
		}
		putList('/api/assignments', assignments)
	}, [assignments])

	useEffect(() => {
		try {
			localStorage.setItem('cognify_events_v1', JSON.stringify(events))
		} catch {
			// tiny data — localStorage is plenty, app keeps working in memory
		}
	}, [events])

	useEffect(() => {
		try {
			localStorage.setItem('cognify_todos_v1', JSON.stringify(todos))
		} catch {
			// tiny data — localStorage is plenty, app keeps working in memory
		}
	}, [todos])

	const PRIORITY_ORDER = ['high', 'medium', 'low']
	const PRIORITY_LABEL = { high: 'High priority', medium: 'Medium priority', low: 'Low priority' }

	const addTodo = event => {
		event.preventDefault()
		const text = newTodoText.trim()
		if (!text) return
		setTodos(current => [...current, { id: `${Date.now()}`, text, priority: PRIORITY_ORDER.includes(newTodoPriority) ? newTodoPriority : 'medium', done: false, createdAt: Date.now() }])
		setNewTodoText('')
	}

	const toggleTodo = id => {
		setTodos(current => current.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo))
	}

	const deleteTodo = id => {
		setTodos(current => current.filter(todo => todo.id !== id))
	}

	const remainingTodos = todos.filter(todo => !todo.done).length

	const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	const toDateStr = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
	const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

	const changeMonth = delta => {
		const next = new Date(calYear, calMonth + delta, 1)
		setCalYear(next.getFullYear())
		setCalMonth(next.getMonth())
	}

	const monthCells = (() => {
		const firstWeekday = (new Date(calYear, calMonth, 1).getDay() + 6) % 7 // Monday-first
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

	const deleteEvent = id => {
		setEvents(current => current.filter(event => event.id !== id))
	}

	const upcomingEvents = events.filter(event => event.date >= todayStr).slice(0, 6)

	useEffect(() => {
		try {
			localStorage.setItem('cognify_worksheets_v1', JSON.stringify(worksheets))
		} catch {
			// storage full (large uploads) — list keeps working in memory
		}
		if (firstWorksheetSaveRef.current) {
			// First render: let the mount load resolve first so we never
			// clobber server data with a stale local copy.
			firstWorksheetSaveRef.current = false
			return
		}
		putList('/api/worksheets', worksheets)
	}, [worksheets])

	// On load: backend wins when it has data, otherwise seed it from this browser.
	useEffect(() => {
		const load = async (path, key, apply) => {
			try {
				const response = await fetch(`${API_BASE}${path}`)
				if (!response.ok) return
				const data = await response.json()
				if (Array.isArray(data) && data.length > 0) {
					apply(data)
				} else {
					const local = JSON.parse(localStorage.getItem(key) || '[]')
					if (Array.isArray(local) && local.length > 0) putList(path, local)
				}
			} catch {
				// backend down — localStorage state stays as-is
			}
		}
		load('/api/classes', STORAGE_KEY, setClassList)
		load('/api/assignments', 'cognify_assignments_v1', setAssignments)
		load('/api/worksheets', 'cognify_worksheets_v1', setWorksheets)
	}, [])

	useEffect(() => {
		classListRef.current = classList
	}, [classList])

	// Pick up student self-scans automatically: replace only when the server
	// differs; if the backend was unreachable, push local truth up instead.
	useEffect(() => {
		const syncFromServer = async () => {
			try {
				const response = await fetch(`${API_BASE}/api/classes`)
				if (!response.ok) throw new Error('unreachable')
				const data = await response.json()
				if (!Array.isArray(data)) return
				if (backendDownRef.current) {
					backendDownRef.current = false
					putList('/api/classes', classListRef.current)
					return
				}
				setClassList(current => (JSON.stringify(current) === JSON.stringify(data) ? current : data))
			} catch {
				backendDownRef.current = true
			}
			try {
				const response = await fetch(`${API_BASE}/api/submissions`)
				if (response.ok) {
					const data = await response.json()
					if (Array.isArray(data)) setSubmissions(data)
				}
			} catch { /* keep last known submissions */ }
		}
		const id = window.setInterval(syncFromServer, 20000)
		return () => window.clearInterval(id)
	}, [])

	const deleteClass = classId => {
		const classItem = classList.find(item => item.id === classId)
		if (!classItem) return false
		const studentCount = (classItem.studentsList || []).length
		const confirmed = window.confirm(
			`Delete "${classItem.name}"?\n\nThis will permanently remove ${studentCount} student${studentCount === 1 ? '' : 's'} and all their scanned insights. This cannot be undone.`
		)
		if (!confirmed) return false
		setClassList(currentClasses => currentClasses.filter(item => item.id !== classId))
		setAssignments(current => current.filter(item => item.classId !== classId))
		return true
	}

	// Profile: view details, update them, change password.
	const openProfile = () => {
		const id = String(localStorage.getItem('cognify_teacher_id') || '').toLowerCase()
		const account = getRoleAccounts('teacher').find(item =>
			String(item.username || '').toLowerCase() === id || String(item.email || '').toLowerCase() === id
		) || null
		setPfAccount(account)
		setPfName(account ? account.fullName || '' : '')
		setPfSchool(account ? account.school || '' : '')
		setPfBoard(account ? account.board || '' : '')
		setPwCurrent('')
		setPwNew('')
		setPwConfirm('')
		setPfMsg('')
		setPfError('')
		// Accounts created before school details existed open straight
		// into completion mode so nothing stays blank.
		const incomplete = Boolean(account && (!account.school || !account.board))
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
		if (!pfName.trim() || !pfSchool.trim() || !pfBoard) {
			setPfError('Name, school and board are required.')
			return
		}
		const updated = updateRoleAccount('teacher', pfAccount.username, {
			fullName: pfName.trim(),
			school: pfSchool.trim(),
			board: pfBoard,
		})
		try {
			const profile = getTeacherProfile()
			localStorage.setItem('cognify_teacher_profile', JSON.stringify({
				...profile,
				fullName: pfName.trim(),
				school: pfSchool.trim(),
				board: pfBoard,
			}))
		} catch { /* non-critical */ }
		setPfAccount(updated)
		setProfileEditing(false)
		setPfMsg('Profile updated. School changes apply to new scans and assignments.')
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
		const updated = updateRoleAccount('teacher', pfAccount.username, { password: pwNew })
		setPfAccount(updated)
		setPwCurrent('')
		setPwNew('')
		setPwConfirm('')
		setPfMsg('Password changed successfully.')
	}

	// Notifications: real scans + submissions + data-driven AI reminders.
	const buildNotifications = () => {
		const activity = []
		classList.forEach(classItem => {
			(classItem.studentsList || []).forEach(student => {
				if (student.lastScan) {
					activity.push({
						id: `scan-${student.id}-${student.lastScan}`,
						time: student.lastScan,
						icon: '📄',
						title: `${student.name} scanned a paper`,
						body: `${classItem.name}${student.subject ? ` · ${student.subject}` : ''}${student.performanceLevel ? ` · ${student.performanceLevel}` : ''}`,
					})
				}
			})
		})
		const assignById = {}
		assignments.forEach(item => { assignById[item.id] = item })
		submissions.forEach(record => {
			const assignment = assignById[record.assignmentId]
			activity.push({
				id: `sub-${record.id}`,
				time: record.submittedAt,
				icon: '📥',
				title: `${record.studentName} turned in ${assignment ? assignment.title : 'an assignment'}`,
				body: assignment ? assignment.className : '',
			})
		})
		activity.sort((a, b) => b.time - a.time)

		const reminders = []
		const weakFreq = {}
		classList.forEach(classItem => {
			(classItem.studentsList || []).forEach(student => {
				(student.supportNeeds || []).forEach(need => {
					const key = `${classItem.id}|||${need}`
					if (!weakFreq[key]) weakFreq[key] = { className: classItem.name, need, count: 0 }
					weakFreq[key].count += 1
				})
			})
		})
		Object.values(weakFreq)
			.sort((a, b) => b.count - a.count)
			.slice(0, 2)
			.forEach((item, index) => {
				if (item.count >= 2) {
					reminders.push({
						id: `rem-weak-${index}`,
						icon: '🔍',
						title: `${item.count} students in ${item.className} share a weakness`,
						body: item.need,
					})
				}
			})
		assignments
			.filter(item => {
				const progress = assignmentProgress(item)
				return progress.total > 0 && progress.done === 0
			})
			.slice(0, 2)
			.forEach(item => {
				reminders.push({
					id: `rem-pend-${item.id}`,
					icon: '⏳',
					title: `No turn-ins yet: ${item.title}`,
					body: item.className,
				})
			})
		return { activity: activity.slice(0, 15), reminders }
	}

	const openNotif = () => {
		setNotifOpen(true)
		const now = Date.now()
		setNotifSeen(now)
		try {
			localStorage.setItem('cognify_teacher_notif_seen', String(now))
		} catch { /* non-critical */ }
	}

	const notifData = buildNotifications()
	const notifUnread = notifData.activity.filter(item => item.time > notifSeen).length

	return (
		<div className="teacher-app">
			<header className="teacher-header">
				{activeView !== 'dashboard' && (
					<button className="header-back-button" type="button" aria-label="Go back" title="Go back" onClick={goBackView}>← Back</button>
				)}
				<button className="menu-button" type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={openMenu}>☰</button>
				<div className="teacher-greeting">
					<span className="brand-mark">C</span>
					<div>
						<p className="brand-name">Cognify</p>
						<p className="greeting">
							{(() => {
								const h = new Date().getHours()
								const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
								const name = pfAccount?.fullName ? pfAccount.fullName.split(' ')[0] : (getTeacherProfile()?.fullName ? getTeacherProfile().fullName.split(' ')[0] : 'Teacher')
								return `${greeting}, ${name}!`
							})()}
						</p>
					</div>
				</div>
				<div className="header-actions">
					<button type="button" aria-label="Notifications" className="notif-bell" onClick={openNotif}>🔔{notifUnread > 0 && <span className="notif-badge">{notifUnread > 9 ? '9+' : notifUnread}</span>}</button>
					<button type="button" aria-label="Profile" onClick={openProfile}>👤</button>
					<button type="button" className="teacher-logout" aria-label="Log out" title="Log out" onClick={onLogout}>🚪 Log out</button>
				</div>
			</header>

			{notifOpen && (
					<div className="notif-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setNotifOpen(false)}>
						<div className="notif-panel" role="dialog" aria-label="Notifications">
							<div className="notif-header"><strong>Notifications</strong><button type="button" aria-label="Close" onClick={() => setNotifOpen(false)}>×</button></div>
							{notifData.reminders.length > 0 && (
								<><p className="notif-section">AI reminders</p>
								{notifData.reminders.map(item => (
									<div className="notif-item" key={item.id}><span className="notif-icon">{item.icon}</span><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}</div></div>
								))}</>
							)}
							<p className="notif-section">Latest activity</p>
							{notifData.activity.length === 0 ? (
								<p className="notif-empty">Nothing yet — scans and turn-ins appear here.</p>
							) : notifData.activity.map(item => (
								<div className="notif-item" key={item.id}><span className="notif-icon">{item.icon}</span><div><strong>{item.title}</strong>{item.body && <p>{item.body}</p>}<span className="notif-time">{timeAgo(item.time)}</span></div></div>
							))}
						</div>
					</div>
				)}

			{menuOpen && (
				<div className={`drawer-layer ${menuClosing ? 'closing' : ''}`} role="presentation" onMouseDown={event => event.target === event.currentTarget && closeMenu()}>
					<aside className="side-drawer" aria-label="Teacher navigation">
						<div className="drawer-header"><div className="drawer-brand"><span className="brand-mark">C</span><strong>Cognify</strong></div><button className="drawer-close" type="button" aria-label="Close menu" onClick={closeMenu}>×</button></div>
						<p className="drawer-label">Workspace</p>
						<nav className="drawer-nav">
							<button type="button" onClick={() => selectMenuItem('dashboard')}>🏠 <span>Dashboard</span></button>
							<button className={activeView === 'classes' ? 'selected' : ''} type="button" onClick={() => selectMenuItem('classes')}>📚 <span>My Classes</span></button>
							<button className={activeView === 'assignments' ? 'selected' : ''} type="button" onClick={() => selectMenuItem('assignments')}>📝 <span>Assignments</span></button>
							<button className={activeView === 'worksheets' ? 'selected' : ''} type="button" onClick={() => selectMenuItem('worksheets')}>📄 <span>Worksheets</span></button>
						</nav>
						<p className="drawer-label">Tools</p>
						<nav className="drawer-nav">
							<button className={activeView === 'insights' ? 'selected' : ''} type="button" onClick={() => selectMenuItem('insights')}>🤖 <span>AI Insights</span></button>
							<button className={activeView === 'calendar' ? 'selected' : ''} type="button" onClick={() => selectMenuItem('calendar')}>📅 <span>Calendar</span></button>
							<button className={activeView === 'todos' ? 'selected' : ''} type="button" onClick={() => selectMenuItem('todos')}>✅ <span>To-do List</span></button>
							<button className={activeView === 'settings' ? 'selected' : ''} type="button" onClick={() => selectMenuItem('settings')}>⚙️ <span>Settings</span></button>
						</nav>
						<button className="drawer-logout" type="button" onClick={onLogout}>🚪 <span>Log out</span></button>
					</aside>
				</div>
			)}

			{profileOpen && (
				<div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setProfileOpen(false)}>
					<div className="add-class-modal profile-modal" role="dialog" aria-label="My profile">
						<div className="modal-heading"><div><p className="section-kicker">Teacher account</p><h2>My Profile</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setProfileOpen(false)}>×</button></div>
						{!pfAccount ? (
							<p className="detail-subtitle">Account not found — log out and back in.</p>
						) : !profileEditing ? (
							<div className="profile-details">
								<p><span>Full name</span><strong>{pfAccount.fullName || '—'}</strong></p>
								<p><span>Username</span><strong>{pfAccount.username || '—'}</strong></p>
								<p><span>Email</span><strong>{pfAccount.email || '—'}</strong></p>
								<p><span>School</span><strong>{pfAccount.school || '—'}</strong></p>
								<p><span>Board</span><strong>{pfAccount.board || '—'}</strong></p>
								<button className="primary-button modal-submit" type="button" onClick={() => { setProfileEditing(true); setPfMsg(''); setPfError('') }}>Update details</button>
							</div>
						) : (
							<form onSubmit={saveProfile}>
								<label>Full name<input type="text" value={pfName} onChange={event => setPfName(event.target.value)} required /></label>
								<label>School name<input type="text" value={pfSchool} onChange={event => setPfSchool(event.target.value)} required /></label>
								<label>Board<select value={pfBoard} onChange={event => setPfBoard(event.target.value)} required><option value="">Select board</option><option value="CBSE">CBSE</option><option value="ICSE">ICSE</option><option value="State">State</option><option value="Other">Other</option></select></label>
								<button className="primary-button modal-submit" type="submit">Save changes</button>
								<button className="outline-button modal-submit" type="button" onClick={() => setProfileEditing(false)}>Cancel</button>
							</form>
						)}
						{pfAccount && (
							<form className="profile-password" onSubmit={savePassword}>
								<p className="section-kicker">Change password</p>
								<label>Current password<input type="password" value={pwCurrent} onChange={event => setPwCurrent(event.target.value)} required /></label>
								<label>New password (min 8 characters)<input type="password" value={pwNew} onChange={event => setPwNew(event.target.value)} required /></label>
								<label>Confirm new password<input type="password" value={pwConfirm} onChange={event => setPwConfirm(event.target.value)} required /></label>
								<button className="outline-button modal-submit" type="submit">Change password</button>
							</form>
						)}
						{pfError && <p className="analysis-error">{pfError}</p>}
						{pfMsg && <p className="scan-status success">{pfMsg}</p>}
					</div>
				</div>
			)}

			<main className="teacher-main">
				{activeView !== 'dashboard' && (
					<button className="dashboard-back-button" type="button" onClick={goBackView}>← Back</button>
				)}
				<nav className="view-tabs" aria-label="Teacher workspace">
					<button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => goView('dashboard')} type="button">Dashboard</button>
					<button className={activeView === 'classes' ? 'active' : ''} onClick={() => goView('classes')} type="button">My classes</button>
					<button className={activeView === 'assignments' ? 'active' : ''} onClick={() => goView('assignments')} type="button">Assignments</button>
					<button className={activeView === 'worksheets' ? 'active' : ''} onClick={() => goView('worksheets')} type="button">Worksheets</button>
					<button className={activeView === 'calendar' ? 'active' : ''} onClick={() => goView('calendar')} type="button">Calendar</button>
					<button className={activeView === 'todos' ? 'active' : ''} onClick={() => goView('todos')} type="button">To-do List</button>
				</nav>

				{showAddClass && (
					<div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowAddClass(false)}>
						<form className="add-class-modal" onSubmit={addClasses}>
							<div className="modal-heading"><div><p className="section-kicker">Class setup</p><h2>Add classes</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setShowAddClass(false)}>×</button></div>
							<label>Class name<input type="text" value={newClassName} onChange={event => setNewClassName(event.target.value)} placeholder="For example, Class 8A" required /></label>
							<label>Number of classes<input type="number" min="1" max="20" value={numberOfClasses} onChange={event => setNumberOfClasses(event.target.value)} required /></label>
							<button className="primary-button modal-submit" type="submit">Add {numberOfClasses || 0} class{numberOfClasses === '1' ? '' : 'es'}</button>
						</form>
					</div>
				)}

				{showAddAssignment && (
					<div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowAddAssignment(false)}>
						<form className="add-class-modal" onSubmit={addAssignment}>
							<div className="modal-heading"><div><p className="section-kicker">Homework</p><h2>New assignment</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setShowAddAssignment(false)}>×</button></div>
							<label>Title<input type="text" value={newAssignmentTitle} onChange={event => setNewAssignmentTitle(event.target.value)} placeholder="For example, Assignment 1" /></label>
							<label>Class<select value={newAssignmentClassId} onChange={event => setNewAssignmentClassId(event.target.value)} required><option value="">Select a class</option>{classList.map(classItem => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</select></label>
							<button className="primary-button modal-submit" type="submit">Give assignment</button>
						</form>
					</div>
				)}

				{showUploadWorksheet && (
					<div className="modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowUploadWorksheet(false)}>
						<form className="add-class-modal" onSubmit={handleUploadWorksheet}>
							<div className="modal-heading"><div><p className="section-kicker">Practice material</p><h2>Upload worksheet</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setShowUploadWorksheet(false)}>×</button></div>
							<label>Title<input type="text" value={uploadTitle} onChange={event => setUploadTitle(event.target.value)} placeholder="Defaults to file name" /></label>
							<label>Class<select value={uploadClassId} onChange={event => setUploadClassId(event.target.value)} required><option value="">Select a class</option>{classList.map(classItem => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}</select></label>
							<label>File (PDF or image, under 15MB, stored on server)<input type="file" accept="image/*,.pdf" onChange={event => setUploadFile(event.target.files[0] || null)} required /></label>
							{uploadError && <p className="analysis-error">{uploadError}</p>}
							<button className="primary-button modal-submit" type="submit">Upload</button>
						</form>
					</div>
				)}

				{viewingWorksheet && <div className="student-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setViewingWorksheet(null)}><div className="worksheet-modal" role="dialog" aria-label={viewingWorksheet.title}><div className="modal-heading"><div><p className="section-kicker">{viewingWorksheet.studentName ? `${viewingWorksheet.studentName} · ${viewingWorksheet.className}` : viewingWorksheet.className}</p><h2>{viewingWorksheet.title}</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setViewingWorksheet(null)}>×</button></div><p className="worksheet-instructions">{viewingWorksheet.worksheet.instructions}</p><ol className="worksheet-questions">{viewingWorksheet.worksheet.questions.map((item, index) => <li key={index}><strong>{item.topic}: </strong>{item.q}{item.hint && <span className="worksheet-hint"> Hint: {item.hint}</span>}</li>)}</ol>{viewingWorksheet.worksheet.checklist && viewingWorksheet.worksheet.checklist.length > 0 && <div className="worksheet-checklist"><strong>Self-check before submitting:</strong><ul>{viewingWorksheet.worksheet.checklist.map((item, index) => <li key={index}>☐ {item}</li>)}</ul></div>}<div className="worksheet-actions"><button className="primary-button" type="button" onClick={() => window.print()}>🖨 Print</button><button className="outline-button" type="button" onClick={() => setViewingWorksheet(null)}>Close</button></div></div></div>}

				{activeView === 'classes' ? (
					<MyClasses classList={classList} onAddClass={() => setShowAddClass(true)} onAddStudent={addStudent} onDeleteStudent={deleteStudent} onStudentAnalysis={updateStudentAnalysis} onDeleteClass={deleteClass} onWorksheetSaved={saveWorksheet} />
				) : activeView === 'assignments' ? (
					<section className="assignments-view">
						<div className="class-detail-heading">
							<div><p className="section-kicker">Homework</p><h1>Assignments</h1><p className="detail-subtitle">Ticked off automatically when a student’s paper is scanned after the assignment date.</p></div>
							<button className="primary-button" type="button" onClick={() => setShowAddAssignment(true)}>＋ New assignment</button>
						</div>
						{assignments.length === 0 ? (
							<div className="empty-classes"><span className="empty-icon">📝</span><p>No assignments yet</p><span>Give your first assignment to a class.</span></div>
						) : (
							<div className="assignment-list">
								{[...assignments].sort((a, b) => b.createdAt - a.createdAt).map(assignment => {
									const progress = assignmentProgress(assignment)
									const classItem = classList.find(item => item.id === assignment.classId)
									const students = classItem ? (classItem.studentsList || []) : []
									const percent = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)
									const expanded = expandedAssignment === assignment.id
									return (
										<article className="assignment-card" key={assignment.id}>
											<div className="assignment-top">
												<div><h3>{assignment.title}</h3><p className="assignment-class">{assignment.className} · given {new Date(assignment.createdAt).toLocaleDateString()}</p></div>
												<span className="assignment-count">{progress.done}/{progress.total} turned in</span>
											</div>
											<div className="progress-bar"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
											<button className="roster-toggle" type="button" onClick={() => setExpandedAssignment(expanded ? null : assignment.id)}>{expanded ? 'Hide students ▴' : 'View students ▾'}</button>
											{expanded && (
												students.length === 0 ? (
													<p className="detail-subtitle">No students in this class yet.</p>
												) : (
													<ul className="roster">
														{students.map(student => {
															const sub = progress.subByStudent[student.id]
															return <li key={student.id}><span>{student.name}</span>{progress.turnedInIds.has(student.id) ? <span className="tick-done">✓ Turned in{sub && <> · <a className="roster-file-link" href={`${API_BASE}/api/submissions/file/${sub.fileId}`} target="_blank" rel="noreferrer">view file</a></>}</span> : <span className="tick-pending">○ Pending</span>}</li>
														})}
													</ul>
												)
											)}
										</article>
									)
								})}
							</div>
						)}
					</section>
				) : activeView === 'worksheets' ? (
					<section className="worksheets-view">
						<div className="class-detail-heading">
							<div><p className="section-kicker">Practice material</p><h1>Worksheets</h1><p className="detail-subtitle">AI-generated from scans, plus your own uploads.</p></div>
							<button className="primary-button" type="button" onClick={() => setShowUploadWorksheet(true)}>＋ Upload worksheet</button>
						</div>
						{worksheets.length === 0 ? (
							<div className="empty-classes"><span className="empty-icon">📝</span><p>No worksheets yet</p><span>Generate one from a scan, or upload your own.</span></div>
						) : (
							<div className="worksheet-list">
								{worksheets.map(item => (
									<article className="worksheet-card" key={item.id}>
										<div className="assignment-top">
											<div>
												<h3>{item.title}</h3>
												<p className="assignment-class">{item.studentName ? `${item.studentName} · ` : ''}{item.className}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ''}</p>
											</div>
											<span className={`source-badge ${item.source === 'ai' ? 'source-ai' : 'source-upload'}`}>{item.source === 'ai' ? '✦ AI' : '⬆ Upload'}</span>
										</div>
										<div className="worksheet-card-actions">
											{item.source === 'ai' ? (
												<button className="outline-button" type="button" onClick={() => setViewingWorksheet(item)}>View</button>
											) : (
												<a className="outline-button worksheet-link" href={item.fileId ? `${API_BASE}/api/worksheets/file/${item.fileId}` : item.fileData} target="_blank" rel="noreferrer">View file</a>
											)}
											<button className="card-delete" type="button" aria-label={`Delete ${item.title}`} title="Delete worksheet" onClick={() => deleteWorksheet(item.id)}>🗑</button>
										</div>
									</article>
								))}
							</div>
						)}
					</section>
				) : activeView === 'calendar' ? (
					<section className="calendar-view">
						<div className="class-detail-heading">
							<div><p className="section-kicker">Planner</p><h1>Calendar</h1><p className="detail-subtitle">Mark exams, deadlines and important dates.</p></div>
							<button className="outline-button" type="button" onClick={() => { const now = new Date(); setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); setSelectedDate(toDateStr(now.getFullYear(), now.getMonth(), now.getDate())); }}>Today</button>
						</div>
						<div className="calendar-layout">
							<div className="calendar-card">
								<div className="calendar-nav">
									<button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button>
									<strong>{MONTH_NAMES[calMonth]} {calYear}</strong>
									<button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>›</button>
								</div>
								<div className="calendar-grid">
									{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={index} className="calendar-dow">{day}</span>)}
									{monthCells.map((day, index) => {
										if (day === null) return <span key={`blank-${index}`} />
										const dateStr = toDateStr(calYear, calMonth, day)
										const count = eventsOn(dateStr).length
										const classes = ['calendar-day']
										if (dateStr === todayStr) classes.push('is-today')
										if (dateStr === selectedDate) classes.push('is-selected')
										if (count > 0) classes.push('has-events')
										return <button key={dateStr} type="button" className={classes.join(' ')} onClick={() => setSelectedDate(dateStr)}>{day}{count > 0 && <span className="event-dots">{'•'.repeat(Math.min(count, 3))}</span>}</button>
									})}
								</div>
							</div>
							<div className="calendar-side">
								<div className="calendar-card">
									<p className="section-kicker">{selectedDate ? `Events · ${selectedDate}` : 'Select a day'}</p>
									{selectedDate && eventsOn(selectedDate).length > 0 && (
										<ul className="day-events">
											{eventsOn(selectedDate).map(event => (
												<li key={event.id}><div><strong>{event.title}</strong>{event.note && <p>{event.note}</p>}</div><button className="card-delete" type="button" aria-label={`Delete ${event.title}`} onClick={() => deleteEvent(event.id)}>🗑</button></li>
											))}
										</ul>
									)}
									{selectedDate ? (
										<form className="event-form" onSubmit={addEvent}>
											<input type="text" value={newEventTitle} onChange={event => setNewEventTitle(event.target.value)} placeholder="Add important date, e.g. Unit test" required />
											<input type="text" value={newEventNote} onChange={event => setNewEventNote(event.target.value)} placeholder="Note (optional)" />
											<button className="primary-button modal-submit" type="submit">Mark date</button>
										</form>
									) : (
										<p className="detail-subtitle">Click any day to add or view important dates.</p>
									)}
								</div>
								<div className="calendar-card">
									<p className="section-kicker">Coming up</p>
									{upcomingEvents.length === 0 ? (
										<p className="detail-subtitle">Nothing marked yet.</p>
									) : (
										<ul className="day-events">
											{upcomingEvents.map(event => (
												<li key={event.id}><div><strong>{event.title}</strong><p>{event.date}{event.note ? ` · ${event.note}` : ''}</p></div></li>
											))}
										</ul>
									)}
								</div>
							</div>
						</div>
					</section>
				) : activeView === 'todos' ? (
					<section className="todos-view">
						<div className="class-detail-heading">
							<div><p className="section-kicker">Planner</p><h1>To-do List</h1><p className="detail-subtitle">{todos.length === 0 ? 'Nothing here yet.' : `${remainingTodos} of ${todos.length} remaining.`}</p></div>
						</div>
						<form className="todo-form" onSubmit={addTodo}>
							<input type="text" value={newTodoText} onChange={event => setNewTodoText(event.target.value)} placeholder="Add a task, e.g. Check Class 10A papers" required />
							<div className="priority-picker" role="group" aria-label="Priority">
								{['high', 'medium', 'low'].map(priority => (
									<button key={priority} type="button" className={`priority-pill priority-${priority} ${newTodoPriority === priority ? 'selected' : ''}`} onClick={() => setNewTodoPriority(priority)}>{priority[0].toUpperCase() + priority.slice(1)}</button>
								))}
							</div>
							<button className="primary-button" type="submit">Add</button>
						</form>
						{todos.length === 0 ? (
							<div className="empty-classes"><span className="empty-icon">✅</span><p>No tasks yet</p><span>Add your first task above.</span></div>
						) : (
							PRIORITY_ORDER.map(priority => {
								const group = todos.filter(todo => todo.priority === priority)
								if (group.length === 0) return null
								return (
									<div key={priority} className="todo-group">
										<p className={`todo-group-title priority-${priority}`}>{PRIORITY_LABEL[priority]} ({group.filter(todo => !todo.done).length} open)</p>
										<ul className="todo-items">
											{group.map(todo => (
												<li key={todo.id} className={todo.done ? 'done' : ''}>
													<button type="button" aria-label={todo.done ? 'Mark as not done' : 'Mark as done'} className={`todo-check ${todo.done ? 'checked' : ''}`} onClick={() => toggleTodo(todo.id)}>{todo.done ? '✓' : ''}</button>
													<span className="todo-text">{todo.text}</span>
													<button className="card-delete" type="button" aria-label={`Delete ${todo.text}`} onClick={() => deleteTodo(todo.id)}>🗑</button>
												</li>
											))}
										</ul>
									</div>
								)
							})
						)}
					</section>
				) : activeView === 'insights' ? (
					<section className="insights-view">
						<div className="class-detail-heading">
							<div><p className="section-kicker">AI briefing</p><h1>AI Insights</h1><p className="detail-subtitle">Improvement, focus students and class patterns from real scans.</p></div>
							<button className="outline-button" type="button" onClick={loadInsights} disabled={insightsState === 'loading'}>{insightsState === 'loading' ? 'Generating…' : '↻ Refresh'}</button>
						</div>
						{insightsState === 'loading' && !insights && <p className="detail-subtitle">Reading every class and writing your briefing…</p>}
						{insightsError && <p className="analysis-error">{insightsError}</p>}
						{insights && (
							<>
								<div className="insight-summary">
									<span className="recommendation-icon">✦</span>
									<p>{insights.summary}</p>
								</div>
								{insights.focusStudents && insights.focusStudents.length > 0 && (
									<><p className="section-kicker insight-subtitle">Students needing focus</p>
									<div className="insight-list">
										{insights.focusStudents.map((item, index) => (
											<article className="insight-card" key={`${item.name}-${index}`}>
												<div><strong>{item.name}</strong><p className="detail-subtitle">{item.className}{item.trend && item.trend !== 'new' ? ` · ${item.trend}` : ''}</p></div>
												<p className="student-insight">{item.reason}</p>
											</article>
										))}
									</div></>
								)}
								{insights.classNotes && insights.classNotes.length > 0 && (
									<><p className="section-kicker insight-subtitle">Class notes</p>
									<div className="insight-list">
										{insights.classNotes.map((item, index) => (
											<article className="insight-card" key={`${item.className}-${index}`}>
												<div><strong>{item.className}</strong></div>
												<p className="student-insight">{item.note}</p>
											</article>
										))}
									</div></>
								)}
								{insights.recommendations && insights.recommendations.length > 0 && (
									<><p className="section-kicker insight-subtitle">Recommended next steps</p>
									<ul className="insight-reco">
										{insights.recommendations.map((item, index) => <li key={index}>{item}</li>)}
									</ul></>
								)}
								<p className="detail-subtitle">{insights.aiGenerated ? '✦ Written by AI from your scan data.' : 'Built from your scan data (AI unavailable).'}</p>
							</>
						)}
					</section>
				) : activeView === 'settings' ? (
					<section className="settings-view">
						<div><p className="section-kicker">Preferences</p><h1>Settings</h1><p className="detail-subtitle">Choose how Cognify looks on this device.</p></div>
						<div className="theme-options">
							<button type="button" className={`theme-card ${theme === 'light' ? 'selected' : ''}`} onClick={() => setTheme('light')} aria-pressed={theme === 'light'}>
								<span className="theme-preview theme-preview-light">☀️</span>
								<strong>Light theme</strong>
								<span>Bright classroom look</span>
							</button>
							<button type="button" className={`theme-card ${theme === 'dark' ? 'selected' : ''}`} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}>
								<span className="theme-preview theme-preview-dark">🌙</span>
								<strong>Dark theme</strong>
								<span>Easy on the eyes at night</span>
							</button>
						</div>
					</section>
				) : (
					<section className="dashboard-view">
						<div className="section-heading">
							<div>
								<p className="section-kicker">Teacher workspace</p>
								<h1>Quick overview</h1>
							</div>
							  <button className="outline-button" type="button" onClick={() => setShowAddClass(true)}>＋ Add class</button>
						</div>

						<div className="overview-grid">
							<article className="overview-card"><strong>{classList.length}</strong><span>Classes</span></article>
							  <article className="overview-card"><strong>{totalStudents}</strong><span>Students</span></article>
							<article className="overview-card warning"><strong>{needAttentionCount}</strong><span>Need attention</span></article>
							<article className="overview-card"><strong>{papersScannedCount}</strong><span>Papers scanned</span></article>
						</div>

						<div className="section-heading classes-heading">
							<div>
								<p className="section-kicker">Your teaching groups</p>
								<h2>My classes</h2>
							</div>
							<span className="detail-subtitle">Open a class to scan student work</span>
						</div>

						<div className="class-grid">
							  {classList.map(classItem => (
								<article className="class-card" key={classItem.id} onClick={() => goView('classes')}>
									<div className="class-title"><span>{classItem.icon}</span><h3>{classItem.name}</h3><button type="button" className="class-delete" aria-label={`Delete ${classItem.name}`} title={`Delete ${classItem.name}`} onClick={(e) => { e.stopPropagation(); deleteClass(classItem.id); }}>🗑</button></div>
									<p className="student-count">{(classItem.studentsList || []).length} Students</p>
									<p className="attention-count">{(classItem.studentsList || []).filter(student => student.specialCare).length} need attention</p>
									<button className="insight-button" type="button" onClick={(e) => { e.stopPropagation(); goView('insights'); }}>AI Insights <span>→</span></button>
								</article>
							))}
						</div>

						<aside className="recommendation">
							<div className="recommendation-icon">✦</div>
							{classRecommendation ? (
								<><div><p className="section-kicker">AI recommendation</p><p>{classRecommendation.topCount} of {classRecommendation.scanned} scanned students in {classRecommendation.classItem.name} struggle with {classRecommendation.topNeed.toLowerCase()}{classRecommendation.weakTopics.length > 0 ? ` — mostly ${classRecommendation.weakTopics.slice(0, 3).join(', ').toLowerCase()}` : ''}.</p></div>
								<button className="primary-button" type="button" onClick={generateClassWorksheet} disabled={worksheetState === 'loading'}>{worksheetState === 'loading' ? 'Generating…' : 'Generate worksheet'}</button></>
							) : (
								<div><p className="section-kicker">AI recommendation</p><p>Scan student papers to unlock recommendations — once a class has scanned work, genuine suggestions appear here.</p></div>
							)}
						</aside>
						{worksheetError && <p className="analysis-error">{worksheetError}</p>}

						{worksheetState === 'complete' && classWorksheet && <div className="student-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setWorksheetState('idle')}><div className="worksheet-modal" role="dialog" aria-label="Generated class worksheet"><div className="modal-heading"><div><p className="section-kicker">Targeted practice{classWorksheet.aiGenerated ? '' : ' (template)'}</p><h2>{classWorksheet.title}</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setWorksheetState('idle')}>×</button></div><p className="worksheet-instructions">{classWorksheet.instructions}</p><ol className="worksheet-questions">{classWorksheet.questions.map((item, index) => <li key={index}><strong>{item.topic}: </strong>{item.q}{item.hint && <span className="worksheet-hint"> Hint: {item.hint}</span>}</li>)}</ol>{classWorksheet.checklist && classWorksheet.checklist.length > 0 && <div className="worksheet-checklist"><strong>Self-check before submitting:</strong><ul>{classWorksheet.checklist.map((item, index) => <li key={index}>☐ {item}</li>)}</ul></div>}<div className="worksheet-actions"><button className="primary-button" type="button" onClick={() => window.print()}>🖨 Print</button><button className="outline-button" type="button" onClick={() => setWorksheetState('idle')}>Close</button></div></div></div>}

					</section>
				)}
			</main>
		</div>
	)
}

export default TeacherHome
