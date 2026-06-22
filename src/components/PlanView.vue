<template>
  <div class="plan-view">
    <div class="toolbar">
      <div class="filters">
        <select v-model="filterPet" class="select-sm">
          <option value="">全部宠物</option>
          <option v-for="pet in petList" :key="pet" :value="pet">{{ pet }}</option>
        </select>
        <select v-model="filterMeal" class="select-sm">
          <option value="">全部餐次</option>
          <option v-for="meal in MEAL_TYPES" :key="meal" :value="meal">{{ meal }}</option>
        </select>
        <select v-model="filterFood" class="select-sm">
          <option value="">全部食物类型</option>
          <option v-for="food in FOOD_TYPES" :key="food" :value="food">{{ food }}</option>
        </select>
        <select v-model="filterStatus" class="select-sm">
          <option value="">全部状态</option>
          <option v-for="s in STATUS_TYPES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <select v-model="filterCare" class="select-sm">
          <option value="">全部护理事项</option>
          <option v-for="c in CARE_ITEMS" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="actions">
        <button class="btn btn-primary" @click="openCopyModal">
          复制日期
        </button>
        <button class="btn btn-success" :disabled="selectedIds.length === 0" @click="showBatchMenu = !showBatchMenu">
          批量操作 ({{ selectedIds.length }})
        </button>
        <div v-if="showBatchMenu" class="batch-menu">
          <button v-for="s in STATUS_TYPES" :key="s.value" class="batch-item" @click="doBatch(s.value)">
            {{ s.label }}
          </button>
          <div class="batch-divider"></div>
          <button class="batch-item batch-execute" @click="openBatchExecuteModal">
            ✓ 执行并扣减库存
          </button>
        </div>
        <button class="btn btn-info" @click="$emit('export')">导出CSV</button>
        <button class="btn btn-primary" @click="openAddModal">
          + 新增计划
        </button>
      </div>
    </div>

    <div class="week-tabs">
      <button
        v-for="(day, idx) in DAYS_OF_WEEK"
        :key="idx"
        class="week-tab"
        :class="{ active: activeDay === idx }"
        @click="activeDay = idx"
      >
        {{ day }}
        <span class="day-count">{{ getDayCount(idx) }}</span>
      </button>
    </div>

    <div class="plan-list">
      <div v-if="filteredPlans.length === 0" class="empty-state">
        <p>暂无计划记录，点击上方"新增计划"开始创建</p>
      </div>
      <div
        v-for="plan in filteredPlans"
        :key="plan.id"
        class="plan-card"
        :class="{ selected: selectedIds.includes(plan.id) }"
      >
        <div class="card-header">
          <label class="checkbox-wrap">
            <input type="checkbox" :value="plan.id" v-model="selectedIds">
          </label>
          <span class="pet-name">{{ plan.petName || '未命名宠物' }}</span>
          <span class="meal-tag">{{ plan.meal }}</span>
          <span class="status-badge" :style="{ backgroundColor: getStatusColor(plan.status) }">
            {{ getStatusLabel(plan.status) }}
          </span>
          <div class="card-actions">
            <button
              v-if="plan.status !== 'completed'"
              class="icon-btn success"
              @click="openSingleExecuteModal(plan)"
            >执行</button>
            <button class="icon-btn" @click="openEditModal(plan)">编辑</button>
            <button class="icon-btn danger" @click="removePlan(plan.id)">删除</button>
          </div>
        </div>
        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <label>食物类型</label>
              <span>{{ plan.foodType }}</span>
            </div>
            <div class="info-item">
              <label>单次克数</label>
              <span>{{ plan.grams }}g</span>
            </div>
            <div class="info-item">
              <label>饮水提醒</label>
              <span :class="{ 'text-danger': !plan.waterReminder }">
                {{ plan.waterReminder ? '✓ 已设置' : '✗ 未设置' }}
              </span>
            </div>
            <div class="info-item">
              <label>用品消耗</label>
              <span v-if="plan.supplies.length === 0" class="text-muted">无</span>
              <span v-else class="tag-list">
                <span v-for="(s, i) in plan.supplies" :key="i" class="tag blue">
                  {{ s.name }} ×{{ s.quantity }}
                </span>
              </span>
            </div>
            <div class="info-item full">
              <label>护理事项</label>
              <span v-if="plan.careItems.length === 0" class="text-muted">无</span>
              <span v-else class="tag-list">
                <span v-for="(c, i) in plan.careItems" :key="i" class="tag green">{{ c }}</span>
              </span>
            </div>
            <div class="info-item full" v-if="plan.notes">
              <label>备注</label>
              <span class="notes">{{ plan.notes }}</span>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <select class="select-sm inline-select" :value="plan.status" @change="updatePlanStatus(plan.id, $event.target.value)">
            <option v-for="s in STATUS_TYPES" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="showFormModal" class="modal-overlay" @click.self="closeFormModal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3>{{ editingPlan ? '编辑计划' : '新增计划' }}</h3>
          <button class="close-btn" @click="closeFormModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-item">
              <label>宠物名 *</label>
              <input type="text" v-model="formData.petName" list="petList" placeholder="输入或选择宠物名">
              <datalist id="petList">
                <option v-for="pet in petList" :key="pet" :value="pet"></option>
              </datalist>
            </div>
            <div class="form-item">
              <label>星期</label>
              <select v-model="formData.day">
                <option v-for="(day, idx) in DAYS_OF_WEEK" :key="idx" :value="idx">{{ day }}</option>
              </select>
            </div>
            <div class="form-item">
              <label>餐次</label>
              <select v-model="formData.meal">
                <option v-for="meal in MEAL_TYPES" :key="meal" :value="meal">{{ meal }}</option>
              </select>
            </div>
            <div class="form-item">
              <label>食物类型</label>
              <select v-model="formData.foodType">
                <option v-for="food in FOOD_TYPES" :key="food" :value="food">{{ food }}</option>
              </select>
            </div>
            <div class="form-item">
              <label>单次克数</label>
              <input type="number" v-model.number="formData.grams" min="0">
            </div>
            <div class="form-item">
              <label>执行状态</label>
              <select v-model="formData.status">
                <option v-for="s in STATUS_TYPES" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
            <div class="form-item">
              <label>饮水提醒</label>
              <label class="switch-wrap">
                <input type="checkbox" v-model="formData.waterReminder">
                <span class="switch-label">{{ formData.waterReminder ? '开启' : '关闭' }}</span>
              </label>
            </div>
            <div class="form-item full">
              <label>用品消耗</label>
              <div class="supply-list">
                <div v-for="(s, idx) in formData.supplies" :key="idx" class="supply-row">
                  <input type="text" v-model="s.name" placeholder="用品名称">
                  <select v-model="s.category">
                    <option v-for="cat in SUPPLY_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                  </select>
                  <input type="number" v-model.number="s.quantity" placeholder="数量" min="1">
                  <button class="icon-btn danger small" @click="formData.supplies.splice(idx, 1)">删除</button>
                </div>
                <button class="btn btn-outline btn-sm" @click="addSupply">+ 添加用品</button>
              </div>
            </div>
            <div class="form-item full">
              <label>护理事项</label>
              <div class="care-checkboxes">
                <label v-for="c in CARE_ITEMS" :key="c" class="checkbox-item">
                  <input type="checkbox" :value="c" v-model="formData.careItems">
                  <span>{{ c }}</span>
                </label>
              </div>
            </div>
            <div class="form-item full">
              <label>备注</label>
              <textarea v-model="formData.notes" rows="2" placeholder="备注信息"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeFormModal">取消</button>
          <button class="btn btn-primary" @click="saveForm">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showCopyModal" class="modal-overlay" @click.self="showCopyModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>复制计划到其他日期</h3>
          <button class="close-btn" @click="showCopyModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-item">
            <label>源日期</label>
            <select v-model="copySource">
              <option v-for="(day, idx) in DAYS_OF_WEEK" :key="idx" :value="idx">{{ day }} ({{ getDayCount(idx) }}条)</option>
            </select>
          </div>
          <div class="form-item">
            <label>目标日期（可多选）</label>
            <div class="day-checkboxes">
              <label v-for="(day, idx) in DAYS_OF_WEEK" :key="idx" class="checkbox-item" :class="{ disabled: idx === copySource }">
                <input type="checkbox" :value="idx" v-model="copyTargets" :disabled="idx === copySource">
                <span>{{ day }}</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="showCopyModal = false">取消</button>
          <button class="btn btn-primary" @click="doCopy">执行复制</button>
        </div>
      </div>
    </div>

    <div v-if="showExecuteModal" class="modal-overlay" @click.self="closeExecuteModal">
      <div class="modal modal-lg modal-xl">
        <div class="modal-header">
          <h3>{{ isBatchExecute ? '批量执行计划（扣减库存）' : '执行计划并扣减库存' }}</h3>
          <button class="close-btn" @click="closeExecuteModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="executeFormList.length === 0" class="empty-section">
            <p>无可执行计划</p>
          </div>
          <div v-else class="execute-plan-list">
            <div v-for="(ef, idx) in executeFormList" :key="ef.planId" class="execute-plan-card">
              <div class="exec-plan-header">
                <span class="exec-plan-title">
                  <strong>{{ ef.petName || '未命名宠物' }}</strong>
                  <span class="meal-tag">{{ ef.meal }}</span>
                  <span class="text-muted">{{ DAYS_OF_WEEK[ef.day] }}</span>
                  <span class="text-muted">· {{ ef.foodType }}</span>
                </span>
                <span class="text-danger small" v-if="ef.status === 'completed'">已执行，将跳过</span>
              </div>
              <div class="exec-form-grid">
                <div class="form-item">
                  <label>计划克数</label>
                  <input type="number" :value="ef.plannedGrams" disabled>
                </div>
                <div class="form-item">
                  <label>实际喂食克数 *</label>
                  <input type="number" v-model.number="ef.actualGrams" min="0">
                </div>
                <div class="form-item">
                  <label>执行时间</label>
                  <input type="datetime-local" v-model="ef.executeTimeStr">
                </div>
                <div class="form-item full">
                  <label>实际消耗用品（默认使用计划配置，可调整）</label>
                  <div class="supply-list">
                    <div v-for="(s, sIdx) in ef.actualSupplies" :key="sIdx" class="supply-row">
                      <input type="text" v-model="s.name" placeholder="用品名称">
                      <select v-model="s.category">
                        <option v-for="cat in SUPPLY_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
                      </select>
                      <input type="number" v-model.number="s.quantity" placeholder="数量" min="0">
                      <button class="icon-btn danger small" @click="ef.actualSupplies.splice(sIdx, 1)">删除</button>
                    </div>
                    <button class="btn btn-outline btn-sm" @click="addSupplyToExecForm(idx)">+ 添加用品</button>
                  </div>
                </div>
                <div class="form-item full">
                  <label>执行备注</label>
                  <textarea v-model="ef.notes" rows="2" placeholder="喂食情况、宠物状态等备注"></textarea>
                </div>
              </div>
            </div>
          </div>
          <div v-if="executeWarnings.length > 0" class="warnings-box">
            <div v-for="(w, i) in executeWarnings" :key="i" class="warning-item">
              ⚠️ {{ w }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeExecuteModal">取消</button>
          <button class="btn btn-success" @click="confirmExecute">✓ 确认执行并扣减库存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  plans,
  MEAL_TYPES,
  FOOD_TYPES,
  STATUS_TYPES,
  SUPPLY_CATEGORIES,
  CARE_ITEMS,
  DAYS_OF_WEEK,
  addPlan,
  updatePlan,
  deletePlan,
  getStatusLabel,
  getStatusColor,
  getPetNames,
  copyDayPlans,
  batchUpdateStatus,
  executePlan,
  batchExecutePlans
} from '../composables/usePetStore'

