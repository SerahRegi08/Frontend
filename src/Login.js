import React, { useState } from 'react'
import './Login.css'
import backgroundImage from './image.jpg'
import Signup from './signup'
import TeacherHome from './thome'
import StudentHome from './shome'
import { getRoleAccounts } from './authStore'

function Login() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [submitted, setSubmitted] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [loggedInRole, setLoggedInRole] = useState(null)
  const [loggedInUser, setLoggedInUser] = useState(null)

  const roleName = selectedRole === 'teacher' ? 'Teacher' : 'Student'

  const openAuthPage = role => {
    setSelectedRole(role)
    setAuthMode('login')
    setSubmitted(false)
    setLoginError('')
  }

  const goHome = () => {
    setSelectedRole(null)
    setSubmitted(false)
    setLoginError('')
  }

  const login = async event => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const identifier = formData.get('username').trim().toLowerCase()
    const password = formData.get('password')
    // Role-separated store: teacher credentials can never match here on the
    // student side and vice versa.
    const accounts = getRoleAccounts(selectedRole)
    const account = accounts.find(savedAccount => (
      (savedAccount.email?.toLowerCase() === identifier || savedAccount.username?.toLowerCase() === identifier) &&
      savedAccount.password === password
    ))

    if (!account) {
      setSubmitted(false)
      setLoginError('Incorrect credentials. Check your email or username and password.')
      return
    }

    setLoginError('')
    const profile = {
      username: account.username,
      fullName: account.fullName,
      email: account.email,
      school: account.school || '',
      board: account.board || '',
      className: account.className || '',
    }
    if (selectedRole === 'teacher') {
      localStorage.setItem('cognify_teacher_id', account.username || account.email)
      localStorage.setItem('cognify_teacher_profile', JSON.stringify(profile))
    } else {
      localStorage.setItem('cognify_student_id', account.username || account.email)
      localStorage.setItem('cognify_student_name', account.fullName || account.username || account.email)
      localStorage.setItem('cognify_student_profile', JSON.stringify(profile))
    }
    setLoggedInUser({ username: account.username, fullName: account.fullName, email: account.email })
    setLoggedIn(true)
    setLoggedInRole(selectedRole)
  }

  if (loggedIn) {
    const logout = () => {
      setLoggedIn(false)
      setLoggedInRole(null)
      setLoggedInUser(null)
      setSelectedRole(null)
    }
    if (loggedInRole === 'student') {
      return <StudentHome student={loggedInUser || {}} onLogout={logout} />
    }

    return <TeacherHome onLogout={() => {
      setLoggedIn(false)
      setLoggedInRole(null)
      setLoggedInUser(null)
      setSelectedRole(null)
    }} />
  }

  return (
    <div className="app">
      {!selectedRole ? (
        <div className="split-layout">
          <div className="left-panel">
            <div className="logo">
              <span className="logo-icon">🧠</span>
              <h1 className="logo-name">COGNIFY</h1>
            </div>

            <p className="subtitle">Choose your role to continue</p>

            <div className="role-buttons">
              <button className="role-btn" onClick={() => openAuthPage('teacher')}>
                👨‍🏫 Teacher Login
              </button>
              <button className="role-btn" onClick={() => openAuthPage('student')}>
                👨‍🎓 Student Login
              </button>
            </div>
          </div>

          <div className="right-panel">
            <img src={backgroundImage} alt="Background" className="background-image" />
          </div>
        </div>
      ) : (
        <div className="split-layout auth-layout">
          <div className="auth-panel">
            <button className="back-btn" onClick={goHome}>← Back to home</button>
            <div className="auth-card">
              {authMode === 'signup' ? (
                <Signup roleName={roleName} onLogin={() => setAuthMode('login')} />
              ) : (<>
                <p className="auth-kicker">Cognify</p>
                <h2>{roleName} Login</h2>
                <p className="auth-subtitle">Sign in to continue as a {roleName.toLowerCase()}.</p>
                <form className="auth-form" onSubmit={login}>
                <label>
                  Gmail or username
                  <input type="text" name="username" placeholder="you@gmail.com" required />
                </label>
                <label>
                  Password
                  <input type="password" name="password" placeholder="Enter your password" required />
                </label>
                <button className="submit-btn" type="submit">
                  Log in
                </button>
                </form>

                {loginError && <p className="login-error">{loginError}</p>}
                {submitted && <p className="form-message">Login details submitted.</p>}

                <p className="switch-auth">
                  Don't have an account?{' '}
                <button type="button" onClick={() => {
                  setAuthMode('signup')
                  setSubmitted(false)
                  setLoginError('')
                }}>
                  Sign up
                </button>
                </p>
              </>)}
            </div>
          </div>
          <div className="right-panel">
            <img src={backgroundImage} alt="Background" className="background-image" />
          </div>
        </div>
      )}
    </div>
  )
}

export default Login