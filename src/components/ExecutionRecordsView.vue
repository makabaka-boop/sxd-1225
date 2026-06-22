<template>
  <div class="records-view">
    <div class="view-header">
      <h2>
        <span class="icon">📝</span>
        执行记录查询
      </h2>
      <p class="subtitle">查看所有计划执行历史，支持筛选和撤销扣减操作</p>
    </div>

    <div class="summary-cards">
      <div class="summary-card blue">
        <div class="card-num">{{ totalCount }}</div>
        <div class="card-label">总执行记录</div>
      </div>
      <div class="summary-card green">
        <div class="card-num">{{ validCount }}</div>
        <div class="card-label">有效记录</div>
      </div>
      <div class="summary-card yellow">
        <div class="card-num">{{ revokedCount }}</div>
        <div class="card-label">已撤销</div>
      </div>
      <div class="summary-card purple">
        <div class="card-num">{{ todayCount }}</div>
        <div class="card-label">今日执行</div>
      </div>
    </div>

    <div class="filter-card">
      <div class="filter-row">
        <div class="filter-item">
          <label>宠物</label>
          <select v-model="filterPet" class="select-sm">
            <option value="">全部宠物</option>
            <option v-for="pet in petList" :key="pet" :value="pet">{{ pet }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>星期</label>
          <select v-model="filterDayStr" class="select-sm">
            <option value="">全部日期</option>
            <option v-for="(day, idx) in DAYS_OF_WEEK" :key="idx" :value="String(idx)">{{ day }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label>状态</label>
          <select v-model="filterStatus" class="select-sm">
            <option value="">全部状态</option>
            <option value="valid">有效</option>
            <option value="revoked">已撤销</option>
          </select>
        </div>
        <div class="filter-item">
          <label>执行日期</label>
          <input type="date" v-model="filterDate" class="select-sm">
        </div>
        <div class="filter-actions">
          <button class="btn btn-outline btn-sm" @click="resetFilters">重置</button>
        </div>
      </div>
    </div>

    <div class="section-card">
      <h3 class="section-title">
        <span class="section-icon">📋</span>
        执行记录列表
        <span class="count-badge">{{ filteredRecords.length }} 条</span>
      </h3>

      <div v-if="filteredRecords.length === 0" class="empty-section">
        <p>暂无执行记录</p>
      </div>
      <div v-else class="records-list">
        <div
          v-for="record in filteredRecords"
          :key="record.id"
          class="record-card"
          :class="{ revoked: record.revoked }"
        >
          <div class="record-header">
            <div class="record-title">
              <span class="pet-name">{{ record.petName || '未命名宠物' }}</span>
              <span class="meal-tag">{{ record.meal }}</span>
              <span class="day-tag">{{ DAYS_OF_WEEK[record.day] }}</span>
              <span class="food-tag">{{ record.foodType }}</span>
              <span v-if="record.revoked" class="revoked-badge">已撤销</span>
              <span v-else class="valid-badge">有效</span>
            </div>
            <div class="record-time">
              {{ formatTime(record.executeTime) }}
            </div>
          </div>

          <div class="record-body">
            <div class="detail-grid">
              <div class="detail-item">
                <label>计划喂食</label>
                <span>{{ record.plannedGrams }} g</span>
              </div>
              <div class="detail-item">
                <label>实际喂食</label>
                <span
                  :class="record.gramsDiff > 0 ? 'text-danger' : record.gramsDiff < 0 ? 'text-warning' : 'text-success'"
                >
                  {{ record.actualGrams }} g
                  <span v-if="record.gramsDiff !== 0" class="diff-tag">
                    {{ record.gramsDiff > 0 ? '+' : '' }}{{ record.gramsDiff }}g
                  </span>
                </span>
              </div>
              <div class="detail-item full">
                <label>库存扣减（用品）</label>
                <span v-if="record.stockChanges.length === 0" class="text-muted">无</span>
                <span v-else class="tag-list">
                  <span v-for="(sc, i) in record.stockChanges" :key="i" class="tag supply">
                    {{ sc.name }} -{{ sc.amount }}
                  </span>
                </span>
              </div>
              <div class="detail-item full" v-if="record.notes">
                <label>执行备注</label>
                <span class="notes">{{ record.notes }}</span>
              </div>
              <div class="detail-item full" v-if="record.revoked">
                <label>撤销信息</label>
                <span class="text-muted">
                  {{ formatTime(record.revokeTime) }}
                  <span v-if="record.revokeNotes"> · {{ record.revokeNotes }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="record-footer" v-if="!record.revoked">
            <button
              class="btn btn-danger-outline btn-sm"
              @click="openRevokeModal(record)"
            >
              ↶ 撤销执行（恢复库存）
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showRevokeModal" class="modal-overlay" @click.self="closeRevokeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>撤销执行记录</h3>
          <button class="close-btn" @click="closeRevokeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="revoke-info">
            <p><strong>宠物：</strong>{{ revokeRecord?.petName }}</p>
            <p><strong>餐次：</strong>{{ DAYS_OF_WEEK[revokeRecord?.day] }} {{ revokeRecord?.meal }}</p>
            <p><strong>实际喂食：</strong>{{ revokeRecord?.actualGrams }}g</p>
            <p><strong>扣减用品：</strong>{{ revokeRecord?.stockChanges.map(s => `${s.name}-${s.amount}`).join('、') || '无' }}</p>
          </div>
          <div class="warning-notice">
            ⚠️ 撤销后将恢复以上用品库存，并将对应计划状态重置为"待执行"
          </div>
          <div class="form-item">
            <label>撤销原因（可选）</label>
            <textarea v-model="revokeNotes" rows="2" placeholder="输入撤销原因..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeRevokeModal">取消</button>
          <button class="btn btn-danger" @click="confirmRevoke">确认撤销</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  executionRecords,
  DAYS_OF_WEEK,
  getPetNames,
  revokeExecution
} from '../composables/usePetStore'

const petList = computed(() => getPetNames())

const filterPet = ref('')
const filterDayStr = ref('')
const filterStatus = ref('')
const filterDate = ref('')

const showRevokeModal = ref(false)
const revokeRecord = ref(null)
const revokeNotes = ref('')

function getLocalDateStr(isoStr) {
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return ''
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isToday(isoStr) {
  const d = new Date(isoStr)
  const today = new Date()
  return d.getFullYear() === today.getFullYear()
    && d.getMonth() === today.getMonth()
    && d.getDate() === today.getDate()
}

const totalCount = computed(() => executionRecords.value.length)
const validCount = computed(() => executionRecords.value.filter(r => !r.revoked).length)
const revokedCount = computed(() => executionRecords.value.filter(r => r.revoked).length)
const todayCount = computed(() => {
  return executionRecords.value.filter(r => !r.revoked && isToday(r.executeTime)).length
})

const filteredRecords = computed(() => {
  return executionRecords.value.filter(r => {
    if (filterPet.value && r.petName !== filterPet.value) return false
    if (filterDayStr.value !== '' && r.day !== Number(filterDayStr.value)) return false
    if (filterStatus.value === 'valid' && r.revoked) return false
    if (filterStatus.value === 'revoked' && !r.revoked) return false
    if (filterDate.value) {
      const execDate = getLocalDateStr(r.executeTime)
      if (execDate !== filterDate.value) return false
    }
    return true
  })
})

function resetFilters() {
  filterPet.value = ''
  filterDayStr.value = ''
  filterStatus.value = ''
  filterDate.value = ''
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openRevokeModal(record) {
  revokeRecord.value = record
  revokeNotes.value = ''
  showRevokeModal.value = true
}

function closeRevokeModal() {
  showRevokeModal.value = false
  revokeRecord.value = null
  revokeNotes.value = ''
}

function confirmRevoke() {
  if (!revokeRecord.value) return
  const result = revokeExecution(revokeRecord.value.id, revokeNotes.value)
  if (result.success) {
    alert('撤销成功，库存已恢复')
  } else {
    alert(`撤销失败：${result.message}`)
  }
  closeRevokeModal()
}
</script>

<style scoped>
.records-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.view-header h2 {
  margin: 0 0 6px 0;
  font-size: 22px;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon { font-size: 24px; }

.subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.summary-card {
  background: #fff;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  text-align: center;
  border-top: 4px solid #9ca3af;
}
.summary-card.blue { border-top-color: #3b82f6; }
.summary-card.green { border-top-color: #10b981; }
.summary-card.yellow { border-top-color: #f59e0b; }
.summary-card.purple { border-top-color: #8b5cf6; }

.card-num {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}
.summary-card.yellow .card-num { color: #d97706; }
.summary-card.purple .card-num { color: #7c3aed; }

.card-label {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
}

.filter-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  flex-wrap: wrap;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 140px;
}

.filter-item label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.select-sm {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
  cursor: pointer;
}

.filter-actions {
  display: flex;
  gap: 8px;
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

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-outline {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #374151;
}
.btn-outline:hover { background: #f9fafb; }

.btn-default {
  background: #f3f4f6;
  color: #374151;
}
.btn-default:hover { background: #e5e7eb; }

.btn-danger {
  background: #ef4444;
  color: #fff;
}
.btn-danger:hover { background: #dc2626; }

.btn-danger-outline {
  background: transparent;
  border: 1px solid #fecaca;
  color: #dc2626;
}
.btn-danger-outline:hover {
  background: #fef2f2;
}

.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.section-icon { font-size: 18px; }

.count-badge {
  margin-left: 8px;
  padding: 2px 10px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.empty-section {
  padding: 40px 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
}
.record-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.record-card.revoked {
  background: #fafafa;
  opacity: 0.75;
  border-style: dashed;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
  gap: 12px;
  flex-wrap: wrap;
}

.record-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.pet-name {
  font-weight: 600;
  font-size: 15px;
  color: #111827;
}

.meal-tag {
  padding: 2px 10px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 10px;
  font-size: 12px;
}

.day-tag {
  padding: 2px 10px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 10px;
  font-size: 12px;
}

.food-tag {
  padding: 2px 10px;
  background: #d1fae5;
  color: #065f46;
  border-radius: 10px;
  font-size: 12px;
}

.valid-badge {
  padding: 2px 10px;
  background: #d1fae5;
  color: #065f46;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.revoked-badge {
  padding: 2px 10px;
  background: #e5e7eb;
  color: #4b5563;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.record-time {
  font-size: 12px;
  color: #9ca3af;
  white-space: nowrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 20px;
}

.detail-item {
  display: flex;
  gap: 10px;
  font-size: 13px;
  align-items: flex-start;
}
.detail-item.full {
  grid-column: 1 / -1;
}

.detail-item label {
  min-width: 90px;
  color: #6b7280;
  flex-shrink: 0;
}

.detail-item span {
  color: #1f2937;
  flex: 1;
}

.text-danger { color: #dc2626 !important; font-weight: 500; }
.text-warning { color: #d97706 !important; font-weight: 500; }
.text-success { color: #059669 !important; }
.text-muted { color: #9ca3af !important; }

.diff-tag {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 6px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

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
.tag.supply {
  background: #fef2f2;
  color: #991b1b;
}

.notes {
  color: #6b7280;
  font-style: italic;
}

.record-footer {
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
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

.revoke-info {
  background: #f9fafb;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
}
.revoke-info p {
  font-size: 13px;
  color: #374151;
  line-height: 1.8;
  margin: 0;
}

.warning-notice {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-item textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}
.form-item textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .detail-grid {
    grid-template-columns: 1fr;
  }
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  .filter-actions {
    justify-content: flex-end;
  }
}
</style>
