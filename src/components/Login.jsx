
import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      let user

      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (error) throw error
        user = data.user
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        })

        if (error) throw error

        if (!data.session) {
          setMessage(
            'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ'
          )
          return
        }

        user = data.user
      }

      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้งาน')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        throw new Error(
          'เข้าสู่ระบบสำเร็จ แต่ไม่สามารถอ่านข้อมูล Profile ได้: ' +
          profileError.message
        )
      }

      if (!profile || !['customer', 'staff', 'manager'].includes(profile.role)) {
        throw new Error('ไม่พบ Role ที่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ')
      }

      onLogin(profile)
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>🍽️</div>

        <h1 style={styles.title}>Smart Restaurant</h1>
        <p style={styles.subtitle}>
          Restaurant Inventory & Demand Forecasting System
        </p>

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
              setMessage('')
            }}
            style={mode === 'login' ? styles.activeTab : styles.tab}
          >
            เข้าสู่ระบบ
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError('')
              setMessage('')
            }}
            style={mode === 'signup' ? styles.activeTab : styles.tab}
          >
            สมัครสมาชิก
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div style={styles.field}>
              <label style={styles.label}>ชื่อ-นามสกุล</label>
              <input
                style={styles.input}
                type="text"
                placeholder="กรอกชื่อ-นามสกุล"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>อีเมล</label>
            <input
              style={styles.input}
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>รหัสผ่าน</label>
            <input
              style={styles.input}
              type="password"
              placeholder="กรอกรหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {message && <p style={styles.success}>{message}</p>}

          <button
            type="submit"
            disabled={loading}
            style={loading ? styles.disabledButton : styles.button}
          >
            {loading
              ? 'กำลังดำเนินการ...'
              : mode === 'login'
                ? 'เข้าสู่ระบบ'
                : 'สมัครสมาชิก'}
          </button>
        </form>

        <p style={styles.footer}>
          Smart Restaurant Management System
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    background: '#f3f5f0',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '430px',
    padding: '36px',
    background: '#ffffff',
    borderRadius: '18px',
    boxShadow: '0 8px 35px rgba(0,0,0,0.08)',
  },
  icon: {
    fontSize: '42px',
    textAlign: 'center',
    marginBottom: '12px',
  },
  title: {
    textAlign: 'center',
    color: '#244b38',
    fontSize: '27px',
    margin: '0 0 8px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#777',
    fontSize: '12px',
    marginBottom: '28px',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #ddd',
    marginBottom: '24px',
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    background: 'white',
    color: '#888',
    cursor: 'pointer',
    fontSize: '15px',
  },
  activeTab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    borderBottom: '3px solid #397653',
    background: 'white',
    color: '#244b38',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '15px',
  },
  field: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    outlineColor: '#397653',
  },
  button: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    background: '#397653',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
  disabledButton: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '8px',
    background: '#999',
    color: 'white',
    fontSize: '16px',
    cursor: 'not-allowed',
    marginTop: '8px',
  },
  error: {
    color: '#c0392b',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  success: {
    color: '#287a46',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  footer: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: '11px',
    marginTop: '25px',
  },
}

export default Login
