
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import CustomerMenu from './components/CustomerMenu'
import StaffDashboard from './components/StaffDashboard'
import ManagerDashboard from './components/ManagerDashboard'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const tableToken = new URLSearchParams(
    window.location.search
  ).get('table_token')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        if (mounted) {
          setError(error.message)
          setLoading(false)
        }
        return
      }

      if (mounted) {
        setSession(data.session)
      }

      if (data.session?.user) {
        await loadProfile(data.session.user.id)
      } else if (mounted) {
        setLoading(false)
      }
    }

    async function loadProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', userId)
        .single()

      if (!mounted) return

      if (error) {
        setError('ไม่สามารถโหลดข้อมูลผู้ใช้: ' + error.message)
        setProfile(null)
      } else {
        setProfile(data)
        setError('')
      }

      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'INITIAL_SESSION') return

      setSession(newSession)

      if (!newSession) {
        setProfile(null)
        setError('')
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        setLoading(true)
        setTimeout(() => {
          loadProfile(newSession.user.id)
        }, 0)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleLogin = userProfile => {
    setProfile(userProfile)
    setError('')
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
  }

  // Guest ordering does not require login.
  if (tableToken) {
    return <CustomerMenu tableToken={tableToken} />
  }

  if (loading) {
    return <div style={{ padding: 40 }}>กำลังโหลดข้อมูล...</div>
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h2>เกิดข้อผิดพลาด</h2>
        <p>{error}</p>
        <button onClick={handleLogout}>ออกจากระบบ</button>
      </div>
    )
  }

  if (!session || !profile) {
    return <Login onLogin={handleLogin} />
  }

  switch (profile.role) {
    case 'customer':
      return <CustomerMenu profile={profile} onLogout={handleLogout} />
    case 'staff':
      return <StaffDashboard profile={profile} onLogout={handleLogout} />
    case 'manager':
      return <ManagerDashboard profile={profile} onLogout={handleLogout} />
    default:
      return <Login onLogin={handleLogin} />
  }
}

export default App
