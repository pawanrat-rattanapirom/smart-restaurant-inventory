
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const money = value =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(value || 0)

const dateValue = date => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const displayDate = date =>
  new Date(date).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })

function SalesReports() {
  const today = dateValue(new Date())
  const defaultStart = new Date()
  defaultStart.setDate(defaultStart.getDate() - 29)

  const [startDate, setStartDate] = useState(dateValue(defaultStart))
  const [endDate, setEndDate] = useState(today)
  const [orders, setOrders] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadReports() {
    setLoading(true)
    setError('')

    try {
      if (startDate > endDate) {
        throw new Error('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด')
      }

      const nextDay = new Date(`${endDate}T00:00:00`)
      nextDay.setDate(nextDay.getDate() + 1)

      const endExclusive = dateValue(nextDay)

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('status', 'confirmed')
        .gte('created_at', `${startDate}T00:00:00`)
        .lt('created_at', `${endExclusive}T00:00:00`)
        .order('created_at', { ascending: false })

      if (orderError) throw orderError

      const orderIds = (orderData || []).map(order => order.id)

      let itemData = []

      if (orderIds.length > 0) {
        const { data, error: itemError } = await supabase
          .from('order_items')
          .select(`
            order_id,
            menu_item_id,
            quantity,
            unit_price,
            menu_items (name)
          `)
          .in('order_id', orderIds)

        if (itemError) throw itemError
        itemData = data || []
      }

      setOrders(orderData || [])
      setItems(itemData)
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดรายงานยอดขายได้')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  )

  const totalOrders = orders.length

  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  )

  const menuSummary = useMemo(() => {
    const summary = new Map()

    items.forEach(item => {
      const id = item.menu_item_id
      const name = item.menu_items?.name || 'ไม่ทราบชื่อเมนู'

      if (!summary.has(id)) {
        summary.set(id, {
          id,
          name,
          quantity: 0,
          sales: 0,
        })
      }

      const row = summary.get(id)
      row.quantity += Number(item.quantity || 0)
      row.sales +=
        Number(item.quantity || 0) * Number(item.unit_price || 0)
    })

    return [...summary.values()].sort(
      (a, b) => b.quantity - a.quantity
    )
  }, [items])

  const dailySummary = useMemo(() => {
    const summary = new Map()

    orders.forEach(order => {
      const day = dateValue(new Date(order.created_at))

      if (!summary.has(day)) {
        summary.set(day, {
          date: day,
          sales: 0,
          orders: 0,
        })
      }

      const row = summary.get(day)
      row.sales += Number(order.total_amount || 0)
      row.orders += 1
    })

    return [...summary.values()].sort(
      (a, b) => a.date.localeCompare(b.date)
    )
  }, [orders])

  const maxDailySales = Math.max(
    ...dailySummary.map(day => day.sales),
    1
  )

  const maxMenuQuantity = Math.max(
    ...menuSummary.map(menu => menu.quantity),
    1
  )

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e5eee8',
    borderRadius: 15,
    padding: 20,
    minWidth: 0,
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
      }}>
        <div>
          <h2 style={{ margin: '0 0 6px' }}>📊 Sales Reports</h2>
          <p style={{ margin: 0, color: '#718078', fontSize: 13 }}>
            รายงานยอดขายและประสิทธิภาพการจำหน่ายอาหาร
          </p>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          style={{
            background: '#176b45',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            padding: '11px 17px',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          ↻ รีเฟรชรายงาน
        </button>
      </div>

      <div style={{
        background: '#fff7e6',
        color: '#925d00',
        border: '1px solid #f5dfae',
        borderRadius: 10,
        padding: 13,
        marginBottom: 20,
        fontSize: 13,
      }}>
        ⚠️ ข้อมูลยอดขายปัจจุบันเป็นข้อมูล DEMO สำหรับทดสอบระบบ
        ไม่ใช่ยอดขายจริงของร้าน
      </div>

      <section style={{ ...cardStyle, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>เลือกช่วงวันที่</h3>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'end',
          gap: 14,
        }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            วันที่เริ่มต้น
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                padding: 10,
                border: '1px solid #d8e3dc',
                borderRadius: 8,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            วันที่สิ้นสุด
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={e => setEndDate(e.target.value)}
              style={{
                padding: 10,
                border: '1px solid #d8e3dc',
                borderRadius: 8,
              }}
            />
          </label>

          <button
            onClick={loadReports}
            disabled={loading}
            style={{
              background: '#eaf4ed',
              color: '#176b45',
              border: '1px solid #d5e8da',
              borderRadius: 8,
              padding: '11px 18px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ค้นหารายงาน
          </button>
        </div>
      </section>

      {error && (
        <div style={{
          background: '#fff0f0',
          color: '#b42318',
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <section style={cardStyle}>
          กำลังโหลดข้อมูลรายงานยอดขาย...
        </section>
      ) : !error && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 15,
            marginBottom: 20,
          }}>
            <div style={cardStyle}>
              <p style={{ color: '#718078', marginTop: 0 }}>
                ยอดขายรวม
              </p>
              <h2 style={{ color: '#176b45', marginBottom: 5 }}>
                {money(totalSales)}
              </h2>
              <small>Confirmed Sales</small>
            </div>

            <div style={cardStyle}>
              <p style={{ color: '#718078', marginTop: 0 }}>
                จำนวนคำสั่งซื้อ
              </p>
              <h2 style={{ marginBottom: 5 }}>
                {totalOrders.toLocaleString('th-TH')}
              </h2>
              <small>Confirmed Orders</small>
            </div>

            <div style={cardStyle}>
              <p style={{ color: '#718078', marginTop: 0 }}>
                จำนวนอาหารที่ขาย
              </p>
              <h2 style={{ marginBottom: 5 }}>
                {totalQuantity.toLocaleString('th-TH')}
              </h2>
              <small>Portions Sold</small>
            </div>

            <div style={cardStyle}>
              <p style={{ color: '#718078', marginTop: 0 }}>
                เมนูที่ขายได้
              </p>
              <h2 style={{ marginBottom: 5 }}>
                {menuSummary.length}
              </h2>
              <small>Menu Items Sold</small>
            </div>
          </div>

          <section style={{ ...cardStyle, marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>📈 ยอดขายรายวัน</h3>

            {dailySummary.length === 0 ? (
              <p style={{ color: '#718078' }}>
                ไม่มีข้อมูลยอดขายในช่วงวันที่เลือก
              </p>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'end',
                gap: 10,
                minHeight: 210,
                overflowX: 'auto',
                padding: '15px 5px 5px',
              }}>
                {dailySummary.map(day => (
                  <div
                    key={day.date}
                    title={`${displayDate(day.date)}: ${money(day.sales)} (${day.orders} ออเดอร์)`}
                    style={{
                      minWidth: 35,
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'end',
                      alignItems: 'center',
                      gap: 7,
                      height: 190,
                    }}
                  >
                    <small style={{
                      fontSize: 10,
                      color: '#718078',
                      whiteSpace: 'nowrap',
                    }}>
                      {day.sales > 0
                        ? Math.round(day.sales).toLocaleString('th-TH')
                        : '0'}
                    </small>

                    <div style={{
                      width: '70%',
                      minWidth: 15,
                      height: `${Math.max((day.sales / maxDailySales) * 130, 3)}px`,
                      background: '#3d9869',
                      borderRadius: '6px 6px 0 0',
                    }} />

                    <small style={{
                      fontSize: 10,
                      color: '#718078',
                      whiteSpace: 'nowrap',
                    }}>
                      {new Date(`${day.date}T00:00:00`).getDate()}
                    </small>
                  </div>
                ))}
              </div>
            )}

            <small style={{ color: '#718078' }}>
              แกนแนวนอนแสดงวันที่ แกนแนวตั้งแสดงยอดขาย (บาท)
            </small>
          </section>

          <section style={{
            ...cardStyle,
            marginBottom: 20,
            overflowX: 'auto',
          }}>
            <h3 style={{ marginTop: 0 }}>🏆 เมนูขายดี</h3>

            {menuSummary.length === 0 ? (
              <p style={{ color: '#718078' }}>ยังไม่มีข้อมูลรายการอาหาร</p>
            ) : (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 450,
              }}>
                <thead>
                  <tr style={{ background: '#f5f8f5', textAlign: 'left' }}>
                    <th style={{ padding: 12 }}>เมนูอาหาร</th>
                    <th style={{ padding: 12 }}>จำนวนที่ขาย</th>
                    <th style={{ padding: 12 }}>ยอดขาย</th>
                  </tr>
                </thead>
                <tbody>
                  {menuSummary.map((menu, index) => (
                    <tr key={menu.id}>
                      <td style={{
                        padding: 12,
                        borderBottom: '1px solid #edf1ee',
                      }}>
                        {index === 0 ? '🥇 ' : ''}
                        {menu.name}
                      </td>
                      <td style={{
                        padding: 12,
                        borderBottom: '1px solid #edf1ee',
                      }}>
                        {menu.quantity.toLocaleString('th-TH')} จาน
                      </td>
                      <td style={{
                        padding: 12,
                        borderBottom: '1px solid #edf1ee',
                      }}>
                        {money(menu.sales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{
            ...cardStyle,
            marginBottom: 20,
            overflowX: 'auto',
          }}>
            <h3 style={{ marginTop: 0 }}>🧾 ประวัติคำสั่งซื้อ</h3>

            {orders.length === 0 ? (
              <p style={{ color: '#718078' }}>
                ไม่มีคำสั่งซื้อที่ยืนยันแล้วในช่วงวันที่เลือก
              </p>
            ) : (
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 520,
                fontSize: 13,
              }}>
                <thead>
                  <tr style={{ background: '#f5f8f5', textAlign: 'left' }}>
                    <th style={{ padding: 12 }}>วันที่</th>
                    <th style={{ padding: 12 }}>Order ID</th>
                    <th style={{ padding: 12 }}>ยอดรวม</th>
                    <th style={{ padding: 12 }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td style={{
                        padding: 12,
                        borderBottom: '1px solid #edf1ee',
                      }}>
                        {displayDate(order.created_at)}
                      </td>
                      <td style={{
                        padding: 12,
                        borderBottom: '1px solid #edf1ee',
                      }}>
                        {order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td style={{
                        padding: 12,
                        borderBottom: '1px solid #edf1ee',
                      }}>
                        {money(order.total_amount)}
                      </td>
                      <td style={{
                        padding: 12,
                        borderBottom: '1px solid #edf1ee',
                      }}>
                        <span style={{
                          background: '#eaf7ee',
                          color: '#176b45',
                          borderRadius: 20,
                          padding: '5px 10px',
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}>
                          Confirmed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <p style={{
        color: '#718078',
        fontSize: 12,
        marginTop: 15,
      }}>
        หมายเหตุ: รายงานนี้นับเฉพาะคำสั่งซื้อที่มีสถานะ confirmed
        และคำนวณยอดขายเมนูจากจำนวนที่ขายคูณราคาที่บันทึกไว้ในคำสั่งซื้อ
      </p>
    </div>
  )
}

export default SalesReports
