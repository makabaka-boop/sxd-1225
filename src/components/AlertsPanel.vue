<template>
  <div class="alerts-panel">
    <div class="panel-header">
      <h3>
        <span class="icon">⚠️</span>
        异常提醒
      </h3>
      <span v-if="alerts.length > 0" class="alert-count">{{ alerts.length }}</span>
    </div>
    <div v-if="alerts.length === 0" class="no-alerts">
      <span class="check-icon">✓</span>
      <p>暂无异常，本周计划安排合理</p>
    </div>
    <div v-else class="alerts-list">
      <div
        v-for="(alert, idx) in alerts"
        :key="idx"
        class="alert-item"
        :class="alert.type"
      >
        <span class="alert-icon">{{ alert.type === 'danger' ? '🔴' : '🟡' }}</span>
        <span class="alert-text">{{ alert.message }}</span>
      </div>
    </div>

    <div class="settings-section">
      <h4>检查阈值设置</h4>
      <div class="setting-row">
        <label>单日食量上限 (g)</label>
        <input type="number" v-model.number="settings.maxDailyFood" min="0">
      </div>
      <div class="setting-row">
        <label>单日护理事项上限</label>
        <input type="number" v-model.number="settings.maxDailyCareItems" min="1">
      </div>
      <div class="setting-row">
        <label>强制饮水提醒</label>
        <label class="switch">
          <input type="checkbox" v-model="settings.waterReminderRequired">
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-section">
      <h4>
        用品库存
        <button class="btn-link" @click="showAddInv = !showAddInv">
          {{ showAddInv ? '取消' : '+ 添加' }}
        </button>
      </h4>
      <div v-if="showAddInv" class="add-inv-form">
        <input type="text" v-model="newInv.name" placeholder="用品名称">
        <select v-model="newInv.category">
          <option v-for="cat in SUPPLY_CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <input type="number" v-model.number="newInv.stock" placeholder="库存" min="0">
        <button class="btn btn-primary btn-sm" @click="addInventory">添加</button>
      </div>
      <div class="inv-list">
        <div v-for="(inv, idx) in inventories" :key="idx" class="inv-item">
          <span class="inv-name">{{ inv.name }}</span>
          <span class="inv-cat">{{ inv.category }}</span>
          <input type="number" v-model.number="inv.stock" min="0" class="inv-input">
          <button class="icon-btn danger small" @click="inventories.splice(idx, 1)">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { settings, inventories, checkAlerts, SUPPLY_CATEGORIES } from '../composables/usePetStore'

const showAddInv = ref(false)
const newInv = reactive({ name: '', category: '其他', stock: 0 })

const alerts = computed(() => checkAlerts())

function addInventory() {
  if (!newInv.name.trim()) return
  inventories.value.push({
    name: newInv.name,
    category: newInv.category,
    stock: Number(newInv.stock) || 0
  })
  newInv.name = ''
  newInv.category = '其他'
  newInv.stock = 0
  showAddInv.value = false
}
</script>

<style scoped>
.alerts-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: fit-content;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon { font-size: 18px; }

.alert-count {
  padding: 4px 10px;
  background: #ef4444;
  color: #fff;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.no-alerts {
  padding: 30px 20px;
  text-align: center;
  color: #10b981;
}

.check-icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  background: #d1fae5;
  border-radius: 50%;
  font-size: 24px;
  margin-bottom: 10px;
}

.no-alerts p {
  margin: 0;
  font-size: 14px;
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.alert-item.danger {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
  color: #991b1b;
}

.alert-item.warning {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  color: #92400e;
}

.alert-icon {
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1.5;
}

.alert-text {
  flex: 1;
}

.settings-section {
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.settings-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #374151;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-link {
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
}
.btn-link:hover { color: #2563eb; }

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.setting-row label {
  font-size: 13px;
  color: #6b7280;
}

.setting-row input[type="number"] {
  width: 100px;
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  text-align: right;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #d1d5db;
  border-radius: 24px;
  transition: 0.3s;
}
.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}
.switch input:checked + .slider {
  background: #3b82f6;
}
.switch input:checked + .slider:before {
  transform: translateX(20px);
}

.add-inv-form {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.add-inv-form input,
.add-inv-form select {
  padding: 5px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
}
.add-inv-form input:first-child { flex: 1; min-width: 80px; }

.btn-primary {
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  cursor: pointer;
  font-size: 12px;
}
.btn-primary:hover { background: #2563eb; }

.btn-sm { padding: 4px 10px; font-size: 11px; }

.inv-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}

.inv-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
}

.inv-name {
  flex: 1;
  font-weight: 500;
  color: #1f2937;
}

.inv-cat {
  padding: 2px 8px;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 10px;
  font-size: 11px;
}

.inv-input {
  width: 70px;
  padding: 3px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  text-align: right;
}

.icon-btn {
  padding: 3px 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  color: #374151;
}
.icon-btn.danger {
  color: #dc2626;
  border-color: #fecaca;
}
.icon-btn.danger:hover { background: #fef2f2; }
.icon-btn.small { padding: 2px 6px; font-size: 10px; }
</style>
