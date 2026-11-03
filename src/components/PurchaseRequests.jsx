
import { Fragment, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function PurchaseRequests() {
  const [ingredients, setIngredients] = useState([])
  const [requests, setRequests] = useState([])
  const [requestItems, setRequestItems] = useState([])
  const [forecasts, setForecasts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [note, setNote] = useState('')
  const [reviewNotes, setReviewNotes] = useState({})
  const [expandedRequest, setExpandedRequest] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reviewing, setReviewing] = useState('')
  const [receiving, setReceiving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      ingredientResult,
      requestResult,
      itemResult,
      forecastResult,
    ] = await Promise.all([
      supabase
        .from('ingredients')
        .select('id, name, unit, current_stock, min_stock, unit_cost')
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('purchase_requests')
        .select('id, status, note, created_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('purchase_request_items')
        .select('purchase_request_id, ingredient_id, quantity, unit_cost'),

      supabase
        .from('forecasts')
        .select(
          'ingredient_id, recommended_purchase, forecast_days, lookback_days, created_at'
        )
        .eq('forecast_days', 7)
        .eq('lookback_days', 30)
        .order('created_at', { ascending: false }),
    ])

    if (
      ingredientResult.error ||
      requestResult.error ||
      itemResult.error ||
      forecastResult.error
    ) {
      setError(
        ingredientResult.error?.message ||
        requestResult.error?.message ||
        itemResult.error?.message ||
        forecastResult.error?.message
      )
    } else {
      setIngredients(ingredientResult.data || [])
      setRequests(requestResult.data || [])
      setRequestItems(itemResult.data || [])

      // เก็บ Forecast ล่าสุดของวัตถุดิบแต่ละรายการ
      const latestForecasts = new Map()

      for (const item of forecastResult.data || []) {
        if (!latestForecasts.has(item.ingredient_id)) {
          latestForecasts.set(item.ingredient_id, item)
        }
      }

      setForecasts([...latestForecasts.values()])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateQuantity(ingredientId, value) {
    setQuantities(previous => ({
      ...previous,
      [ingredientId]: value,
    }))
  }

  // นำจำนวนที่ Forecast แนะนำมาเติมในแบบฟอร์ม
  function applyForecast() {
    setError('')
    setSuccess('')

    const recommendedItems = forecasts.filter(
      item => Number(item.recommended_purchase) > 0
    )

    if (recommendedItems.length === 0) {
      setError(
        'ยังไม่มีรายการแนะนำซื้อ กรุณาสร้าง Forecast ใหม่ก่อน'
      )
      return
    }

    const forecastQuantities = {}

    recommendedItems.forEach(item => {
      forecastQuantities[item.ingredient_id] =
        String(item.recommended_purchase)
    })

    setQuantities(previous => ({
      ...previous,
      ...forecastQuantities,
    }))

    setSuccess(
      `นำรายการจาก Forecast มาเติมแล้ว ${recommendedItems.length} รายการ คุณสามารถแก้ไขจำนวนก่อนส่งคำขอได้`
    )
  }

  const selectedItems = ingredients
    .filter(item => Number(quantities[item.id] || 0) > 0)
    .map(item => ({
      ingredient_id: item.id,
      quantity: Number(quantities[item.id]),
      name: item.name,
      unit: item.unit,
      unit_cost: Number(item.unit_cost || 0),
    }))

  const totalCost = selectedItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_cost,
    0
  )

  const formatMoney = amount =>
    new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 2,
    }).format(amount)

  const formatDate = date =>
    new Date(date).toLocaleString('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  function statusLabel(status) {
    const labels = {
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ไม่อนุมัติ',
      received: 'รับสินค้าแล้ว',
      completed: 'เสร็จสิ้น',
    }

    return labels[status] || status
  }

  function statusColor(status) {
    if (
      status === 'approved' ||
      status === 'received' ||
      status === 'completed'
    ) {
      return {
        background: '#eaf7ee',
        color: '#176b45',
      }
    }

    if (status === 'rejected') {
      return {
        background: '#fff0f0',
        color: '#b42318',
      }
    }

    return {
      background: '#fff4df',
      color: '#a15c00',
    }
  }

  // ส่งคำขอซื้อ
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (selectedItems.length === 0) {
      setError('กรุณาเลือกวัตถุดิบอย่างน้อย 1 รายการ')
      return
    }

    if (
      selectedItems.some(item =>
        !Number.isFinite(item.quantity) || item.quantity <= 0
      )
    ) {
      setError('จำนวนวัตถุดิบต้องมากกว่า 0')
      return
    }

    setSaving(true)

    const payload = selectedItems.map(item => ({
      ingredient_id: item.ingredient_id,
      quantity: item.quantity,
    }))

    const { data, error: rpcError } = await supabase.rpc(
      'create_purchase_request',
      {
        p_items: payload,
        p_note: note.trim() || null,
      }
    )

    if (rpcError) {
      setError(`ส่งคำขอซื้อไม่สำเร็จ: ${rpcError.message}`)
    } else {
      setSuccess(`ส่งคำขอซื้อสำเร็จ เลขที่คำขอ: ${data}`)
      setQuantities({})
      setNote('')
      await loadData()
    }

    setSaving(false)
  }

  // อนุมัติหรือไม่อนุมัติคำขอซื้อ
  async function handleReview(requestId, decision) {
    const actionText =
      decision === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'

    const confirmed = window.confirm(
      `ยืนยัน${actionText}คำขอซื้อเลขที่ ${requestId.slice(0, 8).toUpperCase()} หรือไม่?`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')
    setReviewing(requestId)

    const { error: reviewError } = await supabase.rpc(
      'review_purchase_request',
      {
        p_request_id: requestId,
        p_decision: decision,
        p_note: reviewNotes[requestId]?.trim() || null,
      }
    )

    if (reviewError) {
      setError(`ดำเนินการไม่สำเร็จ: ${reviewError.message}`)
    } else {
      setSuccess(
        decision === 'approved'
          ? 'อนุมัติคำขอซื้อเรียบร้อยแล้ว'
          : 'ไม่อนุมัติคำขอซื้อเรียบร้อยแล้ว'
      )

      setReviewNotes(previous => ({
        ...previous,
        [requestId]: '',
      }))

      await loadData()
    }

    setReviewing('')
  }

  // รับสินค้าเข้าสต็อกจริง
  async function handleReceive(requestId) {
    const confirmed = window.confirm(
      `ยืนยันรับสินค้าเข้าสต็อกสำหรับคำขอเลขที่ ${requestId.slice(0, 8).toUpperCase()} หรือไม่?\n\nการดำเนินการนี้จะเพิ่มจำนวนวัตถุดิบในสต็อกจริง`
    )

    if (!confirmed) return

    setError('')
    setSuccess('')
    setReceiving(requestId)

    const { error: receiveError } = await supabase.rpc(
      'receive_purchase_request',
      {
        p_request_id: requestId,
      }
    )

    if (receiveError) {
      setError(`รับสินค้าไม่สำเร็จ: ${receiveError.message}`)
    } else {
      setSuccess('รับสินค้าเข้าสต็อกเรียบร้อยแล้ว')

      await loadData()
    }

    setReceiving('')
  }

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid #e5eee8',
    borderRadius: 15,
    padding: 22,
    marginBottom: 20,
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: 9,
    border: '1px solid #d7e2da',
    borderRadius: 7,
    fontFamily: 'inherit',
  }

  if (loading) {
    return (
      <div style={{ padding: 30 }}>
        กำลังโหลดข้อมูล...
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div style={{
          background: '#fff0f0',
          color: '#b42318',
          padding: 15,
          borderRadius: 10,
          marginBottom: 18,
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#eaf7ee',
          color: '#176b45',
          padding: 15,
          borderRadius: 10,
          marginBottom: 18,
        }}>
          {success}
        </div>
      )}

      {/* CREATE PURCHASE REQUEST */}
      <section style={cardStyle}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 15,
        }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 7 }}>
              Create Purchase Request
            </h2>

            <p style={{
              color: '#718078',
              fontSize: 14,
              margin: 0,
            }}>
              เลือกวัตถุดิบและระบุจำนวนที่ต้องการจัดซื้อ
            </p>
          </div>

          <button
            type="button"
            onClick={applyForecast}
            disabled={forecasts.length === 0}
            style={{
              background: forecasts.length === 0 ? '#9aafa2' : '#176b45',
              color: '#ffffff',
              border: 'none',
              borderRadius: 9,
              padding: '12px 17px',
              cursor: forecasts.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            📈 นำรายการจาก Forecast
          </button>
        </div>

        <div style={{
          background: '#f0f7f2',
          border: '1px solid #dcece1',
          padding: 13,
          borderRadius: 9,
          marginTop: 18,
          marginBottom: 18,
          fontSize: 13,
          color: '#456653',
        }}>
          ระบบจะนำจำนวนวัตถุดิบที่แนะนำจาก Forecast 7 วัน
          โดยใช้ข้อมูลย้อนหลัง 30 วัน มาเติมให้อัตโนมัติ
          คุณสามารถแก้ไขจำนวนก่อนส่งคำขอได้
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 600,
            }}>
              <thead>
                <tr style={{
                  background: '#f5f8f5',
                  textAlign: 'left',
                }}>
                  {[
                    'วัตถุดิบ',
                    'คงเหลือ',
                    'ต้นทุน/หน่วย',
                    'จำนวนที่ต้องการซื้อ',
                  ].map(label => (
                    <th key={label} style={{
                      padding: 12,
                      borderBottom: '1px solid #e5eee8',
                    }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {ingredients.map(item => (
                  <tr key={item.id}>
                    <td style={{
                      padding: 12,
                      borderBottom: '1px solid #edf1ee',
                      fontWeight: 'bold',
                    }}>
                      {item.name}
                    </td>

                    <td style={{
                      padding: 12,
                      borderBottom: '1px solid #edf1ee',
                    }}>
                      {item.current_stock} {item.unit}
                    </td>

                    <td style={{
                      padding: 12,
                      borderBottom: '1px solid #edf1ee',
                    }}>
                      {formatMoney(item.unit_cost)}
                    </td>

                    <td style={{
                      padding: 12,
                      borderBottom: '1px solid #edf1ee',
                    }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={quantities[item.id] ?? ''}
                        onChange={event =>
                          updateQuantity(item.id, event.target.value)
                        }
                        style={{
                          width: 115,
                          padding: 9,
                          border: '1px solid #d7e2da',
                          borderRadius: 7,
                        }}
                      />

                      <small style={{
                        marginLeft: 7,
                        color: '#718078',
                      }}>
                        {item.unit}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{
              display: 'block',
              fontWeight: 'bold',
              marginBottom: 8,
            }}>
              หมายเหตุ
            </label>

            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม (ถ้ามี)"
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{
            background: '#f5f8f5',
            padding: 18,
            borderRadius: 10,
            marginTop: 20,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <span>จำนวนรายการที่เลือก</span>
              <strong>{selectedItems.length} รายการ</strong>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <strong>ต้นทุนรวมโดยประมาณ</strong>

              <strong style={{
                color: '#176b45',
                fontSize: 22,
              }}>
                {formatMoney(totalCost)}
              </strong>
            </div>
          </div>

          {selectedItems.length > 0 && (
            <div style={{ marginTop: 15 }}>
              <h4>สรุปรายการที่เลือก</h4>

              {selectedItems.map(item => (
                <p key={item.ingredient_id} style={{
                  margin: '7px 0',
                  color: '#52645a',
                }}>
                  {item.name}: {item.quantity} {item.unit}
                  {' × '}
                  {formatMoney(item.unit_cost)}
                  {' = '}
                  <strong>
                    {formatMoney(item.quantity * item.unit_cost)}
                  </strong>
                </p>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || selectedItems.length === 0}
            style={{
              marginTop: 20,
              background:
                saving || selectedItems.length === 0
                  ? '#9aafa2'
                  : '#176b45',
              color: '#ffffff',
              border: 'none',
              borderRadius: 9,
              padding: '13px 22px',
              cursor:
                saving || selectedItems.length === 0
                  ? 'not-allowed'
                  : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {saving ? 'กำลังส่งคำขอ...' : 'ส่งคำขอซื้อ'}
          </button>
        </form>
      </section>

      {/* PURCHASE REQUEST HISTORY */}
      <section style={cardStyle}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}>
          <div>
            <h2 style={{ margin: '0 0 7px' }}>
              Purchase Request History
            </h2>

            <p style={{
              color: '#718078',
              margin: 0,
              fontSize: 13,
            }}>
              ประวัติคำขอซื้อวัตถุดิบทั้งหมด
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            style={{
              padding: '9px 14px',
              background: '#edf5ef',
              color: '#176b45',
              border: '1px solid #d7e8dc',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            ↻ รีเฟรช
          </button>
        </div>

        {requests.length === 0 ? (
          <p style={{
            color: '#718078',
            marginTop: 20,
          }}>
            ยังไม่มีประวัติคำขอซื้อ
          </p>
        ) : (
          <div style={{
            overflowX: 'auto',
            marginTop: 18,
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 850,
            }}>
              <thead>
                <tr style={{
                  background: '#f5f8f5',
                  textAlign: 'left',
                }}>
                  {[
                    'เลขที่คำขอ',
                    'วันที่',
                    'รายการ',
                    'มูลค่าประมาณ',
                    'สถานะ',
                    'ดำเนินการ',
                  ].map(label => (
                    <th key={label} style={{
                      padding: 12,
                      borderBottom: '1px solid #e5eee8',
                    }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {requests.map(request => {
                  const items = requestItems.filter(
                    item =>
                      item.purchase_request_id === request.id
                  )

                  const amount = items.reduce(
                    (sum, item) =>
                      sum +
                      Number(item.quantity) *
                      Number(item.unit_cost),
                    0
                  )

                  const isExpanded = expandedRequest === request.id

                  return (
                    <Fragment key={request.id}>
                      <tr>
                        <td style={{
                          padding: 12,
                          borderBottom: '1px solid #edf1ee',
                          fontSize: 12,
                        }}>
                          {request.id.slice(0, 8).toUpperCase()}
                        </td>

                        <td style={{
                          padding: 12,
                          borderBottom: '1px solid #edf1ee',
                        }}>
                          {formatDate(request.created_at)}
                        </td>

                        <td style={{
                          padding: 12,
                          borderBottom: '1px solid #edf1ee',
                        }}>
                          {items.length} รายการ
                        </td>

                        <td style={{
                          padding: 12,
                          borderBottom: '1px solid #edf1ee',
                        }}>
                          {formatMoney(amount)}
                        </td>

                        <td style={{
                          padding: 12,
                          borderBottom: '1px solid #edf1ee',
                        }}>
                          <span style={{
                            ...statusColor(request.status),
                            padding: '6px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                          }}>
                            {statusLabel(request.status)}
                          </span>
                        </td>

                        <td style={{
                          padding: 12,
                          borderBottom: '1px solid #edf1ee',
                          minWidth: 210,
                        }}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRequest(
                                  isExpanded ? null : request.id
                                )
                              }
                              style={{
                                background: '#edf5ef',
                                color: '#176b45',
                                border: '1px solid #d7e8dc',
                                borderRadius: 7,
                                padding: '8px 10px',
                                cursor: 'pointer',
                              }}
                            >
                              {isExpanded
                                ? 'ซ่อนรายละเอียด ▲'
                                : 'ดูรายละเอียด ▼'}
                            </button>

                            {request.status === 'pending' && (
                              <>
                                <textarea
                                  rows={2}
                                  placeholder="หมายเหตุการพิจารณา (ถ้ามี)"
                                  value={reviewNotes[request.id] || ''}
                                  onChange={event =>
                                    setReviewNotes(previous => ({
                                      ...previous,
                                      [request.id]: event.target.value,
                                    }))
                                  }
                                  style={inputStyle}
                                />

                                <div style={{
                                  display: 'flex',
                                  gap: 6,
                                  flexWrap: 'wrap',
                                }}>
                                  <button
                                    type="button"
                                    disabled={reviewing === request.id}
                                    onClick={() =>
                                      handleReview(request.id, 'approved')
                                    }
                                    style={{
                                      background: '#176b45',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: 7,
                                      padding: '8px 10px',
                                      cursor: 'pointer',
                                      opacity: reviewing === request.id ? 0.6 : 1,
                                    }}
                                  >
                                    {reviewing === request.id
                                      ? 'กำลังดำเนินการ...'
                                      : '✓ อนุมัติ'}
                                  </button>

                                  <button
                                    type="button"
                                    disabled={reviewing === request.id}
                                    onClick={() =>
                                      handleReview(request.id, 'rejected')
                                    }
                                    style={{
                                      background: '#b42318',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: 7,
                                      padding: '8px 10px',
                                      cursor: 'pointer',
                                      opacity: reviewing === request.id ? 0.6 : 1,
                                    }}
                                  >
                                    ✕ ไม่อนุมัติ
                                  </button>
                                </div>
                              </>
                            )}

                            {request.status === 'approved' && (
                              <button
                                type="button"
                                disabled={receiving === request.id}
                                onClick={() => handleReceive(request.id)}
                                style={{
                                  background: '#176b45',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 7,
                                  padding: '9px 12px',
                                  cursor: receiving === request.id
                                    ? 'not-allowed'
                                    : 'pointer',
                                  opacity: receiving === request.id ? 0.6 : 1,
                                  fontWeight: 'bold',
                                }}
                              >
                                {receiving === request.id
                                  ? 'กำลังรับสินค้า...'
                                  : '📦 รับสินค้าเข้าสต็อก'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={6}
                            style={{
                              padding: 18,
                              background: '#f7faf8',
                              borderBottom: '1px solid #e5eee8',
                            }}
                          >
                            <h4 style={{
                              marginTop: 0,
                              color: '#176b45',
                            }}>
                              รายละเอียดคำขอซื้อ #{request.id.slice(0, 8).toUpperCase()}
                            </h4>

                            <div style={{
                              background: '#ffffff',
                              padding: 14,
                              borderRadius: 9,
                              border: '1px solid #e5eee8',
                              marginBottom: 15,
                            }}>
                              <strong>หมายเหตุจากผู้ส่งคำขอ:</strong>
                              <p style={{
                                marginBottom: 0,
                                color: '#52645a',
                              }}>
                                {request.note || 'ไม่มีหมายเหตุ'}
                              </p>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                              <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                background: '#ffffff',
                              }}>
                                <thead>
                                  <tr style={{
                                    background: '#edf5ef',
                                    textAlign: 'left',
                                  }}>
                                    {[
                                      'วัตถุดิบ',
                                      'จำนวน',
                                      'ต้นทุนต่อหน่วย',
                                      'รวม',
                                    ].map(label => (
                                      <th key={label} style={{
                                        padding: 11,
                                        borderBottom: '1px solid #e5eee8',
                                      }}>
                                        {label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>

                                <tbody>
                                  {items.map(item => {
                                    const ingredient = ingredients.find(
                                      ing => ing.id === item.ingredient_id
                                    )

                                    return (
                                      <tr key={item.ingredient_id}>
                                        <td style={{
                                          padding: 11,
                                          borderBottom: '1px solid #edf1ee',
                                        }}>
                                          {ingredient?.name || 'ไม่พบข้อมูลวัตถุดิบ'}
                                        </td>

                                        <td style={{
                                          padding: 11,
                                          borderBottom: '1px solid #edf1ee',
                                        }}>
                                          {item.quantity} {ingredient?.unit || ''}
                                        </td>

                                        <td style={{
                                          padding: 11,
                                          borderBottom: '1px solid #edf1ee',
                                        }}>
                                          {formatMoney(Number(item.unit_cost))}
                                        </td>

                                        <td style={{
                                          padding: 11,
                                          borderBottom: '1px solid #edf1ee',
                                          fontWeight: 'bold',
                                        }}>
                                          {formatMoney(
                                            Number(item.quantity) * Number(item.unit_cost)
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              marginTop: 15,
                              fontSize: 17,
                            }}>
                              <strong>
                                ยอดรวมทั้งหมด: {formatMoney(amount)}
                              </strong>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default PurchaseRequests