defineEmits(['export'])

const activeDay = ref(0)
const selectedIds = ref([])
const showBatchMenu = ref(false)
const filterPet = ref('')
const filterMeal = ref('')
const filterFood = ref('')
const filterStatus = ref('')
const filterCare = ref('')

const showFormModal = ref(false)
const editingPlan = ref(null)
const formData = ref({
  petName: '',
  day: 0,
  meal: '早餐',
  foodType: '主粮',
  grams: 50,
  waterReminder: true,
  supplies: [],
  careItems: [],
  status: 'pending',
  notes: ''
})

const showCopyModal = ref(false)
const copySource = ref(0)
const copyTargets = ref([])

const showExecuteModal = ref(false)
const isBatchExecute = ref(false)
const executeFormList = ref([])
const executeWarnings = ref([])

function formatLocalDateTimeStr(date = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseDateTimeStr(str) {
  if (!str) return new Date().toISOString()
  const d = new Date(str)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function buildExecFormItem(plan) {
  return {
    planId: plan.id,
    petName: plan.petName,
    day: plan.day,
    meal: plan.meal,
    foodType: plan.foodType,
    status: plan.status,
    plannedGrams: Number(plan.grams) || 0,
    actualGrams: Number(plan.grams) || 0,
    executeTimeStr: formatLocalDateTimeStr(),
    actualSupplies: plan.supplies.map(s => ({
      name: s.name,
      category: s.category || '其他',
      quantity: Number(s.quantity) || 0
    })),
    notes: ''
  }
}

function openSingleExecuteModal(plan) {
  isBatchExecute.value = false
  executeFormList.value = [buildExecFormItem(plan)]
  executeWarnings.value = []
  showExecuteModal.value = true
  showBatchMenu.value = false
}

function openBatchExecuteModal() {
  const plansToExec = plans.value.filter(p => selectedIds.value.includes(p.id))
  if (plansToExec.length === 0) {
    alert('请先选择要执行的计划')
    return
  }
  isBatchExecute.value = true
  executeFormList.value = plansToExec.map(buildExecFormItem)
  executeWarnings.value = []
  showExecuteModal.value = true
  showBatchMenu.value = false
}

function closeExecuteModal() {
  showExecuteModal.value = false
  executeFormList.value = []
  executeWarnings.value = []
}

function addSupplyToExecForm(idx) {
  executeFormList.value[idx].actualSupplies.push({ name: '', category: '其他', quantity: 1 })
}

function confirmExecute() {
  executeWarnings.value = []
  let successCount = 0
  const allWarnings = []

  executeFormList.value.forEach(ef => {
    const result = executePlan(ef.planId, {
      actualGrams: ef.actualGrams,
      actualSupplies: ef.actualSupplies.filter(s => s.name && s.quantity > 0),
      executeTime: parseDateTimeStr(ef.executeTimeStr),
      notes: ef.notes
    })
    if (result.success) {
      successCount++
      if (result.warnings) allWarnings.push(...result.warnings)
    } else if (result.message) {
      executeWarnings.value.push(`${ef.petName || '宠物'} ${ef.meal}: ${result.message}`)
    }
  })

  executeWarnings.value.push(...allWarnings)
  selectedIds.value = []

  setTimeout(() => {
    if (successCount > 0) {
      alert(`成功执行 ${successCount} 条计划，库存已扣减`)
    }
    if (executeWarnings.value.length === 0) {
      closeExecuteModal()
    }
  }, 50)
}

const petList = computed(() => getPetNames())

const dayPlans = computed(() => {
  return plans.value.filter(p => p.day === activeDay.value)
})

const filteredPlans = computed(() => {
  return dayPlans.value.filter(p => {
    if (filterPet.value && p.petName !== filterPet.value) return false
    if (filterMeal.value && p.meal !== filterMeal.value) return false
    if (filterFood.value && p.foodType !== filterFood.value) return false
    if (filterStatus.value && p.status !== filterStatus.value) return false
    if (filterCare.value && !p.careItems.includes(filterCare.value)) return false
    return true
  })
})

function getDayCount(dayIdx) {
  return plans.value.filter(p => p.day === dayIdx).length
}

function openAddModal() {
  editingPlan.value = null
  formData.value = {
    petName: '',
    day: activeDay.value,
    meal: '早餐',
    foodType: '主粮',
    grams: 50,
    waterReminder: true,
    supplies: [],
    careItems: [],
    status: 'pending',
    notes: ''
  }
  showFormModal.value = true
}

function openEditModal(plan) {
  editingPlan.value = plan
  formData.value = JSON.parse(JSON.stringify(plan))
  showFormModal.value = true
}

function closeFormModal() {
  showFormModal.value = false
  editingPlan.value = null
}

function addSupply() {
  formData.value.supplies.push({ name: '', category: '其他', quantity: 1 })
}

function saveForm() {
  if (!formData.value.petName.trim()) {
    alert('请输入宠物名')
    return
  }
  if (editingPlan.value) {
    updatePlan(editingPlan.value.id, formData.value)
  } else {
    addPlan(formData.value)
  }
  closeFormModal()
}

function removePlan(id) {
  if (confirm('确定删除这条计划？')) {
    deletePlan(id)
    const idx = selectedIds.value.indexOf(id)
    if (idx !== -1) selectedIds.value.splice(idx, 1)
  }
}

function updatePlanStatus(id, status) {
  updatePlan(id, { status })
}

function doBatch(status) {
  batchUpdateStatus(selectedIds.value, status)
  selectedIds.value = []
  showBatchMenu.value = false
}

function openCopyModal() {
  copySource.value = activeDay.value
  copyTargets.value = []
  showCopyModal.value = true
}

function doCopy() {
  if (copyTargets.value.length === 0) {
    alert('请选择目标日期')
    return
  }
  const count = copyDayPlans(copySource.value, copyTargets.value)
  alert(`成功复制 ${count} 条计划`)
  showCopyModal.value = false
}

watch(activeDay, () => {
  selectedIds.value = []
  showBatchMenu.value = false
})
</script>

<style scoped>
.plan-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.select-sm {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 8px;
  position: relative;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
}
.btn-primary:hover:not(:disabled) { background: #2563eb; }

.btn-success {
  background: #10b981;
  color: #fff;
}
.btn-success:hover:not(:disabled) { background: #059669; }

.btn-info {
  background: #6366f1;
  color: #fff;
}
.btn-info:hover:not(:disabled) { background: #4f46e5; }

.btn-default {
  background: #f3f4f6;
  color: #374151;
}
.btn-default:hover { background: #e5e7eb; }

.btn-outline {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
}
.btn-outline:hover { background: #f9fafb; }

.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.batch-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  z-index: 100;
  min-width: 140px;
}

.batch-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  background: #fff;
  border: none;
  cursor: pointer;
  font-size: 13px;
}
.batch-item:hover { background: #f3f4f6; }

.week-tabs {
  display: flex;
  gap: 8px;
  background: #fff;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow-x: auto;
}

.week-tab {
  position: relative;
  padding: 10px 20px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.2s;
}
.week-tab:hover { background: #f9fafb; }
.week-tab.active {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}

.day-count {
  margin-left: 6px;
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: 11px;
}
.week-tab.active .day-count {
  background: rgba(255, 255, 255, 0.2);
}

.plan-list {
  display: grid;
  gap: 12px;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  background: #fff;
  border-radius: 12px;
  color: #9ca3af;
}

.plan-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 2px solid transparent;
  transition: all 0.2s;
}
.plan-card.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
  flex-wrap: wrap;
}

.checkbox-wrap {
  display: flex;
  align-items: center;
}

.pet-name {
  font-weight: 600;
  font-size: 16px;
  color: #111827;
}

.meal-tag {
  padding: 3px 10px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 12px;
  font-size: 12px;
}

.status-badge {
  padding: 3px 10px;
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.card-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.icon-btn {
  padding: 4px 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  color: #374151;
}
.icon-btn:hover { background: #f9fafb; }
.icon-btn.danger {
  color: #dc2626;
  border-color: #fecaca;
}
.icon-btn.danger:hover { background: #fef2f2; }
.icon-btn.small {
  padding: 2px 8px;
  font-size: 11px;
}

.card-body {
  padding: 14px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 20px;
}

.info-item {
  display: flex;
  gap: 10px;
  font-size: 13px;
}
.info-item.full {
  grid-column: 1 / -1;
}

.info-item label {
  min-width: 70px;
  color: #6b7280;
  flex-shrink: 0;
}

.info-item span {
  color: #1f2937;
}

.text-danger { color: #dc2626 !important; }
.text-muted { color: #9ca3af !important; }

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}
.tag.blue { background: #dbeafe; color: #1e40af; }
.tag.green { background: #d1fae5; color: #065f46; }

.notes {
  color: #6b7280;
  font-style: italic;
}

.card-footer {
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
}

.inline-select {
  width: auto;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-lg {
  max-width: 720px;
}

.modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}
.close-btn:hover { background: #e5e7eb; }

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-item.full {
  grid-column: 1 / -1;
}

.form-item label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-item input,
.form-item select,
.form-item textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.form-item input:focus,
.form-item select:focus,
.form-item textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.switch-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.switch-wrap input {
  width: 18px;
  height: 18px;
}

.switch-label {
  font-size: 14px;
  color: #1f2937;
}

.supply-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.supply-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.supply-row input,
.supply-row select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
}
.supply-row input[type="number"] {
  flex: 0 0 80px;
}

.care-checkboxes,
.day-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  padding: 10px 0;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  color: #374151;
}
.checkbox-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.checkbox-item input {
  width: 16px;
  height: 16px;
}

@media (max-width: 768px) {
  .info-grid,
  .form-grid,
  .exec-form-grid {
    grid-template-columns: 1fr;
  }
  .week-tabs {
    padding: 8px;
  }
  .week-tab {
    padding: 8px 14px;
    font-size: 13px;
  }
}

.batch-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 4px 0;
}
.batch-execute {
  color: #059669;
  font-weight: 600;
}
.batch-execute:hover { background: #ecfdf5 !important; }

.icon-btn.success {
  color: #059669;
  border-color: #a7f3d0;
}
.icon-btn.success:hover { background: #ecfdf5; }

.modal-xl {
  max-width: 880px;
}

.empty-section {
  padding: 30px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.execute-plan-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.execute-plan-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  background: #fafafa;
}

.exec-plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.exec-plan-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  flex-wrap: wrap;
}

.text-danger.small {
  font-size: 12px;
}

.exec-form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.warnings-box {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
}

.warning-item {
  font-size: 13px;
  color: #92400e;
  line-height: 1.6;
}
</style>
