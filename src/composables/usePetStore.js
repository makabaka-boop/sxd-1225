import { ref, reactive, computed, watch } from 'vue'

const STORAGE_KEY = 'pet_feeding_plan_v1'

export const MEAL_TYPES = ['早餐', '午餐', '晚餐', '加餐']
export const FOOD_TYPES = ['主粮', '湿粮', '零食', '罐头', '冻干', '营养品']
export const STATUS_TYPES = [
  { value: 'pending', label: '待执行', color: '#f59e0b' },
  { value: 'completed', label: '已完成', color: '#10b981' },
  { value: 'adjust', label: '需调整', color: '#ef4444' },
  { value: 'cancelled', label: '临时取消', color: '#6b7280' }
]
export const SUPPLY_CATEGORIES = ['食品', '清洁用品', '美容用品', '玩具', '药品', '其他']
export const CARE_ITEMS = ['梳毛', '洗澡', '剪指甲', '清理耳朵', '刷牙', '遛弯', '体检', '驱虫', '疫苗', '其他']
export const DAYS_OF_WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const saved = loadFromStorage()

export const plans = ref(saved?.plans || [])
export const settings = reactive(saved?.settings || {
  maxDailyFood: 200,
  maxDailyCareItems: 3,
  waterReminderRequired: true
})
export const inventories = ref(saved?.inventories || [
  { name: '主粮A', category: '食品', stock: 1500 },
  { name: '湿粮罐头', category: '食品', stock: 12 },
  { name: '猫砂', category: '清洁用品', stock: 3 },
  { name: '梳子', category: '美容用品', stock: 2 },
  { name: '驱虫药', category: '药品', stock: 5 }
])

let idCounter = saved?.idCounter || 1

watch([plans, settings, inventories], () => {
  saveToStorage({
    plans: plans.value,
    settings,
    inventories: inventories.value,
    idCounter
  })
}, { deep: true })

export function generateId() {
  return `plan_${idCounter++}`
}

export function addPlan(plan) {
  const newPlan = {
    id: generateId(),
    petName: '',
    day: 0,
    meal: '早餐',
    foodType: '主粮',
    grams: 50,
    waterReminder: true,
    supplies: [],
    careItems: [],
    status: 'pending',
    notes: '',
    ...plan
  }
  plans.value.push(newPlan)
  return newPlan
}

export function updatePlan(id, updates) {
  const idx = plans.value.findIndex(p => p.id === id)
  if (idx !== -1) {
    plans.value[idx] = { ...plans.value[idx], ...updates }
  }
}

export function deletePlan(id) {
  const idx = plans.value.findIndex(p => p.id === id)
  if (idx !== -1) {
    plans.value.splice(idx, 1)
  }
}

export function getStatusLabel(value) {
  return STATUS_TYPES.find(s => s.value === value)?.label || value
}

export function getStatusColor(value) {
  return STATUS_TYPES.find(s => s.value === value)?.color || '#666'
}

export function getPetNames() {
  return [...new Set(plans.value.map(p => p.petName).filter(Boolean))]
}

export function copyDayPlans(sourceDay, targetDays) {
  const sourcePlans = plans.value.filter(p => p.day === sourceDay)
  const newPlans = []
  targetDays.forEach(targetDay => {
    sourcePlans.forEach(p => {
      newPlans.push({
        ...p,
        id: generateId(),
        day: targetDay,
        status: 'pending'
      })
    })
  })
  plans.value.push(...newPlans)
  return newPlans.length
}

export function batchUpdateStatus(ids, status) {
  ids.forEach(id => updatePlan(id, { status }))
}

export const allPetNames = computed(() => getPetNames())

