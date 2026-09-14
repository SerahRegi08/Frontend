import React, { useMemo, useState } from 'react'
import './myclass.css'
import { getTeacherProfile } from './profile'

const statusLabels = { above: 'Above average', average: 'Average', below: 'Below average' }
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000'
const getStudentStatus = student => student.performanceLevel || (student.score >= 75 ? 'above' : student.score >= 50 ? 'average' : 'below')
const getStudentSolution = student => {
	if (student.recommendations && student.recommendations.length > 0) return student.recommendations.join('; ')
	if (student.specialCare) return 'Start with basics: definitions + core concepts first'
	if (student.numericalSkills === 'needs-support') return 'Targeted numerical practice with formula sheets'
	return '—'
}

function MyClasses({ classList, onAddClass, onAddStudent, onStudentAnalysis, onDeleteClass, onWorksheetSaved }) {
	const [selectedClassId, setSelectedClassId] = useState(null)
	const [showAddStudent, setShowAddStudent] = useState(false)
	const [newStudentName, setNewStudentName] = useState('')
	const [paper, setPaper] = useState(null)
	const [scanState, setScanState] = useState('idle')
	const [studentName, setStudentName] = useState('')
	const [analysisError, setAnalysisError] = useState('')
	const [lastAnalysis, setLastAnalysis] = useState(null)
	const [worksheet, setWorksheet] = useState(null)
	const [worksheetState, setWorksheetState] = useState('idle')
	const [worksheetError, setWorksheetError] = useState('')
	const selectedClass = classList.find(classItem => classItem.id === selectedClassId)
	const getClassMetrics = classItem => {
		const students = classItem.studentsList || []
		const groups = students.reduce((result, student) => {
			result[getStudentStatus(student)] += 1
			return result
		}, { above: 0, average: 0, below: 0 })
		return { ...groups, specialCare: students.filter(student => student.specialCare).length, numericalSkills: students.filter(student => student.numericalSkills === 'needs-support').length }
	}
	const selectedMetrics = useMemo(() => selectedClass ? getClassMetrics(selectedClass) : null, [selectedClass])
	const submitStudent = event => {
		event.preventDefault()
		const studentName = newStudentName.trim()
		if (!studentName || !selectedClass) return
		onAddStudent(selectedClass.id, studentName)
		setNewStudentName('')
		setShowAddStudent(false)
	}
	const scanPaper = async event => {
		const selectedFile = event.target.files[0]
		if (!selectedFile) return
		if (!studentName.trim()) {
			setAnalysisError('Enter the student name before uploading a paper.')
			event.target.value = ''
			return
		}
		setPaper(selectedFile)
		setScanState('scanning')
		setAnalysisError('')
		setLastAnalysis(null)
		setWorksheet(null)
		setWorksheetState('idle')
		setWorksheetError('')
		try {
			const formData = new FormData()
			formData.append('paper', selectedFile)
			formData.append('studentName', studentName.trim())
			const teacherProfile = getTeacherProfile()
			if (teacherProfile.school) formData.append('school', teacherProfile.school)
			if (teacherProfile.board) formData.append('board', teacherProfile.board)
			const response = await fetch(`${API_BASE}/api/classes/${selectedClass.id}/analyze`, { method: 'POST', headers: { 'X-Local-Teacher-ID': localStorage.getItem('cognify_teacher_id') || 'local-teacher' }, body: formData })
			const result = await response.json()
			if (!response.ok) throw new Error(result.error || 'Could not analyse paper')
			onStudentAnalysis(selectedClass.id, result.student)
			setLastAnalysis(result.student)
			setScanState('complete')
		} catch (error) {
			setScanState('idle')
			setAnalysisError(error.message)
		}
	}
	const generateWorksheet = async () => {
		if (!lastAnalysis) return
		setWorksheetState('loading')
		setWorksheetError('')
		try {
			const response = await fetch(`${API_BASE}/api/worksheet`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentName: lastAnalysis.name,
					performanceLevel: getStudentStatus(lastAnalysis),
					weakTopics: lastAnalysis.weakTopics || [],
					weakAreas: lastAnalysis.supportNeeds || [],
				}),
			})
			const result = await response.json()
			if (!response.ok) throw new Error(result.error || 'Could not generate worksheet')
			setWorksheet(result.worksheet)
			setWorksheetState('complete')
			if (onWorksheetSaved) onWorksheetSaved({
				title: result.worksheet.title,
				studentName: lastAnalysis.name,
				className: selectedClass.name,
				source: 'ai',
				worksheet: result.worksheet,
			})
		} catch (error) {
			setWorksheetState('idle')
			setWorksheetError(error.message)
		}
	}

	const handleDeleteCurrentClass = () => {
		if (!selectedClass || !onDeleteClass) return
		if (onDeleteClass(selectedClass.id)) setSelectedClassId(null)
	}

	if (selectedClass) {
		const students = selectedClass.studentsList || []
		return (
			<section className="classes-view">
				<button className="dashboard-back-button" type="button" onClick={() => setSelectedClassId(null)}>← Back to all classes</button>
				<div className="class-detail-heading"><div><p className="section-kicker">Class overview</p><h1>{selectedClass.name}</h1><p className="detail-subtitle">{students.length} students · {selectedClass.classAverage}% class average</p></div><div className="detail-actions"><button className="delete-class-btn" type="button" onClick={handleDeleteCurrentClass}>🗑 Delete class</button><button className="outline-button" type="button" onClick={onAddClass}>＋ Add class</button></div></div>
				<div className="detail-metrics"><article><strong>{selectedMetrics.above}</strong><span>Above average</span></article><article><strong>{selectedMetrics.average}</strong><span>Average students</span></article><article className="metric-warning"><strong>{selectedMetrics.below}</strong><span>Below average</span></article><article className="metric-warning"><strong>{selectedMetrics.specialCare}</strong><span>Need special care</span></article><article><strong>{selectedMetrics.numericalSkills}</strong><span>Need numerical skills</span></article></div>
				<div className="student-panel"><div className="panel-heading"><div><p className="section-kicker">Learner list</p><h2>Students</h2></div><div className="panel-actions"><span>{students.length} enrolled</span><button className="add-student-button" type="button" onClick={() => setShowAddStudent(true)}>＋ Add student</button></div></div>{students.length === 0 ? <div className="empty-students"><strong>No students added yet</strong><span>Use the button above to add the first student to this class.</span></div> : <div className="student-table" role="table" aria-label={`Students in ${selectedClass.name}`}><div className="student-row student-row-header" role="row"><span>Student</span><span>Performance</span><span>Support</span><span>AI insights</span><span>Suggested solution</span></div>{students.map(student => { const status = getStudentStatus(student); return <div className="student-row" role="row" key={student.id}><strong>{student.name}</strong><span className={`status-pill ${status}`}>{statusLabels[status]}</span><span>{student.specialCare ? 'Special care' : student.numericalSkills === 'needs-support' ? 'Numerical skills' : student.supportNeeds?.[0] || 'Awaiting paper'}</span><span className="student-insight">{student.insights || 'Awaiting paper scan'}</span><span className="student-solution">{getStudentSolution(student)}</span></div> })}</div>}</div>
				<div className="class-scanner"><div className="section-heading"><div><p className="section-kicker">Class assessment</p><h2>Scan student paper</h2></div><span className="detail-subtitle">Upload work for {selectedClass.name}</span></div><div className="scanner-layout"><div><label className="upload-zone"><input type="file" accept="image/*,.pdf" onChange={scanPaper} /><span className="upload-icon">＋</span><strong>{paper ? paper.name : 'Upload a paper'}</strong><span>Choose an image or PDF to analyse this classwork</span></label><label className="student-name-field">Student name<input type="text" value={studentName} onChange={event => setStudentName(event.target.value)} placeholder="Enter the student name" /></label>{analysisError && <p className="analysis-error">{analysisError}</p>}</div><div className="analysis-panel"><div className="analysis-header"><span className="ai-dot">✦</span><div><p className="section-kicker">Mistral AI</p><h2>Paper insights</h2></div></div>{scanState === 'idle' && <p className="empty-analysis">Enter a student name and upload their paper. Mistral will assess performance from the written work, not just marks.</p>}{scanState === 'scanning' && <p className="scan-status">Reading the paper and evaluating definitions, numericals, formulas, reasoning, and presentation...</p>}{scanState === 'complete' && <><p className="scan-status success">Scan complete. The student list now includes this paper's AI insight.</p><button className="primary-button worksheet-button" type="button" onClick={generateWorksheet} disabled={worksheetState === 'loading'}>{worksheetState === 'loading' ? 'Generating worksheet…' : '📝 Generate worksheet for this student'}</button>{worksheetError && <p className="analysis-error">{worksheetError}</p>}</>}</div></div></div>
				{showAddStudent && <div className="student-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setShowAddStudent(false)}><form className="student-modal" onSubmit={submitStudent}><div className="modal-heading"><div><p className="section-kicker">{selectedClass.name}</p><h2>Add student</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setShowAddStudent(false)}>×</button></div><label>Student name<input autoFocus type="text" value={newStudentName} onChange={event => setNewStudentName(event.target.value)} placeholder="For example, Maya Patel" required /></label><button className="primary-button modal-submit" type="submit">Add student</button></form></div>}
				{worksheetState === 'complete' && worksheet && <div className="student-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setWorksheetState('idle')}><div className="worksheet-modal" role="dialog" aria-label="Generated worksheet"><div className="modal-heading"><div><p className="section-kicker">Targeted practice{worksheet.aiGenerated ? '' : ' (template)'}</p><h2>{worksheet.title}</h2></div><button type="button" className="close-button" aria-label="Close" onClick={() => setWorksheetState('idle')}>×</button></div><p className="worksheet-instructions">{worksheet.instructions}</p><ol className="worksheet-questions">{worksheet.questions.map((item, index) => <li key={index}><strong>{item.topic}: </strong>{item.q}{item.hint && <span className="worksheet-hint"> Hint: {item.hint}</span>}</li>)}</ol>{worksheet.checklist && worksheet.checklist.length > 0 && <div className="worksheet-checklist"><strong>Self-check before submitting:</strong><ul>{worksheet.checklist.map((item, index) => <li key={index}>☐ {item}</li>)}</ul></div>}<div className="worksheet-actions"><button className="primary-button" type="button" onClick={() => window.print()}>🖨 Print</button><button className="outline-button" type="button" onClick={() => setWorksheetState('idle')}>Close</button></div></div></div>}
			</section>
		)
	}

	return (
		<section className="classes-view"><div className="class-detail-heading"><div><p className="section-kicker">Teacher workspace</p><h1>My classes</h1><p className="detail-subtitle">Select a class to explore student progress and support needs.</p></div><button className="primary-button" type="button" onClick={onAddClass}>＋ Add class</button></div>		<div className="my-class-grid">{classList.map(classItem => { const metrics = getClassMetrics(classItem); return <article className="my-class-card" key={classItem.id} role="button" tabIndex={0} aria-label={`Open ${classItem.name}`} onClick={() => setSelectedClassId(classItem.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedClassId(classItem.id); } }}><div className="class-card-top"><span className="class-icon">{classItem.icon}</span><span className="card-top-actions"><button className="card-delete" type="button" aria-label={`Delete ${classItem.name}`} title={`Delete ${classItem.name}`} onClick={event => { event.stopPropagation(); onDeleteClass && onDeleteClass(classItem.id); }}>🗑</button><span className="card-arrow">↗</span></span></div><h2>{classItem.name}</h2><div className="class-card-stats"><span><strong>{(classItem.studentsList || []).length}</strong>Students</span><span><strong>{classItem.classAverage}%</strong>Class average</span></div><div className="class-card-footer"><span>{metrics.specialCare} need special care</span><span>{metrics.below} below average</span></div></article> })}</div></section>
	)
}

export default MyClasses
