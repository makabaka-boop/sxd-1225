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

export const RESTOCK_STATUS_TYPES = [
  { value: 'pending', label: '待采购', color: '#f59e0b' },
  { value: 'purchased', label: '已采购', color: '#10b981' },
  { value: 'cancelled', label: '已取消', color: '#6b7280' }
]

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
export const executionRecords = ref(saved?.executionRecords || [])
export const restockList = ref(saved?.restockList || [])

let idCounter = saved?.idCounter || 1
let recordIdCounter = saved?.recordIdCounter || 1
let restockIdCounter = saved?.restockIdCounter || 1

watch([plans, settings, inventories, executionRecords, restockList], () => {
  saveToStorage({
    plans: plans.value,
    settings,
    inventories: inventories.value,
    executionRecords: executionRecords.value,
    restockList: restockList.value,
    idCounter,
    recordIdCounter,
    restockIdCounter
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
    const oldPlan = plans.value[idx]
    const wasCompleted = oldPlan.status === 'completed'
    const newStatus = updates.status
    if (wasCompleted && newStatus && newStatus !== 'completed') {
      const latestExec = executionRecords.value.find(r => r.planId === id && !r.revoked)
      if (latestExec) {
        revokeExecution(latestExec.id, '计划状态变更，自动撤销执行')
      }
    }
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

function generateRecordId() {
  return `exec_${recordIdCounter++}`
}

function ensureInventoryItem(name, category) {
  let inv = inventories.value.find(i => i.name === name)
  if (!inv) {
    inv = { name, category: category || '其他', stock: 0 }
    inventories.value.push(inv)
  }
  return inv
}

export function executePlan(planId, executionData) {
  const plan = plans.value.find(p => p.id === planId)
  if (!plan) return { success: false, message: '计划不存在' }
  if (plan.status === 'completed') return { success: false, message: '计划已执行，请勿重复执行' }

  const actualGrams = Number(executionData.actualGrams ?? plan.grams) || 0
  const actualSupplies = executionData.actualSupplies?.length > 0
    ? executionData.actualSupplies.map(s => ({
        name: s.name,
        category: s.category || '其他',
        quantity: Number(s.quantity) || 0
      }))
    : plan.supplies.map(s => ({ ...s, quantity: Number(s.quantity) || 0 }))
  const executeTime = executionData.executeTime || new Date().toISOString()
  const notes = executionData.notes || ''

  const stockChanges = []
  const warnings = []

  actualSupplies.forEach(s => {
    if (s.quantity > 0) {
      const inv = ensureInventoryItem(s.name, s.category)
      if (inv.stock < s.quantity) {
        warnings.push(`用品"${s.name}"库存不足，需要 ${s.quantity}，当前库存 ${inv.stock}`)
      }
      stockChanges.push({ name: s.name, category: s.category, amount: s.quantity })
      inv.stock = Math.max(0, inv.stock - s.quantity)
    }
  })

  const record = {
    id: generateRecordId(),
    planId: plan.id,
    petName: plan.petName,
    day: plan.day,
    meal: plan.meal,
    foodType: plan.foodType,
    plannedGrams: Number(plan.grams) || 0,
    actualGrams,
    gramsDiff: actualGrams - (Number(plan.grams) || 0),
    plannedSupplies: plan.supplies.map(s => ({ ...s })),
    actualSupplies,
    stockChanges,
    executeTime,
    notes,
    revoked: false,
    revokeTime: null,
    revokeNotes: ''
  }

  executionRecords.value.unshift(record)

  updatePlan(planId, { status: 'completed' })
  
  refreshRestockItemEstimates()

  return {
    success: true,
    record,
    warnings
  }
}

export function batchExecutePlans(planIds, executionDataList) {
  const results = []
  planIds.forEach((planId, index) => {
    const execData = executionDataList?.[index] || {}
    const result = executePlan(planId, execData)
    results.push({ planId, ...result })
  })
  return results
}

export function revokeExecution(recordId, revokeNotes = '') {
  const record = executionRecords.value.find(r => r.id === recordId)
  if (!record) return { success: false, message: '执行记录不存在' }
  if (record.revoked) return { success: false, message: '该记录已撤销' }

  record.stockChanges.forEach(change => {
    const inv = ensureInventoryItem(change.name, change.category)
    inv.stock += change.amount
  })

  record.revoked = true
  record.revokeTime = new Date().toISOString()
  record.revokeNotes = revokeNotes

  const plan = plans.value.find(p => p.id === record.planId)
  if (plan && plan.status === 'completed') {
    updatePlan(plan.id, { status: 'pending' })
  }
  
  refreshRestockItemEstimates()

  return { success: true, record }
}

export function getExecutionRecords(filters = {}) {
  return executionRecords.value.filter(r => {
    if (filters.petName && r.petName !== filters.petName) return false
    if (filters.day !== undefined && r.day !== filters.day) return false
    if (filters.revoked !== undefined && r.revoked !== filters.revoked) return false
    if (filters.planId && r.planId !== filters.planId) return false
    if (filters.startTime && new Date(r.executeTime) < new Date(filters.startTime)) return false
    if (filters.endTime && new Date(r.executeTime) > new Date(filters.endTime)) return false
    return true
  })
}

export function getPlanExecutions(planId) {
  return executionRecords.value.filter(r => r.planId === planId && !r.revoked)
}

export function getExecutedSuppliesSummary() {
  const summary = {}
  executionRecords.value
    .filter(r => !r.revoked)
    .forEach(r => {
      r.actualSupplies.forEach(s => {
        if (!summary[s.name]) {
          summary[s.name] = { name: s.name, category: s.category || '其他', executedQuantity: 0 }
        }
        summary[s.name].executedQuantity += Number(s.quantity) || 0
      })
    })
  return Object.values(summary)
}

export function getExecutedFoodSummary() {
  const summary = {}
  executionRecords.value
    .filter(r => !r.revoked)
    .forEach(r => {
      if (!summary[r.foodType]) {
        summary[r.foodType] = { name: r.foodType, executedGrams: 0, executedMeals: 0 }
      }
      summary[r.foodType].executedGrams += Number(r.actualGrams) || 0
      summary[r.foodType].executedMeals += 1
    })
  return Object.values(summary)
}

export function getTodayWeekdayIndex() {
  const d = new Date().getDay()
  return d === 0 ? 6 : d - 1
}

export function getWeeklySuppliesEstimateWithExecution() {
  const base = getWeeklySuppliesEstimate()
  const executedFood = getExecutedFoodSummary()
  const executedSupplies = getExecutedSuppliesSummary()

  const foodMap = {}
  base.foodList.forEach(f => { foodMap[f.name] = { ...f } })
  executedFood.forEach(ef => {
    if (foodMap[ef.name]) {
      foodMap[ef.name].executedGrams = ef.executedGrams
      foodMap[ef.name].executedMeals = ef.executedMeals
      foodMap[ef.name].remainingGrams = Math.max(0, foodMap[ef.name].totalGrams - ef.executedGrams)
    } else {
      foodMap[ef.name] = {
        name: ef.name,
        category: '食品',
        totalGrams: 0,
        meals: 0,
        unit: 'g',
        executedGrams: ef.executedGrams,
        executedMeals: ef.executedMeals,
        remainingGrams: -ef.executedGrams
      }
    }
  })
  Object.values(foodMap).forEach(f => {
    if (f.executedGrams === undefined) f.executedGrams = 0
    if (f.executedMeals === undefined) f.executedMeals = 0
    if (f.remainingGrams === undefined) f.remainingGrams = f.totalGrams
  })

  const supplyMap = {}
  base.supplyList.forEach(s => { supplyMap[s.name] = { ...s } })
  executedSupplies.forEach(es => {
    if (supplyMap[es.name]) {
      supplyMap[es.name].executedQuantity = es.executedQuantity
      supplyMap[es.name].originalStock = (supplyMap[es.name].stock || 0) + es.executedQuantity
      supplyMap[es.name].remainingQuantity = supplyMap[es.name].stock || 0
      supplyMap[es.name].plannedRemaining = Math.max(0,
        (supplyMap[es.name].quantity || 0) - es.executedQuantity)
      const currentStock = supplyMap[es.name].stock || 0
      supplyMap[es.name].postStatus = currentStock < 0 ? 'insufficient' : currentStock <= 2 ? 'prepare' : 'ok'
      supplyMap[es.name].diff = (supplyMap[es.name].stock || 0) + es.executedQuantity - (supplyMap[es.name].quantity || 0)
    } else {
      const inv = inventories.value.find(i => i.name === es.name)
      const stock = inv?.stock || 0
      supplyMap[es.name] = {
        name: es.name,
        category: es.category,
        quantity: 0,
        stock,
        originalStock: stock + es.executedQuantity,
        diff: stock + es.executedQuantity,
        status: stock < 0 ? 'insufficient' : stock <= 2 ? 'prepare' : 'ok',
        executedQuantity: es.executedQuantity,
        remainingQuantity: stock,
        plannedRemaining: -es.executedQuantity,
        postStatus: stock < 0 ? 'insufficient' : stock <= 2 ? 'prepare' : 'ok'
      }
    }
  })
  Object.values(supplyMap).forEach(s => {
    if (s.executedQuantity === undefined) {
      s.executedQuantity = 0
      s.originalStock = s.stock || 0
    }
    if (s.remainingQuantity === undefined) s.remainingQuantity = s.stock || 0
    if (s.plannedRemaining === undefined) s.plannedRemaining = s.quantity || 0
    if (s.postStatus === undefined) s.postStatus = s.status
    if (s.originalStock === undefined) s.originalStock = s.stock || 0
  })

  const newCategoryList = base.categoryList.map(cat => {
    const newItems = cat.items.map(item => {
      const enhanced = supplyMap[item.name]
      return enhanced || {
        ...item,
        executedQuantity: 0,
        originalStock: item.stock,
        remainingQuantity: item.stock,
        plannedRemaining: item.quantity,
        postStatus: item.status
      }
    })
    const executedNotInPlan = Object.values(supplyMap).filter(s =>
      s.category === cat.category && !newItems.find(ni => ni.name === s.name)
    )
    const totalExecuted = newItems.reduce((sum, it) => sum + (it.executedQuantity || 0), 0)
      + executedNotInPlan.reduce((sum, it) => sum + (it.executedQuantity || 0), 0)
    const totalOriginalStock = newItems.reduce((sum, it) => sum + (it.originalStock || 0), 0)
      + executedNotInPlan.reduce((sum, it) => sum + (it.originalStock || 0), 0)
    const totalCurrentStock = newItems.reduce((sum, it) => sum + (it.remainingQuantity || 0), 0)
      + executedNotInPlan.reduce((sum, it) => sum + (it.remainingQuantity || 0), 0)
    const hasInsufficient = [...newItems, ...executedNotInPlan].some(it => it.postStatus === 'insufficient')
    const hasPrepare = [...newItems, ...executedNotInPlan].some(it => it.postStatus === 'prepare')
    return {
      ...cat,
      items: [...newItems, ...executedNotInPlan],
      totalExecuted,
      totalOriginalStock,
      totalRemaining: totalCurrentStock,
      postStatus: hasInsufficient ? 'insufficient' : hasPrepare ? 'prepare' : cat.status
    }
  })

  const newCatMap = {}
  newCategoryList.forEach(c => { newCatMap[c.category] = c })
  Object.values(supplyMap).forEach(s => {
    if (!newCatMap[s.category] && s.executedQuantity > 0) {
      newCatMap[s.category] = {
        category: s.category,
        items: [s],
        totalQuantity: 0,
        totalStock: s.originalStock || 0,
        totalOriginalStock: s.originalStock || 0,
        totalExecuted: s.executedQuantity,
        totalRemaining: s.stock || 0,
        itemCount: 1,
        postStatus: s.postStatus,
        status: s.status,
        diff: s.stock || 0
      }
    }
  })

  const finalCategoryList = Object.values(newCatMap).sort((a, b) => {
    const order = SUPPLY_CATEGORIES
    return order.indexOf(a.category) - order.indexOf(b.category)
  })

  return {
    foodList: Object.values(foodMap),
    supplyList: Object.values(supplyMap),
    categoryList: finalCategoryList
  }
}

function isToday(isoStr) {
  const d = new Date(isoStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate()
}

export function checkAlertsEnhanced() {
  const alerts = checkAlerts()
  const todayIdx = getTodayWeekdayIndex()

  const todayPlans = plans.value.filter(p => p.day === todayIdx)
  const todayPending = todayPlans.filter(p => p.status === 'pending')
  if (todayPending.length > 0) {
    alerts.push({
      type: 'warning',
      message: `今日（${DAYS_OF_WEEK[todayIdx]}）仍有 ${todayPending.length} 条计划未执行`
    })
  }

  executionRecords.value
    .filter(r => !r.revoked)
    .forEach(r => {
      if (r.gramsDiff > 0) {
        alerts.push({
          type: 'warning',
          message: `${r.petName || '宠物'} ${DAYS_OF_WEEK[r.day]} ${r.meal} 实际喂食 ${r.actualGrams}g 超出计划 ${r.plannedGrams}g，超量 ${r.gramsDiff}g`
        })
      }
    })

  inventories.value.forEach(inv => {
    if (inv.stock <= 0) {
      alerts.push({
        type: 'danger',
        message: `用品"${inv.name}"当前库存已耗尽，请尽快补货`
      })
    } else if (inv.stock <= 2) {
      alerts.push({
        type: 'warning',
        message: `用品"${inv.name}"库存偏低，当前剩余 ${inv.stock}`
      })
    }
  })

  const petDailyExecGrams = {}
  executionRecords.value
    .filter(r => !r.revoked && isToday(r.executeTime))
    .forEach(r => {
      const key = r.petName
      if (!petDailyExecGrams[key]) petDailyExecGrams[key] = 0
      petDailyExecGrams[key] += r.actualGrams
    })
  Object.entries(petDailyExecGrams).forEach(([pet, total]) => {
    if (total > settings.maxDailyFood) {
      alerts.push({
        type: 'danger',
        message: `${pet} 今日实际喂食 ${total}g 已超过单日上限 ${settings.maxDailyFood}g`
      })
    }
  })

  return alerts
}

function generateRestockId() {
  return `restock_${restockIdCounter++}`
}

export function getRestockStatusLabel(value) {
  return RESTOCK_STATUS_TYPES.find(s => s.value === value)?.label || value
}

export function getRestockStatusColor(value) {
  return RESTOCK_STATUS_TYPES.find(s => s.value === value)?.color || '#666'
}

export function addRestockItem(item) {
  const inv = inventories.value.find(i => i.name === item.name)
  const currentStock = inv?.stock || 0
  
  const estimate = getWeeklySuppliesEstimateWithExecution()
  const supplyItem = estimate.supplyList.find(s => s.name === item.name)
  const weeklyUsage = supplyItem?.quantity || 0
  const estimatedGap = Math.max(0, weeklyUsage - currentStock)
  
  const suggestedQuantity = item.suggestedQuantity || 
    (estimatedGap > 0 ? Math.ceil(estimatedGap * 1.5) : Math.ceil(weeklyUsage * 0.5) || 1)

  const newItem = {
    id: generateRestockId(),
    name: item.name,
    category: item.category || inv?.category || '其他',
    currentStock,
    weeklyUsage,
    estimatedGap,
    suggestedQuantity,
    actualQuantity: item.actualQuantity || suggestedQuantity,
    status: 'pending',
    notes: item.notes || '',
    source: item.source || 'manual',
    relatedAlert: item.relatedAlert || null,
    createdAt: new Date().toISOString(),
    purchasedAt: null,
    purchaseNotes: ''
  }
  
  restockList.value.push(newItem)
  return newItem
}

export function updateRestockItem(id, updates) {
  const idx = restockList.value.findIndex(r => r.id === id)
  if (idx !== -1) {
    restockList.value[idx] = { ...restockList.value[idx], ...updates }
    return restockList.value[idx]
  }
  return null
}

export function deleteRestockItem(id) {
  const idx = restockList.value.findIndex(r => r.id === id)
  if (idx !== -1) {
    restockList.value.splice(idx, 1)
    return true
  }
  return false
}

export function markRestockPurchased(id, purchaseData = {}) {
  const idx = restockList.value.findIndex(r => r.id === id)
  if (idx === -1) return { success: false, message: '补货项不存在' }
  
  const item = restockList.value[idx]
  if (item.status === 'purchased') return { success: false, message: '该补货项已标记为已采购' }
  
  const quantity = Number(purchaseData.actualQuantity) || Number(item.actualQuantity) || 0
  if (quantity <= 0) return { success: false, message: '采购数量必须大于0' }
  
  const inv = ensureInventoryItem(item.name, item.category)
  inv.stock += quantity
  
  item.status = 'purchased'
  item.actualQuantity = quantity
  item.purchasedAt = purchaseData.purchasedAt || new Date().toISOString()
  item.purchaseNotes = purchaseData.purchaseNotes || ''
  
  restockList.value[idx] = item
  
  return {
    success: true,
    item,
    message: `已采购 ${item.name} ${quantity}，库存已更新`
  }
}

export function cancelRestockItem(id) {
  const idx = restockList.value.findIndex(r => r.id === id)
  if (idx !== -1 && restockList.value[idx].status === 'pending') {
    restockList.value[idx].status = 'cancelled'
    return true
  }
  return false
}

export function reopenRestockItem(id) {
  const idx = restockList.value.findIndex(r => r.id === id)
  if (idx !== -1 && restockList.value[idx].status !== 'pending') {
    const item = restockList.value[idx]
    if (item.status === 'purchased') {
      const inv = inventories.value.find(i => i.name === item.name)
      if (inv) {
        inv.stock = Math.max(0, inv.stock - (item.actualQuantity || 0))
      }
    }
    item.status = 'pending'
    item.purchasedAt = null
    item.purchaseNotes = ''
    return true
  }
  return false
}

export function autoGenerateRestockItems() {
  const estimate = getWeeklySuppliesEstimateWithExecution()
  const generated = []
  const existingPendingNames = new Set(
    restockList.value
      .filter(r => r.status === 'pending')
      .map(r => r.name)
  )
  
  estimate.supplyList.forEach(supply => {
    if (existingPendingNames.has(supply.name)) return
    
    const needsRestock = supply.postStatus === 'insufficient' || supply.postStatus === 'prepare'
    
    if (needsRestock) {
      const item = addRestockItem({
        name: supply.name,
        category: supply.category,
        source: 'auto',
        notes: supply.postStatus === 'insufficient' 
          ? '系统自动生成：库存不足，无法满足本周需求' 
          : '系统自动生成：预计本周消耗后库存偏低'
      })
      generated.push(item)
    }
  })
  
  inventories.value.forEach(inv => {
    if (existingPendingNames.has(inv.name)) return
    if (generated.some(g => g.name === inv.name)) return
    
    if (inv.stock <= 2) {
      const item = addRestockItem({
        name: inv.name,
        category: inv.category,
        source: 'auto',
        notes: `系统自动生成：当前库存仅余 ${inv.stock}，库存偏低`
      })
      generated.push(item)
    }
  })
  
  return generated
}

export function isInRestockList(name) {
  return restockList.value.some(r => r.name === name && r.status === 'pending')
}

export function getRestockItems(filters = {}) {
  return restockList.value.filter(r => {
    if (filters.status && r.status !== filters.status) return false
    if (filters.category && r.category !== filters.category) return false
    if (filters.search && !r.name.includes(filters.search)) return false
    return true
  })
}

export function refreshRestockItemEstimates() {
  const estimate = getWeeklySuppliesEstimateWithExecution()
  
  restockList.value.forEach(item => {
    if (item.status !== 'pending') return
    
    const inv = inventories.value.find(i => i.name === item.name)
    const supplyItem = estimate.supplyList.find(s => s.name === item.name)
    
    if (inv) {
      item.currentStock = inv.stock
    }
    if (supplyItem) {
      item.weeklyUsage = supplyItem.quantity || 0
      item.estimatedGap = Math.max(0, item.weeklyUsage - item.currentStock)
    }
  })
}
