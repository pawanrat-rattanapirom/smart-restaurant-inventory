
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function CustomerMenu({ tableToken }) {
  const [menus, setMenus] = useState([])
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderId, setOrderId] = useState('')

  useEffect(() => {
    async function loadMenus() {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, description, price, image_url')
        .eq('is_available', true)
        .order('name')

      if (error) {
        setError('ไม่สามารถโหลดเมนูได้: ' + error.message)
      } else {
        setMenus(data || [])
      }

      setLoading(false)
    }

    loadMenus()
  }, [])

  const cartItems = useMemo(() => {
    return menus
      .filter(menu => Number(cart[menu.id] || 0) > 0)
      .map(menu => ({
        ...menu,
        quantity: Number(cart[menu.id]),
      }))
  }, [menus, cart])

  const total = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  )

  function changeQuantity(menuId, amount) {
    setCart(previous => {
      const nextQuantity = Math.max(
        0,
        Number(previous[menuId] || 0) + amount
      )

      return {
        ...previous,
        [menuId]: nextQuantity,
      }
    })
  }

  async function submitOrder() {
    if (!tableToken) {
      setError('ไม่พบ QR Token ของโต๊ะ')
      return
    }

    if (cartItems.length === 0) {
      setError('กรุณาเลือกอาหารก่อน')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const items = cartItems.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity,
      }))

      const { data, error } = await supabase.rpc(
        'create_guest_order',
        {
          p_table_token: tableToken,
          p_items: items,
        }
      )

      if (error) throw error

      setOrderId(data)
      setCart({})
    } catch (err) {
      setError(err.message || 'ส่งคำสั่งซื้อไม่สำเร็จ')
    } finally {
      setSubmitting(false)
    }
  }

  const money = amount =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 2,
    }).format(amount)

  if (loading) {
    return <div style={{ padding: 30 }}>กำลังโหลดเมนู...</div>
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f8f5',
      color: '#20352a',
      fontFamily: 'Arial, sans-serif',
      padding: 20,
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <header style={{
          background: '#174d36',
          color: 'white',
          padding: 25,
          borderRadius: 16,
          marginBottom: 22,
        }}>
          <div style={{ fontSize: 13, color: '#c5dfce' }}>
            SMART RESTAURANT
          </div>
          <h1 style={{ margin: '8px 0' }}>เมนูอาหาร</h1>
          <p style={{ margin: 0 }}>สั่งอาหารได้เลย ไม่ต้องสมัครสมาชิก</p>
        </header>

        {orderId ? (
          <section style={{
            background: 'white',
            padding: 30,
            borderRadius: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 style={{ color: '#176b45' }}>
              ส่งคำสั่งซื้อสำเร็จ!
            </h2>
            <p>ระบบได้รับคำสั่งซื้อของคุณแล้ว</p>
            <p style={{ color: '#718078' }}>หมายเลขออเดอร์</p>
            <strong style={{
              display: 'block',
              overflowWrap: 'anywhere',
              marginBottom: 20,
            }}>
              {orderId}
            </strong>
            <p>กรุณารอพนักงานยืนยันคำสั่งซื้อ</p>
            <button
              onClick={() => setOrderId('')}
              style={buttonStyle}
            >
              สั่งอาหารเพิ่มเติม
            </button>
          </section>
        ) : (
          <>
            {error && (
              <div style={{
                background: '#fff0f0',
                color: '#b42318',
                padding: 14,
                borderRadius: 10,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <h2>รายการอาหาร</h2>

            {menus.length === 0 ? (
              <p>ขณะนี้ยังไม่มีเมนูที่เปิดขาย</p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: 16,
              }}>
                {menus.map(menu => (
                  <div key={menu.id} style={{
                    background: 'white',
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid #e5eee8',
                  }}>
                    {menu.image_url && (
                      <img
                        src={menu.image_url}
                        alt={menu.name}
                        style={{
                          width: '100%',
                          height: 160,
                          objectFit: 'cover',
                        }}
                      />
                    )}

                    <div style={{ padding: 16 }}>
                      <h3 style={{ margin: '0 0 8px' }}>
                        {menu.name}
                      </h3>

                      <p style={{
                        color: '#718078',
                        fontSize: 13,
                        minHeight: 34,
                      }}>
                        {menu.description || ' '}
                      </p>

                      <strong style={{
                        color: '#176b45',
                        fontSize: 18,
                      }}>
                        {money(menu.price)}
                      </strong>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 15,
                      }}>
                        <button
                          onClick={() => changeQuantity(menu.id, -1)}
                          style={quantityButtonStyle}
                        >
                          −
                        </button>

                        <strong>
                          {cart[menu.id] || 0}
                        </strong>

                        <button
                          onClick={() => changeQuantity(menu.id, 1)}
                          style={quantityButtonStyle}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <section style={{
              background: 'white',
              padding: 22,
              borderRadius: 14,
              marginTop: 25,
              border: '1px solid #e5eee8',
            }}>
              <h2 style={{ marginTop: 0 }}>ตะกร้าของคุณ</h2>

              {cartItems.length === 0 ? (
                <p style={{ color: '#718078' }}>
                  ยังไม่ได้เลือกอาหาร
                </p>
              ) : (
                cartItems.map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: '1px solid #edf1ee',
                  }}>
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <strong>
                      {money(Number(item.price) * item.quantity)}
                    </strong>
                  </div>
                ))
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                margin: '20px 0',
                fontSize: 19,
              }}>
                <strong>ยอดรวม</strong>
                <strong style={{ color: '#176b45' }}>
                  {money(total)}
                </strong>
              </div>

              <button
                onClick={submitOrder}
                disabled={submitting || cartItems.length === 0}
                style={{
                  ...buttonStyle,
                  width: '100%',
                  opacity: submitting || cartItems.length === 0 ? 0.6 : 1,
                }}
              >
                {submitting ? 'กำลังส่งคำสั่งซื้อ...' : 'ยืนยันการสั่งอาหาร'}
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

const buttonStyle = {
  background: '#176b45',
  color: 'white',
  border: 'none',
  borderRadius: 9,
  padding: '13px 20px',
  fontWeight: 'bold',
  cursor: 'pointer',
}

const quantityButtonStyle = {
  background: '#eaf4ed',
  color: '#176b45',
  border: 'none',
  borderRadius: 8,
  width: 34,
  height: 34,
  fontSize: 20,
  cursor: 'pointer',
}

export default CustomerMenu
