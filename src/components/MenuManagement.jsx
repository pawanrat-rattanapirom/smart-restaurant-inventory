
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function MenuManagement() {
  const [menus, setMenus] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [recipes, setRecipes] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('menus')
  const [selectedMenu, setSelectedMenu] = useState(null)
  const [editingMenu, setEditingMenu] = useState(null)

  const emptyForm = {
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true,
  }

  const [form, setForm] = useState(emptyForm)

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [
        menuResult,
        ingredientResult,
        recipeResult,
        recipeIngredientResult,
      ] = await Promise.all([
        supabase.from('menu_items').select('*').order('name'),
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('recipes').select('*').order('version', { ascending: false }),
        supabase.from('recipe_ingredients').select('*'),
      ])

      if (menuResult.error) throw menuResult.error
      if (ingredientResult.error) throw ingredientResult.error
      if (recipeResult.error) throw recipeResult.error
      if (recipeIngredientResult.error) throw recipeIngredientResult.error

      setMenus(menuResult.data || [])
      setIngredients(ingredientResult.data || [])

      const recipeMap = {}

      for (const recipe of recipeResult.data || []) {
        if (!recipeMap[recipe.menu_item_id]) {
          recipeMap[recipe.menu_item_id] = []
        }

        recipeMap[recipe.menu_item_id].push({
          ...recipe,
          items: (recipeIngredientResult.data || []).filter(
            item => item.recipe_id === recipe.id
          ),
        })
      }

      setRecipes(recipeMap)
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const activeRecipe = useMemo(() => {
    if (!selectedMenu) return null

    const list = recipes[selectedMenu.id] || []

    return list.find(recipe => recipe.status === 'approved') || list[0] || null
  }, [selectedMenu, recipes])

  function getIngredient(ingredientId) {
    return ingredients.find(item => item.id === ingredientId)
  }

  function getRecipeCost(recipe) {
    if (!recipe) return 0

    return recipe.items.reduce((total, item) => {
      const ingredient = getIngredient(item.ingredient_id)
      return total + Number(ingredient?.unit_cost || 0) *
        Number(item.quantity_per_serving || 0)
    }, 0)
  }

  function openAddForm() {
    setEditingMenu(null)
    setForm(emptyForm)
    setError('')
    setMessage('')
  }

  function openEditForm(menu) {
    setEditingMenu(menu)
    setForm({
      name: menu.name || '',
      description: menu.description || '',
      price: String(menu.price ?? ''),
      image_url: menu.image_url || '',
      is_available: menu.is_available,
    })
    setError('')
    setMessage('')
  }

  async function saveMenu(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        image_url: form.image_url.trim() || null,
        is_available: form.is_available,
        updated_at: new Date().toISOString(),
      }

      if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0) {
        throw new Error('กรุณากรอกชื่อเมนูและราคาที่ถูกต้อง')
      }

      let result

      if (editingMenu) {
        result = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', editingMenu.id)
      } else {
        result = await supabase
          .from('menu_items')
          .insert(payload)
      }

      if (result.error) throw result.error

      setMessage(editingMenu ? 'แก้ไขเมนูเรียบร้อยแล้ว' : 'เพิ่มเมนูเรียบร้อยแล้ว')
      setEditingMenu(null)
      setForm(emptyForm)
      await loadData()
    } catch (err) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAvailability(menu) {
    const confirmed = window.confirm(
      `ต้องการ${menu.is_available ? 'ปิด' : 'เปิด'}การขายเมนู "${menu.name}" หรือไม่?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    const { error } = await supabase
      .from('menu_items')
      .update({
        is_available: !menu.is_available,
        updated_at: new Date().toISOString(),
      })
      .eq('id', menu.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('เปลี่ยนสถานะเมนูเรียบร้อยแล้ว')
    await loadData()
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    })
  }

  if (loading) {
    return <div className="menu-management"><p>กำลังโหลดข้อมูลเมนู...</p></div>
  }

  return (
    <div className="menu-management">
      <div className="menu-page-header">
        <div>
          <h2>🍽️ Menu Management</h2>
          <p>จัดการเมนูอาหาร สูตรวัตถุดิบ และต้นทุนอาหาร</p>
        </div>
        <button onClick={loadData} className="menu-secondary-button">
          ↻ รีเฟรช
        </button>
      </div>

      {error && <div className="menu-alert error">{error}</div>}
      {message && <div className="menu-alert success">{message}</div>}

      <div className="menu-tabs">
        <button
          className={activeTab === 'menus' ? 'active' : ''}
          onClick={() => setActiveTab('menus')}
        >
          🍽️ เมนูอาหาร
        </button>
        <button
          className={activeTab === 'recipes' ? 'active' : ''}
          onClick={() => setActiveTab('recipes')}
        >
          🧾 สูตรอาหาร
        </button>
        <button
          className={activeTab === 'cost' ? 'active' : ''}
          onClick={() => setActiveTab('cost')}
        >
          💰 ต้นทุนและกำไร
        </button>
      </div>

      {activeTab === 'menus' && (
        <>
          <div className="menu-section-heading">
            <div>
              <h3>รายการเมนูอาหาร</h3>
              <p>มีเมนูทั้งหมด {menus.length} รายการ</p>
            </div>
            <button onClick={openAddForm} className="menu-primary-button">
              + เพิ่มเมนู
            </button>
          </div>

          {editingMenu !== null || form.name !== '' ? (
            <form className="menu-form" onSubmit={saveMenu}>
              <h3>{editingMenu ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่'}</h3>

              <label>ชื่อเมนู</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                placeholder="เช่น ข้าวผัดกุ้ง"
              />

              <label>รายละเอียด</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="รายละเอียดอาหาร"
              />

              <label>ราคาขาย (บาท)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                required
              />

              <label>URL รูปภาพ (ถ้ามี)</label>
              <input
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />

              <label className="menu-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={e => setForm({ ...form, is_available: e.target.checked })}
                />
                เปิดขายเมนูนี้
              </label>

              <div className="menu-form-actions">
                <button type="submit" disabled={saving} className="menu-primary-button">
                  {saving ? 'กำลังบันทึก...' : 'บันทึกเมนู'}
                </button>
                <button
                  type="button"
                  className="menu-secondary-button"
                  onClick={() => {
                    setEditingMenu(null)
                    setForm(emptyForm)
                  }}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          ) : null}

          <div className="menu-card-grid">
            {menus.map(menu => {
              const approvedRecipe = (recipes[menu.id] || []).find(
                recipe => recipe.status === 'approved'
              )
              const cost = getRecipeCost(approvedRecipe)

              return (
                <div className="menu-card" key={menu.id}>
                  {menu.image_url ? (
                    <img src={menu.image_url} alt={menu.name} />
                  ) : (
                    <div className="menu-image-placeholder">🍛</div>
                  )}

                  <div className="menu-card-content">
                    <div className="menu-card-title">
                      <h3>{menu.name}</h3>
                      <span className={menu.is_available ? 'menu-status on' : 'menu-status off'}>
                        {menu.is_available ? 'เปิดขาย' : 'ปิดขาย'}
                      </span>
                    </div>

                    <p>{menu.description || 'ไม่มีรายละเอียด'}</p>
                    <div className="menu-card-price">
                      <strong>{formatMoney(menu.price)}</strong>
                      <span>ต้นทุน {formatMoney(cost)}</span>
                    </div>

                    <div className="menu-card-actions">
                      <button onClick={() => openEditForm(menu)}>✏️ แก้ไข</button>
                      <button onClick={() => {
                        setSelectedMenu(menu)
                        setActiveTab('recipes')
                      }}>
                        🧾 ดูสูตร
                      </button>
                      <button onClick={() => toggleAvailability(menu)}>
                        {menu.is_available ? 'ปิดขาย' : 'เปิดขาย'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {activeTab === 'recipes' && (
        <div className="menu-panel">
          <h3>สูตรอาหาร</h3>
          <p>เลือกเมนูเพื่อดูวัตถุดิบและปริมาณที่ใช้ต่อหนึ่งจาน</p>

          <label>เลือกเมนูอาหาร</label>
          <select
            value={selectedMenu?.id || ''}
            onChange={e => setSelectedMenu(
              menus.find(menu => menu.id === e.target.value) || null
            )}
          >
            <option value="">-- เลือกเมนู --</option>
            {menus.map(menu => (
              <option value={menu.id} key={menu.id}>{menu.name}</option>
            ))}
          </select>

          {selectedMenu && (
            <>
              {activeRecipe ? (
                <>
                  <div className="recipe-info">
                    <strong>{selectedMenu.name}</strong>
                    <span>สูตร v{activeRecipe.version} · {activeRecipe.status}</span>
                  </div>

                  <div className="menu-table-wrap">
                    <table className="menu-table">
                      <thead>
                        <tr>
                          <th>วัตถุดิบ</th>
                          <th>ปริมาณต่อจาน</th>
                          <th>ต้นทุน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRecipe.items.map(item => {
                          const ingredient = getIngredient(item.ingredient_id)
                          return (
                            <tr key={item.id}>
                              <td>{ingredient?.name || 'ไม่พบวัตถุดิบ'}</td>
                              <td>{item.quantity_per_serving} {item.unit}</td>
                              <td>
                                {formatMoney(
                                  Number(ingredient?.unit_cost || 0) *
                                  Number(item.quantity_per_serving)
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="recipe-total">
                    ต้นทุนวัตถุดิบต่อจาน: <strong>{formatMoney(getRecipeCost(activeRecipe))}</strong>
                  </div>
                  <p className="menu-muted">
                    สูตรที่อนุมัติแล้วจะแสดงเพื่อดูข้อมูลเท่านั้น การแก้ไขสูตรจะทำผ่านเวอร์ชันใหม่ในขั้นถัดไป
                  </p>
                </>
              ) : (
                <p className="menu-muted">เมนูนี้ยังไม่มีสูตรอาหาร</p>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'cost' && (
        <div className="menu-panel">
          <h3>วิเคราะห์ต้นทุนและกำไรขั้นต้น</h3>
          <p>คำนวณจากสูตรที่อนุมัติแล้วและต้นทุนวัตถุดิบปัจจุบัน</p>

          <div className="menu-table-wrap">
            <table className="menu-table">
              <thead>
                <tr>
                  <th>เมนู</th>
                  <th>ราคาขาย</th>
                  <th>ต้นทุนวัตถุดิบ</th>
                  <th>กำไรขั้นต้น</th>
                  <th>Food Cost</th>
                </tr>
              </thead>
              <tbody>
                {menus.map(menu => {
                  const recipe = (recipes[menu.id] || []).find(
                    item => item.status === 'approved'
                  )
                  const cost = getRecipeCost(recipe)
                  const profit = Number(menu.price) - cost
                  const foodCost = Number(menu.price) > 0
                    ? (cost / Number(menu.price)) * 100
                    : 0

                  return (
                    <tr key={menu.id}>
                      <td>{menu.name}</td>
                      <td>{formatMoney(menu.price)}</td>
                      <td>{formatMoney(cost)}</td>
                      <td>{formatMoney(profit)}</td>
                      <td>{foodCost.toFixed(1)}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="menu-muted">
            หมายเหตุ: กำไรนี้เป็นกำไรขั้นต้นหลังหักเฉพาะต้นทุนวัตถุดิบ ยังไม่รวมค่าแรง ค่าเช่า และค่าใช้จ่ายอื่น
          </p>
        </div>
      )}
    </div>
  )
}
