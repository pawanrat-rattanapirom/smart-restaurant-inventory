
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function StaffDashboard({ profile, onLogout }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState('')

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        table_number,
        total_amount,
        status,
        created_at,
        order_items (
          id,
          quantity,
          unit_price,
          menu_items (
            name
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setOrders(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  async function confirmOrder(orderId) {
    const accepted = window.confirm(
      'ยืนยันออเดอร์นี้และตัดสต็อกวัตถุดิบใช่หรือไม่?'
    )

    if (!accepted) return

    setConfirming(orderId)
    setError('')

    try {
      const { data, error } = await supabase.rpc(
        'confirm_order',
        { p_order_id: orderId }
      )

      if (error) throw error
      if (data !== true) throw new Error('ไม่สามารถยืนยันออเดอร์ได้')

      await loadOrders()
    } catch (err) {
      setError(err.message || 'ยืนยันออเดอร์ไม่สำเร็จ')
    } finally {
      setConfirming('')
    }
  }

  const money = amount =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 2,
    }).format(Number(amount || 0))

  const dateTime = value =>
    new Date(value).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f8f5',
      color: '#20352a',
      padding: 30,
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 15,
          marginBottom: 25,
        }}>
          <div>
            <h1 style={{ margin: 0 }}>Staff Dashboard</h1>
            <p style={{ color: '#718078' }}>
              ยินดีต้อนรับ {profile?.full_name}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={loadOrders} style={secondaryButton}>
              ↻ รีเฟรช
            </button>
            <button onClick={onLogout} style={logoutButton}>
              ออกจากระบบ
            </button>
          </div>
        </header>

        <div style={{
          background: '#174d36',
          color: 'white',
          padding: 20,
          borderRadius: 14,
          marginBottom: 20,
        }}>
          <h2 style={{ margin: 0 }}>รายการออเดอร์ที่รอยืนยัน</h2>
          <p style={{ marginBottom: 0, color: '#d4e7da' }}>
            {orders.length} รายการ
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fff0f0',
            color: '#b42318',
            padding: 14,
            borderRadius: 10,
            marginBottom: 15,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <p>กำลังโหลดออเดอร์...</p>
        ) : orders.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: 40 }}>🍽️</div>
            <h3>ยังไม่มีออเดอร์ใหม่</h3>
            <p style={{ color: '#718078' }}>
              เมื่อมีลูกค้าสั่งอาหาร รายการจะแสดงที่หน้านี้
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 18,
          }}>
            {orders.map(order => (
              <section key={order.id} style={cardStyle}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center',
                }}>
                  <div>
                    <small style={{ color: '#718078' }}>TABLE</small>
                    <h2 style={{
                      color: '#176b45',
                      margin: '3px 0',
                    }}>
                      {order.table_number
                        ? `โต๊ะ ${order.table_number}`
                        : 'ออเดอร์เดิม'}
                    </h2>
                  </div>

                  <span style={{
                    background: '#fff4df',
                    color: '#a15c00',
                    padding: '6px 10px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}>
                    รอยืนยัน
                  </span>
                </div>

                <p style={{
                  color: '#718078',
                  fontSize: 12,
                }}>
                  {dateTime(order.created_at)}
                </p>

                <div style={{
                  borderTop: '1px solid #edf1ee',
                  borderBottom: '1px solid #edf1ee',
                  padding: '12px 0',
                  margin: '12px 0',
                }}>
                  {(order.order_items || []).map(item => (
                    <div key={item.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '6px 0',
                    }}>
                      <span>
                        {item.menu_items?.name || 'เมนู'}
                        {' × '}
                        {item.quantity}
                      </span>
                      <strong>
                        {money(Number(item.unit_price) * item.quantity)}
                      </strong>
                    </div>
                  ))}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 15,
                  fontSize: 17,
                }}>
                  <strong>ยอดรวม</strong>
                  <strong style={{ color: '#176b45' }}>
                    {money(order.total_amount)}
                  </strong>
                </div>

                <button
                  onClick={() => confirmOrder(order.id)}
                  disabled={confirming === order.id}
                  style={{
                    ...confirmButton,
                    opacity: confirming === order.id ? 0.6 : 1,
                  }}
                >
                  {confirming === order.id
                    ? 'กำลังยืนยัน...'
                    : '✓ ยืนยันออเดอร์และตัดสต็อก'}
                </button>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const cardStyle = {
  background: 'white',
  border: '1px solid #e5eee8',
  borderRadius: 14,
  padding: 20,
}

const emptyStyle = {
  background: 'white',
  padding: 45,
  borderRadius: 14,
  textAlign: 'center',
}

const confirmButton = {
  width: '100%',
  background: '#176b45',
  color: 'white',
  border: 'none',
  borderRadius: 9,
  padding: 13,
  fontWeight: 'bold',
  cursor: 'pointer',
}

const secondaryButton = {
  background: '#eaf4ed',
  color: '#176b45',
  border: 'none',
  borderRadius: 8,
  padding: '10px 14px',
  cursor: 'pointer',
}

const logoutButton = {
  background: 'white',
  color: '#174d36',
  border: '1px solid #d7e8dc',
  borderRadius: 8,
  padding: '10px 14px',
  cursor: 'pointer',
}

export default StaffDashboard