export function checkAlerts() {
  const alerts = []
  
  const dailyFood = {}
  plans.value.forEach(p => {
    const key = `${p.petName}-${p.day}`
    if (!dailyFood[key]) dailyFood[key] = 0
    dailyFood[key] += Number(p.grams) || 0
  })
  Object.entries(dailyFood).forEach(([key, total]) => {
    if (total > settings.maxDailyFood) {
      const [pet, day] = key.split('-')
      alerts.push({
        type: 'danger',
        message: `${pet} ${DAYS_OF_WEEK[day]} 单日食量 ${total}g 超过设定上限 ${settings.maxDailyFood}g`
      })
    }
  })

  if (settings.waterReminderRequired) {
    plans.value.forEach(p => {
      if (!p.waterReminder && ['早餐', '午餐', '晚餐'].includes(p.meal)) {
        alerts.push({
          type: 'warning',
          message: `${p.petName || '宠物'} ${DAYS_OF_WEEK[p.day]} ${p.meal} 缺少饮水提醒`
        })
      }
    })
  }

  const supplyTotal = {}
  plans.value.forEach(p => {
    p.supplies.forEach(supply => {
      const name = supply.name
      if (!supplyTotal[name]) {
        supplyTotal[name] = { quantity: 0, category: supply.category || '其他' }
      }
      supplyTotal[name].quantity += Number(supply.quantity) || 0
    })
  })
  Object.entries(supplyTotal).forEach(([name, data]) => {
    const inv = inventories.value.find(i => i.name === name)
    if (inv && data.quantity > inv.stock) {
      alerts.push({
        type: 'danger',
        message: `用品"${name}"本周累计消耗 ${data.quantity} 超过库存 ${inv.stock}，缺 ${data.quantity - inv.stock}`
      })
    } else if (inv && inv.stock - data.quantity <= 2 && inv.stock - data.quantity >= 0) {
      alerts.push({
        type: 'warning',
        message: `用品"${name}"库存偏低，本周消耗 ${data.quantity}，剩余 ${inv.stock - data.quantity}`
      })
    }
  })

  const mealCombo = {}
  plans.value.forEach(p => {
    const key = `${p.petName}-${p.day}-${p.meal}`
    mealCombo[key] = (mealCombo[key] || 0) + 1
  })
  Object.entries(mealCombo).forEach(([key, count]) => {
    if (count > 1) {
      const [pet, day, meal] = key.split('-')
      alerts.push({
        type: 'warning',
        message: `${pet || '宠物'} ${DAYS_OF_WEEK[day]} ${meal} 存在餐次重复 (${count}条)`
      })
    }
  })

  const dailyCare = {}
  plans.value.forEach(p => {
    const key = `${p.petName}-${p.day}`
    if (!dailyCare[key]) dailyCare[key] = new Set()
    p.careItems.forEach(c => dailyCare[key].add(c))
  })
  Object.entries(dailyCare).forEach(([key, items]) => {
    if (items.size > settings.maxDailyCareItems) {
      const [pet, day] = key.split('-')
      alerts.push({
        type: 'warning',
        message: `${pet || '宠物'} ${DAYS_OF_WEEK[day]} 护理事项过于集中 (${items.size}项)`
      })
    }
  })

  return alerts
}

export function getWeeklySuppliesEstimate() {
  const foodEstimate = {}
  const supplyEstimate = {}
  const categoryEstimate = {}

  plans.value.forEach(p => {
    if (!foodEstimate[p.foodType]) {
      foodEstimate[p.foodType] = { grams: 0, meals: 0 }
    }
    foodEstimate[p.foodType].grams += Number(p.grams) || 0
    foodEstimate[p.foodType].meals += 1

    p.supplies.forEach(s => {
      const sCategory = s.category || '其他'
      if (!supplyEstimate[s.name]) {
        supplyEstimate[s.name] = { name: s.name, category: sCategory, quantity: 0 }
      }
      supplyEstimate[s.name].quantity += Number(s.quantity) || 0

      if (!categoryEstimate[sCategory]) {
        categoryEstimate[sCategory] = { category: sCategory, items: [], totalQuantity: 0, totalStock: 0 }
      }
      if (!categoryEstimate[sCategory].items.find(it => it.name === s.name)) {
        categoryEstimate[sCategory].items.push(supplyEstimate[s.name])
      }
    })
  })

  const foodList = Object.entries(foodEstimate).map(([foodType, data]) => ({
    name: foodType,
    category: '食品',
    totalGrams: data.grams,
    meals: data.meals,
    unit: data.grams > 0 ? 'g' : '份'
  }))

  const supplyList = Object.values(supplyEstimate).map(s => {
    const inv = inventories.value.find(i => i.name === s.name)
    const stock = inv?.stock || 0
    const diff = stock - s.quantity
    return {
      ...s,
      stock,
      diff,
      status: diff < 0 ? 'insufficient' : diff <= 2 ? 'prepare' : 'ok'
    }
  })

  Object.values(categoryEstimate).forEach(cat => {
    let totalStock = 0
    let itemCount = 0
    let hasInsufficient = false
    let hasPrepare = false
    cat.items = cat.items.map(item => {
      const fullItem = supplyList.find(s => s.name === item.name)
      if (fullItem) {
        totalStock += fullItem.stock
        itemCount++
        if (fullItem.status === 'insufficient') hasInsufficient = true
        else if (fullItem.status === 'prepare') hasPrepare = true
      }
      return fullItem || item
    })
    cat.totalStock = totalStock
    cat.itemCount = itemCount
    cat.totalQuantity = cat.items.reduce((sum, it) => sum + (it.quantity || 0), 0)
    cat.status = hasInsufficient ? 'insufficient' : hasPrepare ? 'prepare' : itemCount > 0 ? 'ok' : 'ok'
    cat.diff = totalStock - cat.totalQuantity
  })

  const categoryList = Object.values(categoryEstimate).sort((a, b) => {
    const order = SUPPLY_CATEGORIES
    return order.indexOf(a.category) - order.indexOf(b.category)
  })

  return { foodList, supplyList, categoryList }
}

export function exportToCSV() {
  const headers = ['宠物名', '星期', '餐次', '食物类型', '单次克数', '饮水提醒', '用品消耗', '护理事项', '执行状态', '备注']
  const rows = plans.value.map(p => [
    p.petName,
    DAYS_OF_WEEK[p.day],
    p.meal,
    p.foodType,
    p.grams,
    p.waterReminder ? '是' : '否',
    p.supplies.map(s => `${s.name}(${s.quantity})`).join('、'),
    p.careItems.join('、'),
    getStatusLabel(p.status),
    p.notes
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `宠物喂养计划_${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
