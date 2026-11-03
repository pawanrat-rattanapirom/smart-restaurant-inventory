
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Inventory from './Inventory'
import PurchaseRequests from './PurchaseRequests'
import MenuManagement from './MenuManagement'
import SalesReports from './SalesReports'
import TableQRCodes from './TableQRCodes'
const navItems = [
  { id: 'overview', icon: '▦', label: 'Overview' },
  { id: 'inventory', icon: '📦', label: 'Inventory' },
  { id: 'forecast', icon: '📈', label: 'Demand Forecast' },
  { id: 'purchase', icon: '🛒', label: 'Purchase Requests' },
  { id: 'menu', icon: '🍽️', label: 'Menu Management' },
  { id: 'qr', icon: '▣', label: 'Table QR Codes' },
  { id: 'sales', icon: '📊', label: 'Sales Reports' },
]

function ManagerDashboard({ profile, onLogout }) {
  const [activePage, setActivePage] = useState('overview')
  const [orders, setOrders] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [forecasts, setForecasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [forecastLoading, setForecastLoading] = useState(false)
  const [error, setError] = useState('')
  const [forecastMessage, setForecastMessage] = useState('')

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      const [ordersResult, ingredientsResult, forecastsResult] =
        await Promise.all([
          supabase
            .from('orders')
            .select('id, total_amount, status, created_at')
            .eq('status', 'confirmed')
            .order('created_at', { ascending: false }),

          supabase
            .from('ingredients')
            .select('id, name, unit, current_stock, min_stock, unit_cost')
            .eq('is_active', true)
            .order('name'),

          supabase
            .from('forecasts')
            .select(
              'ingredient_id, forecast_date, forecast_days, lookback_days, recommended_purchase, created_at'
            )
            .eq('forecast_days', 7)
            .eq('lookback_days', 30)
            .order('created_at', { ascending: false }),
        ])

      if (
        ordersResult.error ||
        ingredientsResult.error ||
        forecastsResult.error
      ) {
        throw new Error(
          ordersResult.error?.message ||
          ingredientsResult.error?.message ||
          forecastsResult.error?.message
        )
      }

      setOrders(ordersResult.data || [])
      setIngredients(ingredientsResult.data || [])

      const latestForecasts = new Map()

      for (const item of forecastsResult.data || []) {
        if (!latestForecasts.has(item.ingredient_id)) {
          latestForecasts.set(item.ingredient_id, item)
        }
      }

      setForecasts([...latestForecasts.values()])
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลด Dashboard ได้')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  async function generateForecast() {
    setForecastLoading(true)
    setForecastMessage('')
    setError('')

    try {
      const { error: rpcError } = await supabase.rpc(
        'generate_inventory_forecast',
        {
          p_forecast_days: 7,
          p_lookback_days: 30,
        }
      )

      if (rpcError) throw rpcError

      setForecastMessage('สร้าง Forecast ใหม่สำเร็จแล้ว')
      await loadDashboard()
    } catch (err) {
      setError(`สร้าง Forecast ไม่สำเร็จ: ${err.message}`)
    } finally {
      setForecastLoading(false)
    }
  }

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  )

  const lowStock = ingredients.filter(
    item => Number(item.current_stock) <= Number(item.min_stock)
  )

  const purchaseItems = forecasts.filter(
    item => Number(item.recommended_purchase) > 0
  )

  const forecastCost = purchaseItems.reduce((sum, item) => {
    const ingredient = ingredients.find(
      ing => ing.id === item.ingredient_id
    )

    return (
      sum +
      Number(item.recommended_purchase) *
      Number(ingredient?.unit_cost || 0)
    )
  }, 0)

  const formatMoney = amount =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0,
    }).format(amount)

  const formatDate = date => {
    if (!date) return '-'

    return new Date(date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e5eee8',
    borderRadius: 16,
    padding: 22,
    minWidth: 0,
  }

  const pageTitles = {
    overview: 'Business Overview',
    inventory: 'Inventory Management',
    forecast: 'Demand Forecast',
    purchase: 'Purchase Requests',
    menu: 'Menu Management',
    qr: 'Table QR Codes',
    sales: 'Sales Reports',
  }

  if (loading) {
    return <div style={{ padding: 40 }}>กำลังโหลด Dashboard...</div>
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f8f5',
      color: '#20352a',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
    }}>

      {/* SIDEBAR */}
      <aside style={{
        width: 245,
        minWidth: 220,
        background: '#174d36',
        color: '#ffffff',
        padding: '28px 16px',
        boxSizing: 'border-box',
        minHeight: '100vh',
      }}>
        <div style={{ padding: '0 12px 32px' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🍃</div>
          <h2 style={{ margin: 0, fontSize: 19 }}>
            Smart Restaurant
          </h2>
          <p style={{
            color: '#b7d5c3',
            fontSize: 11,
            marginTop: 7,
          }}>
            INVENTORY MANAGEMENT
          </p>
        </div>

        <p style={{
          color: '#a8c8b5',
          fontSize: 11,
          padding: '0 12px',
          letterSpacing: 1,
        }}>
          MAIN MENU
        </p>

        <nav>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id)
                setError('')
                setForecastMessage('')
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 14px',
                marginBottom: 5,
                border: 'none',
                borderRadius: 9,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 14,
                background: activePage === item.id
                  ? '#ffffff'
                  : 'transparent',
                color: activePage === item.id
                  ? '#174d36'
                  : '#e1eee5',
                fontWeight: activePage === item.id
                  ? 'bold'
                  : 'normal',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{
          borderTop: '1px solid #47735b',
          marginTop: 35,
          padding: '22px 12px',
        }}>
          <p style={{ fontSize: 13, margin: 0 }}>
            {profile?.full_name}
          </p>

          <p style={{
            fontSize: 11,
            color: '#b7d5c3',
            marginTop: 6,
          }}>
            Administrator · Manager
          </p>

          <button
            onClick={onLogout}
            style={{
              marginTop: 16,
              background: '#ffffff',
              color: '#174d36',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{
        flex: 1,
        minWidth: 0,
        padding: '32px 4%',
        boxSizing: 'border-box',
      }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 30,
        }}>
          <div>
            <p style={{
              color: '#718078',
              fontSize: 12,
              margin: '0 0 7px',
            }}>
              SMART RESTAURANT / MANAGER
            </p>

            <h1 style={{ margin: 0, fontSize: 27 }}>
              {pageTitles[activePage]}
            </h1>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e5eee8',
            borderRadius: 10,
            padding: '12px 18px',
            fontSize: 13,
          }}>
            👤 {profile?.full_name}
          </div>
        </header>

        {error && (
          <div style={{
            background: '#fff0f0',
            color: '#b42318',
            padding: 16,
            borderRadius: 10,
            marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {forecastMessage && (
          <div style={{
            background: '#eaf7ee',
            color: '#176b45',
            padding: 14,
            borderRadius: 10,
            marginBottom: 20,
          }}>
            {forecastMessage}
          </div>
        )}

        {/* OVERVIEW */}
        {activePage === 'overview' && (
          <>
            <div style={{ marginBottom: 25 }}>
              <h2 style={{ margin: '0 0 7px', fontSize: 21 }}>
                สวัสดี, {profile?.full_name}
              </h2>

              <p style={{ color: '#718078', margin: 0 }}>
                ภาพรวมการดำเนินงานและการจัดการวัตถุดิบของร้าน
              </p>
            </div>

            <h3>Business Overview</h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 16,
              marginBottom: 30,
            }}>
              <div style={cardStyle}>
                <p style={{ color: '#718078' }}>ยอดขายสะสม</p>
                <h2 style={{ color: '#176b45' }}>
                  {formatMoney(totalSales)}
                </h2>
                <small>Confirmed Orders</small>
              </div>

              <div style={cardStyle}>
                <p style={{ color: '#718078' }}>ออเดอร์ที่ยืนยัน</p>
                <h2>{orders.length.toLocaleString('th-TH')}</h2>
                <small>Confirmed Orders</small>
              </div>

              <div style={cardStyle}>
                <p style={{ color: '#718078' }}>วัตถุดิบทั้งหมด</p>
                <h2>{ingredients.length}</h2>
                <small>Active Ingredients</small>
              </div>

              <div style={cardStyle}>
                <p style={{ color: '#718078' }}>วัตถุดิบที่สต็อกต่ำ</p>
                <h2 style={{ color: '#d97706' }}>
                  {lowStock.length}
                </h2>
                <small>Low Stock Items</small>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
            }}>
              <section style={cardStyle}>
                <h3>Inventory Status</h3>

                {ingredients.map(item => {
                  const stock = Number(item.current_stock)
                  const minimum = Number(item.min_stock)
                  const isOut = stock <= 0
                  const isLow = stock <= minimum

                  return (
                    <div key={item.id} style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #edf1ee',
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}>
                        <strong>{item.name}</strong>

                        <span style={{
                          color: isOut
                            ? '#dc2626'
                            : isLow
                              ? '#d97706'
                              : '#176b45',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}>
                          {isOut
                            ? 'Out of Stock'
                            : isLow
                              ? 'Low Stock'
                              : 'Normal'}
                        </span>
                      </div>

                      <small style={{ color: '#718078' }}>
                        คงเหลือ {item.current_stock} {item.unit}
                        {' · '}ขั้นต่ำ {item.min_stock} {item.unit}
                      </small>
                    </div>
                  )
                })}
              </section>

              <section style={cardStyle}>
                <h3>Purchase Recommendations</h3>

                <p style={{ color: '#718078', fontSize: 13 }}>
                  คำแนะนำซื้อวัตถุดิบ 7 วัน จากข้อมูลย้อนหลัง 30 วัน
                </p>

                {purchaseItems.length === 0 ? (
                  <p>ไม่มีรายการแนะนำให้ซื้อ</p>
                ) : purchaseItems.map(item => {
                  const ingredient = ingredients.find(
                    ing => ing.id === item.ingredient_id
                  )

                  return (
                    <div key={item.ingredient_id} style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #edf1ee',
                    }}>
                      <strong>
                        {ingredient?.name || 'วัตถุดิบ'}
                      </strong>

                      <p style={{
                        margin: '5px 0',
                        color: '#176b45',
                      }}>
                        แนะนำซื้อ {item.recommended_purchase}
                        {ingredient ? ` ${ingredient.unit}` : ''}
                      </p>
                    </div>
                  )
                })}
              </section>
            </div>
          </>
        )}

        {/* INVENTORY */}
        {activePage === 'inventory' && <Inventory />}

        {/* FORECAST */}
        {activePage === 'forecast' && (
          <>
            <section style={{
              ...cardStyle,
              marginBottom: 20,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 15,
              }}>
                <div>
                  <h2 style={{ margin: '0 0 8px' }}>
                    Demand Forecast
                  </h2>

                  <p style={{ color: '#718078', margin: 0 }}>
                    พยากรณ์ความต้องการวัตถุดิบจากยอดขายย้อนหลัง 30 วัน
                    เพื่อวางแผนการจัดซื้อใน 7 วันข้างหน้า
                  </p>
                </div>

                <button
                  onClick={generateForecast}
                  disabled={forecastLoading}
                  style={{
                    background: forecastLoading ? '#9aafa2' : '#176b45',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 9,
                    padding: '13px 18px',
                    cursor: forecastLoading ? 'wait' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  {forecastLoading
                    ? 'กำลังคำนวณ...'
                    : '↻ สร้าง Forecast ใหม่'}
                </button>
              </div>
            </section>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 16,
              marginBottom: 20,
            }}>
              <div style={cardStyle}>
                <p style={{ color: '#718078' }}>ช่วงพยากรณ์</p>
                <h2 style={{ color: '#176b45' }}>7 วัน</h2>
                <small>Forecast Period</small>
              </div>

              <div style={cardStyle}>
                <p style={{ color: '#718078' }}>ข้อมูลย้อนหลัง</p>
                <h2>30 วัน</h2>
                <small>Historical Sales</small>
              </div>

              <div style={cardStyle}>
                <p style={{ color: '#718078' }}>รายการที่ควรซื้อ</p>
                <h2>{purchaseItems.length}</h2>
                <small>Recommended Items</small>
              </div>

              <div style={cardStyle}>
                <p style={{ color: '#718078' }}>งบจัดซื้อโดยประมาณ</p>
                <h2 style={{ color: '#176b45' }}>
                  {formatMoney(forecastCost)}
                </h2>
                <small>Estimated Purchase Cost</small>
              </div>
            </div>

            <section style={{
              ...cardStyle,
              marginBottom: 20,
              overflowX: 'auto',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 18,
              }}>
                <div>
                  <h3 style={{ margin: '0 0 6px' }}>
                    Recommended Purchase Plan
                  </h3>

                  <p style={{
                    margin: 0,
                    color: '#718078',
                    fontSize: 13,
                  }}>
                    ปริมาณวัตถุดิบที่ระบบแนะนำให้จัดซื้อ
                  </p>
                </div>

                <button
                  onClick={loadDashboard}
                  style={{
                    background: '#edf5ef',
                    color: '#176b45',
                    border: '1px solid #d7e8dc',
                    borderRadius: 8,
                    padding: '9px 14px',
                    cursor: 'pointer',
                  }}
                >
                  ↻ รีเฟรชข้อมูล
                </button>
              </div>

              {forecasts.length === 0 ? (
                <p style={{ color: '#718078' }}>
                  ยังไม่มีข้อมูล Forecast กรุณากด “สร้าง Forecast ใหม่”
                </p>
              ) : (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 650,
                  fontSize: 14,
                }}>
                  <thead>
                    <tr style={{
                      background: '#f5f8f5',
                      textAlign: 'left',
                    }}>
                      {[
                        'วัตถุดิบ',
                        'คงเหลือ',
                        'ขั้นต่ำ',
                        'แนะนำซื้อ',
                        'ต้นทุนประมาณ',
                        'สถานะ',
                      ].map(label => (
                        <th key={label} style={{
                          padding: 13,
                          borderBottom: '1px solid #e5eee8',
                        }}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {forecasts.map(item => {
                      const ingredient = ingredients.find(
                        ing => ing.id === item.ingredient_id
                      )

                      const quantity = Number(
                        item.recommended_purchase || 0
                      )

                      const cost = quantity *
                        Number(ingredient?.unit_cost || 0)

                      return (
                        <tr key={item.ingredient_id}>
                          <td style={{
                            padding: 13,
                            borderBottom: '1px solid #edf1ee',
                            fontWeight: 'bold',
                          }}>
                            {ingredient?.name || 'ไม่พบวัตถุดิบ'}
                          </td>

                          <td style={{
                            padding: 13,
                            borderBottom: '1px solid #edf1ee',
                          }}>
                            {ingredient
                              ? `${ingredient.current_stock} ${ingredient.unit}`
                              : '-'}
                          </td>

                          <td style={{
                            padding: 13,
                            borderBottom: '1px solid #edf1ee',
                          }}>
                            {ingredient
                              ? `${ingredient.min_stock} ${ingredient.unit}`
                              : '-'}
                          </td>

                          <td style={{
                            padding: 13,
                            borderBottom: '1px solid #edf1ee',
                            color: quantity > 0 ? '#176b45' : '#718078',
                            fontWeight: 'bold',
                          }}>
                            {quantity > 0
                              ? `${quantity} ${ingredient?.unit || ''}`
                              : 'ไม่ต้องซื้อ'}
                          </td>

                          <td style={{
                            padding: 13,
                            borderBottom: '1px solid #edf1ee',
                          }}>
                            {formatMoney(cost)}
                          </td>

                          <td style={{
                            padding: 13,
                            borderBottom: '1px solid #edf1ee',
                          }}>
                            <span style={{
                              background: quantity > 0 ? '#fff4df' : '#eaf7ee',
                              color: quantity > 0 ? '#a15c00' : '#176b45',
                              borderRadius: 20,
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 'bold',
                            }}>
                              {quantity > 0 ? 'ควรจัดซื้อ' : 'เพียงพอ'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <section style={cardStyle}>
              <h3>Forecast Information</h3>

              <p style={{ color: '#718078', fontSize: 13 }}>
                ข้อมูลนี้คำนวณจากประวัติคำสั่งซื้อที่ยืนยันแล้ว
                และสูตรการใช้วัตถุดิบของแต่ละเมนู
                ผลลัพธ์เป็นคำแนะนำเพื่อช่วยวางแผน ไม่ใช่การสั่งซื้ออัตโนมัติ
              </p>

              {forecasts.length > 0 && (
                <small style={{ color: '#718078' }}>
                  วันที่สร้าง Forecast ล่าสุด: {formatDate(forecasts[0]?.created_at)}
                </small>
              )}
            </section>
          </>
        )}

        {/* PURCHASE REQUESTS */}
        {activePage === 'purchase' && <PurchaseRequests />}

        {/* MENU MANAGEMENT */}
        {activePage === 'menu' && <MenuManagement />}

        {/* SALES REPORTS */}
        {activePage === 'sales' && <SalesReports />}

        {/* TABLE QR CODES */}
        {activePage === 'qr' && <TableQRCodes />}

      </main>
    </div>
  )
}

export default ManagerDashboard
