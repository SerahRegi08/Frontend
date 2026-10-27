import React, { useState } from 'react'
import './Login.css'
import backgroundImage from './image.jpg'
import Signup from './signup'
import TeacherHome from './thome'
import StudentHome from './shome'
import { getRoleAccounts, DEMO_ACCOUNTS } from './authStore'

function Login() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [submitted, setSubmitted] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState('')

  // Session persistence across page reloads
  const [loggedInRole, setLoggedInRole] = useState(() => {
    try {
      return localStorage.getItem('cognify_active_role') || null
    } catch {
      return null
    }
  })
  const [loggedInUser, setLoggedInUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cognify_active_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      return Boolean(localStorage.getItem('cognify_active_role'))
    } catch {
      return false
    }
  })

  const [inputUsername, setInputUsername] = useState('')
  const [inputPassword, setInputPassword] = useState('')

  const roleName = selectedRole === 'teacher' ? 'Teacher' : 'Student'

  const openAuthPage = (role) => {
    setSelectedRole(role)
    setAuthMode('login')
    setSubmitted(false)
    setLoginError('')
    setSignupSuccess('')
    setInputUsername('')
    setInputPassword('')
  }

  const goHome = () => {
    setSelectedRole(null)
    setSubmitted(false)
    setLoginError('')
    setSignupSuccess('')
  }

  const performLogin = (role, account) => {
    setLoginError('')
    const profile = {
      username: account.username,
      fullName: account.fullName,
      email: account.email,
      school: account.school || '',
      board: account.board || '',
      className: account.className || '',
    }
    try {
      if (role === 'teacher') {
        localStorage.setItem('cognify_teacher_id', account.username || account.email)
        localStorage.setItem('cognify_teacher_profile', JSON.stringify(profile))
      } else {
        localStorage.setItem('cognify_student_id', account.username || account.email)
        localStorage.setItem('cognify_student_name', account.fullName || account.username || account.email)
        localStorage.setItem('cognify_student_profile', JSON.stringify(profile))
      }
      localStorage.setItem('cognify_active_role', role)
      localStorage.setItem('cognify_active_user', JSON.stringify({
        username: account.username,
        fullName: account.fullName,
        email: account.email,
      }))
    } catch {
      // non-critical storage fallback
    }

    setLoggedInUser({ username: account.username, fullName: account.fullName, email: account.email })
    setLoggedInRole(role)
    setLoggedIn(true)
    try {
      window.history.replaceState({ authenticated: true, role }, '', window.location.pathname)
    } catch {
      // ignore
    }
  }

  const login = async (event) => {
    event.preventDefault()
    const identifier = inputUsername.trim().toLowerCase()
    const password = inputPassword

    const accounts = getRoleAccounts(selectedRole)
    const account = accounts.find((savedAccount) => (
      (savedAccount.email?.toLowerCase() === identifier || savedAccount.username?.toLowerCase() === identifier) &&
      savedAccount.password === password
    ))

    if (!account) {
      setSubmitted(false)
      setLoginError('Incorrect credentials. Please verify your email/username and password.')
      return
    }

    performLogin(selectedRole, account)
  }

  const handleQuickDemoLogin = (role) => {
    const demo = DEMO_ACCOUNTS[role]
    if (demo) {
      performLogin(role, demo)
    }
  }

  const fillDemoCredentials = () => {
    const demo = DEMO_ACCOUNTS[selectedRole]
    if (demo) {
      setInputUsername(demo.email)
      setInputPassword(demo.password)
      setLoginError('')
    }
  }

  const handleSignupDone = () => {
    setAuthMode('login')
    setSignupSuccess('Account created successfully! Log in with your new credentials.')
    setLoginError('')
  }

  const logout = () => {
    try {
      localStorage.removeItem('cognify_active_role')
      localStorage.removeItem('cognify_active_user')
      window.history.replaceState(null, '', window.location.pathname)
    } catch {}
    setLoggedIn(false)
    setLoggedInRole(null)
    setLoggedInUser(null)
    setSelectedRole(null)
  }

  if (loggedIn) {
    if (loggedInRole === 'student') {
      return <StudentHome student={loggedInUser || {}} onLogout={logout} />
    }
    return <TeacherHome onLogout={logout} />
  }

  return (
    <div className="app">
      {!selectedRole ? (
        <div className="split-layout">
          <div className="left-panel">
            <div className="logo-container">
              <div className="logo-badge">
                <span className="logo-icon">🧠</span>
              </div>
              <h1 className="logo-name">COGNIFY</h1>
              <p className="logo-tagline">AI-Powered Education &amp; Diagnostic Learning</p>
            </div>

            <div className="feature-pills">
              <span className="feature-pill">✦ AI Paper Diagnostics</span>
              <span className="feature-pill">✦ Targeted Worksheets</span>
              <span className="feature-pill">✦ Real-time Analytics</span>
            </div>

            <p className="subtitle">Select your portal to continue</p>

            <div className="role-buttons">
              <div className="role-card">
                <button className="role-btn teacher-btn" onClick={() => openAuthPage('teacher')}>
                  <span className="role-icon">👨‍🏫</span>
                  <div className="role-info">
                    <strong>Teacher Portal</strong>
                    <span>Class rosters, scan answer papers &amp; track progress</span>
                  </div>
                  <span className="role-arrow">→</span>
                </button>
                <button
                  type="button"
                  className="quick-demo-link"
                  onClick={() => handleQuickDemoLogin('teacher')}
                  title="One-click test access as teacher"
                >
                  ⚡ Instant Demo Login
                </button>
              </div>

              <div className="role-card">
                <button className="role-btn student-btn" onClick={() => openAuthPage('student')}>
                  <span className="role-icon">👨‍🎓</span>
                  <div className="role-info">
                    <strong>Student Portal</strong>
                    <span>Submit assignments, view worksheets &amp; study plan</span>
                  </div>
                  <span className="role-arrow">→</span>
                </button>
                <button
                  type="button"
                  className="quick-demo-link"
                  onClick={() => handleQuickDemoLogin('student')}
                  title="One-click test access as student"
                >
                  ⚡ Instant Demo Login
                </button>
              </div>
            </div>
          </div>

          <div className="right-panel">
            <div className="hero-overlay">
              <div className="hero-content">
                <span className="hero-kicker">Next-Gen Education Platform</span>
                <h2>Smarter evaluations, personalized practice.</h2>
                <p>Cognify helps teachers understand true learning gaps beyond numbers, giving every student targeted practice to master difficult concepts.</p>
                <div className="hero-stats">
                  <div className="hero-stat">
                    <strong>100%</strong>
                    <span>Rubric-based Evaluation</span>
                  </div>
                  <div className="hero-stat">
                    <strong>Instant</strong>
                    <span>AI Practice Generation</span>
                  </div>
                  <div className="hero-stat">
                    <strong>Zero</strong>
                    <span>Manual Calculation</span>
                  </div>
                </div>
              </div>
            </div>
            <img src={backgroundImage} alt="Cognify Education Background" className="background-image" />
          </div>
        </div>
      ) : (
        <div className="split-layout auth-layout">
          <div className="auth-panel">
            <button className="back-btn" onClick={goHome}>
              ← Back to portal selection
            </button>
            <div className="auth-card">
              {authMode === 'signup' ? (
                <Signup roleName={roleName} onLogin={handleSignupDone} />
              ) : (
                <>
                  <div className="auth-header">
                    <p className="auth-kicker">Cognify Portal</p>
                    <h2>{roleName} Login</h2>
                    <p className="auth-subtitle">
                      Sign in to continue to your {roleName.toLowerCase()} workspace.
                    </p>
                  </div>

                  <div className="demo-credentials-banner">
                    <div className="demo-badge-row">
                      <span className="demo-pill">💡 Demo Account Ready</span>
                      <button type="button" className="fill-demo-btn" onClick={fillDemoCredentials}>
                        Fill Credentials
                      </button>
                    </div>
                    <p className="demo-hint">
                      Username: <strong>{DEMO_ACCOUNTS[selectedRole].email}</strong> · Password: <strong>{DEMO_ACCOUNTS[selectedRole].password}</strong>
                    </p>
                  </div>

                  <form className="auth-form" onSubmit={login}>
                    <label>
                      Email or Username
                      <input
                        type="text"
                        name="username"
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        placeholder="you@cognify.edu or username"
                        required
                        autoFocus
                      />
                    </label>
                    <label>
                      Password
                      <input
                        type="password"
                        name="password"
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                    </label>

                    {loginError && <p className="login-error">{loginError}</p>}
                    {signupSuccess && <p className="signup-success-banner">{signupSuccess}</p>}
                    {submitted && <p className="form-message">Logging in...</p>}

                    <button className="submit-btn" type="submit">
                      Sign in as {roleName}
                    </button>
                    <button
                      type="button"
                      className="demo-direct-btn"
                      onClick={() => handleQuickDemoLogin(selectedRole)}
                    >
                      ⚡ Quick 1-Click Demo Login
                    </button>
                  </form>

                  <p className="switch-auth">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup')
                        setSubmitted(false)
                        setLoginError('')
                        setSignupSuccess('')
                      }}
                    >
                      Create account
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="right-panel">
            <div className="hero-overlay">
              <div className="hero-content">
                <span className="hero-kicker">{roleName} Portal</span>
                <h2>{selectedRole === 'teacher' ? 'Empower your teaching with diagnostics' : 'Master your subjects step-by-step'}</h2>
                <p>
                  {selectedRole === 'teacher'
                    ? 'Upload student work, discover root stumbling blocks, and automatically assign adaptive worksheets tailored to each student.'
                    : 'Get constructive feedback on your answers, practice tailored questions, and stay ahead with organized study plans.'}
                </p>
              </div>
            </div>
            <img src={backgroundImage} alt="Cognify Education Background" className="background-image" />
          </div>
        </div>
      )}
    </div>
  )
}

export default Login