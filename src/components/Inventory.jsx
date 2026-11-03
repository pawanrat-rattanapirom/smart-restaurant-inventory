
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Inventory() {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [selectedIngredient, setSelectedIngredient] = useState('')
  const [adjustmentType, setAdjustmentType] = useState('add')
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('')
  const [adjustmentNote, setAdjustmentNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Load ingredients
  async function fetchIngredients() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('ingredients')
      .select('id, name, unit, current_stock, min_stock, unit_cost')
      .eq('is_active', true)
      .order('name')

    if (error) {
      setError(error.message)
    } else {
      setIngredients(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchIngredients()
  }, [])

  // Stock status
  function getStockStatus(item) {
    if (Number(item.current_stock) <= 0) return 'สินค้าหมด'
    if (Number(item.current_stock) <= Number(item.min_stock)) return 'ใกล้หมด'
    return 'ปกติ'
  }

  // Save stock adjustment
  async function handleAdjustment(e) {
    e.preventDefault()

    setError('')
    setSuccess('')

    const ingredient = ingredients.find(
      item => item.id === selectedIngredient
    )

    if (!ingredient) {
      setError('กรุณาเลือกวัตถุดิบ')
      return
    }

    const quantity = Number(adjustmentQuantity)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('กรุณากรอกจำนวนที่มากกว่า 0')
      return
    }

    const delta = adjustmentType === 'add' ? quantity : -quantity

    if (Number(ingredient.current_stock) + delta < 0) {
      setError('จำนวนสต็อกไม่เพียงพอสำหรับการเบิกออก')
      return
    }

    setSaving(true)

    const { error } = await supabase.rpc('adjust_inventory', {
      p_ingredient_id: ingredient.id,
      p_quantity_delta: delta,
      p_note: adjustmentNote.trim() || null,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(
        `ปรับสต็อก ${ingredient.name} เรียบร้อยแล้ว`
      )

      setSelectedIngredient('')
      setAdjustmentQuantity('')
      setAdjustmentNote('')

      await fetchIngredients()
    }

    setSaving(false)
  }

  const filteredIngredients = ingredients.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const inputStyle = {
    display: 'block',
    width: '100%',
    padding: 12,
    marginTop: 7,
    marginBottom: 16,
    border: '1px solid #ddd',
    borderRadius: 8,
    boxSizing: 'border-box',
    fontSize: 14,
    background: '#fff'
  }

  const cellStyle = {
    padding: 14,
    borderBottom: '1px solid #eee',
    textAlign: 'left'
  }

  return (
    <div>
      <h1>Inventory Management</h1>
      <p style={{ color: '#718078' }}>
        จัดการวัตถุดิบและตรวจสอบปริมาณคงเหลือ
      </p>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="ค้นหาวัตถุดิบ..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          ...inputStyle,
          maxWidth: 400
        }}
      />

      {loading && <p>กำลังโหลดข้อมูล...</p>}

      {error && (
        <div style={{
          background: '#fff0f0',
          color: '#b42318',
          padding: 12,
          borderRadius: 8,
          marginBottom: 15
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#eaf7ee',
          color: '#16803c',
          padding: 12,
          borderRadius: 8,
          marginBottom: 15
        }}>
          {success}
        </div>
      )}

      {/* INVENTORY TABLE */}
      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white'
          }}>
            <thead>
              <tr style={{ background: '#eaf2ed' }}>
                <th style={cellStyle}>วัตถุดิบ</th>
                <th style={cellStyle}>คงเหลือ</th>
                <th style={cellStyle}>ขั้นต่ำ</th>
                <th style={cellStyle}>ต้นทุนต่อหน่วย</th>
                <th style={cellStyle}>สถานะ</th>
              </tr>
            </thead>

            <tbody>
              {filteredIngredients.map(item => {
                const status = getStockStatus(item)

                return (
                  <tr key={item.id}>
                    <td style={cellStyle}>{item.name}</td>
                    <td style={cellStyle}>
                      {Number(item.current_stock).toLocaleString()} {item.unit}
                    </td>
                    <td style={cellStyle}>
                      {Number(item.min_stock).toLocaleString()} {item.unit}
                    </td>
                    <td style={cellStyle}>
                      ฿{Number(item.unit_cost).toLocaleString()}
                    </td>
                    <td style={cellStyle}>
                      <strong style={{
                        color: status === 'ปกติ'
                          ? '#16803c'
                          : status === 'ใกล้หมด'
                            ? '#c17a00'
                            : '#d32f2f'
                      }}>
                        {status}
                      </strong>
                    </td>
                  </tr>
                )
              })}

              {filteredIngredients.length === 0 && (
                <tr>
                  <td colSpan="5" style={cellStyle}>
                    ไม่พบข้อมูลวัตถุดิบ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* STOCK ADJUSTMENT */}
      <div style={{
        background: '#fff',
        border: '1px solid #e5eee8',
        borderRadius: 14,
        padding: 24,
        marginTop: 30,
        maxWidth: 650,
        boxSizing: 'border-box'
      }}>
        <h2 style={{ marginTop: 0 }}>Stock Adjustment</h2>

        <p style={{ color: '#718078' }}>
          เพิ่มหรือลดจำนวนวัตถุดิบในคลัง
        </p>

        <form onSubmit={handleAdjustment}>
          <label>เลือกวัตถุดิบ</label>

          <select
            value={selectedIngredient}
            onChange={e => setSelectedIngredient(e.target.value)}
            required
            style={inputStyle}
          >
            <option value="">-- เลือกวัตถุดิบ --</option>

            {ingredients.map(item => (
              <option key={item.id} value={item.id}>
                {item.name} (คงเหลือ {item.current_stock} {item.unit})
              </option>
            ))}
          </select>

          <label>ประเภทรายการ</label>

          <select
            value={adjustmentType}
            onChange={e => setAdjustmentType(e.target.value)}
            style={inputStyle}
          >
            <option value="add">เพิ่มสต็อก (รับเข้า)</option>
            <option value="remove">ลดสต็อก (เบิกออก)</option>
          </select>

          <label>จำนวน</label>

          <input
            type="number"
            min="0.01"
            step="any"
            value={adjustmentQuantity}
            onChange={e => setAdjustmentQuantity(e.target.value)}
            placeholder="กรอกจำนวนวัตถุดิบ"
            required
            style={inputStyle}
          />

          <label>หมายเหตุ</label>

          <textarea
            value={adjustmentNote}
            onChange={e => setAdjustmentNote(e.target.value)}
            placeholder="เช่น รับวัตถุดิบจากซัพพลายเออร์"
            rows={3}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={saving || loading}
            style={{
              width: '100%',
              background: saving ? '#8da99a' : '#174d36',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: 13,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกการปรับสต็อก'}
          </button>
        </form>
      </div>

      {/* REFRESH */}
      <button
        onClick={fetchIngredients}
        disabled={loading || saving}
        style={{
          marginTop: 20,
          padding: '10px 18px',
          background: '#174d36',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        รีเฟรชข้อมูล
      </button>
    </div>
  )
}

export default Inventory
