import React, { useMemo, useState } from 'react'
import './signup.css'
import { getRoleUsernames, saveRoleAccount, saveRoleUsername } from './authStore'

const reservedUsernames = ['admin', 'teacher', 'student', 'cognify']
const demoOtp = '123456'

const normalizeUsername = value => value.toLowerCase().replace(/[^a-z0-9]/g, '')

function Signup({ roleName, onLogin }) {
	const [fullName, setFullName] = useState('')
	const [email, setEmail] = useState('')
	const [username, setUsername] = useState('')
	const [usernameEdited, setUsernameEdited] = useState(false)
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [phone, setPhone] = useState('')
	const [otp, setOtp] = useState('')
	const [otpSent, setOtpSent] = useState(false)
	const [otpVerified, setOtpVerified] = useState(false)
	const [school, setSchool] = useState('')
	const [board, setBoard] = useState('')
	const [className, setClassName] = useState('')
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')

	const isStudent = String(roleName || '').toLowerCase() === 'student'

	const suggestions = useMemo(() => {
		const words = fullName.trim().toLowerCase().split(/\s+/).filter(Boolean)
		if (!words.length) return []

		const firstName = normalizeUsername(words[0])
		const lastName = normalizeUsername(words[words.length - 1])
		const initials = words.map(word => word[0]).join('')
		return [...new Set([
			`${firstName}${lastName}`,
			`${firstName}.${lastName}`,
			`${firstName}${initials}`,
		])].filter(Boolean)
	}, [fullName])

	const getSavedUsernames = () => getRoleUsernames(roleName)

	const isUsernameAvailable = value => {
		const candidate = normalizeUsername(value)
		const takenUsernames = [...reservedUsernames, ...getSavedUsernames()]
		return candidate.length >= 3 && !takenUsernames.some(name => normalizeUsername(name) === candidate)
	}

	const updateName = event => {
		const value = event.target.value
		setFullName(value)
		if (!usernameEdited) setUsername(normalizeUsername(value.trim().split(/\s+/).join('')))
		setError('')
	}

	const selectSuggestion = suggestion => {
		setUsername(suggestion)
		setUsernameEdited(true)
		setError('')
	}

	const sendOtp = () => {
		if (!/^\+?[0-9 ()-]{8,}$/.test(phone)) {
			setError('Enter a valid phone number before requesting an OTP.')
			return
		}
		setOtpSent(true)
		setOtpVerified(false)
		setMessage(`Demo OTP sent. Enter ${demoOtp} to verify this phone number.`)
		setError('')
	}

	const verifyOtp = () => {
		if (otp === demoOtp) {
			setOtpVerified(true)
			setError('')
			setMessage('Phone number verified successfully.')
		} else {
			setError('That OTP is not correct. Please try again.')
		}
	}

	const submitSignup = event => {
		event.preventDefault()
		setError('')
		setMessage('')

		if (!isUsernameAvailable(username)) {
			setError('That username is already taken. Choose another one.')
			return
		}
		if (password.length < 8) {
			setError('Your password must be at least 8 characters.')
			return
		}
		if (password !== confirmPassword) {
			setError('Passwords do not match.')
			return
		}
		if (!school.trim()) {
			setError('Enter your school name.')
			return
		}
		if (!board) {
			setError('Select your board.')
			return
		}
		if (isStudent && !className.trim()) {
			setError('Enter your class.')
			return
		}
		if (!otpVerified) {
			setError('Verify your phone number with the OTP before signing up.')
			return
		}

		saveRoleUsername(roleName, username)
		saveRoleAccount(roleName, {
			role: roleName.toLowerCase(),
			fullName,
			email: email.toLowerCase(),
			username: username.toLowerCase(),
			password,
			school: school.trim(),
			board,
			...(isStudent ? { className: className.trim() } : {}),
		})
		onLogin()
	}

	return (
		<div className="signup-card">
			<p className="signup-kicker">New {roleName} account</p>
			<h2>Create your account</h2>
			<p className="signup-subtitle">Set up your Cognify profile to get started.</p>

			<form className="signup-form" onSubmit={submitSignup}>
				<div className="signup-row">
					<label>
						Full name
						<input type="text" value={fullName} onChange={updateName} placeholder="Your full name" required />
					</label>
					<label>
						Gmail address
						<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@gmail.com" required />
					</label>
				</div>

				<label>
					Username
					<input
						type="text"
						value={username}
						onChange={event => {
							setUsername(event.target.value)
							setUsernameEdited(true)
							setError('')
						}}
						placeholder="Choose a username"
						required
					/>
					{suggestions.length > 0 && (
						<span className="suggestion-label">Suggestions based on your name</span>
					)}
					<div className="username-suggestions">
						{suggestions.map(suggestion => (
							<button type="button" key={suggestion} onClick={() => selectSuggestion(suggestion)}>
								{suggestion}
							</button>
						))}
					</div>
					{username && (
						<span className={isUsernameAvailable(username) ? 'availability available' : 'availability taken'}>
							{isUsernameAvailable(username) ? 'Username is available' : 'Username is already taken'}
						</span>
					)}
				</label>

				<div className="signup-row">
					<label>
						Create password
						<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" required />
					</label>
					<label>
						Confirm password
						<input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat your password" required />
					</label>
				</div>

				<div className="signup-row">
					<label>
						School name
						<input type="text" value={school} onChange={event => setSchool(event.target.value)} placeholder="For example, ABC School" required />
					</label>
					<label>
						Board
						<select value={board} onChange={event => setBoard(event.target.value)} required>
							<option value="">Select board</option>
							<option value="CBSE">CBSE</option>
							<option value="ICSE">ICSE</option>
							<option value="State">State</option>
							<option value="Other">Other</option>
						</select>
					</label>
				</div>

				{isStudent && (
					<label>
						Class
						<input type="text" value={className} onChange={event => setClassName(event.target.value)} placeholder="For example, 10A" required />
					</label>
				)}

				<label>
					Phone number
					<div className="phone-row">
						<input type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="+1 555 123 4567" required />
						<button type="button" className="otp-btn" onClick={sendOtp}>Send OTP</button>
					</div>
				</label>

				{otpSent && (
					<label>
						Verification OTP
						<div className="phone-row">
							<input type="text" value={otp} onChange={event => setOtp(event.target.value)} placeholder="Enter 6-digit OTP" maxLength="6" required />
							<button type="button" className="otp-btn" onClick={verifyOtp}>
								{otpVerified ? 'Verified' : 'Verify'}
							</button>
						</div>
					</label>
				)}

				{error && <p className="signup-error">{error}</p>}
				{message && <p className="signup-message">{message}</p>}
				<button className="submit-btn" type="submit">Create account</button>
			</form>

			<p className="signup-login-link">
				Already have an account? <button type="button" onClick={onLogin}>Log in</button>
			</p>
		</div>
	)
}

export default Signup
