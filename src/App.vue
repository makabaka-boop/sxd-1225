<script setup>
import { ref } from 'vue'
import PlanView from './components/PlanView.vue'
import SuppliesView from './components/SuppliesView.vue'
import AlertsPanel from './components/AlertsPanel.vue'
import { exportToCSV, checkAlerts } from './composables/usePetStore'
import { computed } from 'vue'

const currentTab = ref('plan')
const alertCount = computed(() => checkAlerts().length)

function handleExport() {
  exportToCSV()
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <div class="header-inner">
        <div class="logo-area">
          <span class="logo-icon">🐾</span>
          <div>
            <h1>宠物喂养计划管理</h1>
            <p>一周喂养计划 · 用品估算 · 异常提醒</p>
          </div>
        </div>
        <nav class="tabs">
          <button
            class="tab-btn"
            :class="{ active: currentTab === 'plan' }"
            @click="currentTab = 'plan'"
          >
            <span class="tab-icon">📋</span>
            计划管理
          </button>
          <button
            class="tab-btn"
            :class="{ active: currentTab === 'supplies' }"
            @click="currentTab = 'supplies'"
          >
            <span class="tab-icon">📦</span>
            本周用品估算
          </button>
          <button
            class="tab-btn alert-tab"
            :class="{ active: currentTab === 'alerts', 'has-alert': alertCount > 0 }"
            @click="currentTab = 'alerts'"
          >
            <span class="tab-icon">⚠️</span>
            异常提醒
            <span v-if="alertCount > 0" class="tab-badge">{{ alertCount }}</span>
          </button>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <div v-if="currentTab === 'plan'" class="content-layout">
        <div class="main-content">
          <PlanView @export="handleExport" />
        </div>
        <aside class="side-panel">
          <AlertsPanel />
        </aside>
      </div>
      <div v-else-if="currentTab === 'supplies'" class="content-layout">
        <div class="main-content">
          <SuppliesView />
        </div>
        <aside class="side-panel">
          <AlertsPanel />
        </aside>
      </div>
      <div v-else class="alerts-full">
        <div class="alerts-card-large">
          <AlertsPanel />
        </div>
      </div>
    </main>

    <footer class="app-footer">
      <p>数据保存在浏览器 localStorage 中 · 支持导出 CSV 备份</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f0f9ff 0%, #fdf4ff 50%, #fef3c7 100%);
}

.app-header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-icon {
  font-size: 36px;
}

.logo-area h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  background: linear-gradient(135deg, #f97316, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-area p {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #6b7280;
}

.tabs {
  display: flex;
  gap: 6px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 10px;
}

.tab-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #374151;
  background: rgba(255, 255, 255, 0.6);
}

.tab-btn.active {
  background: #fff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tab-icon {
  font-size: 16px;
}

.tab-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ef4444;
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.alert-tab.has-alert {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15); }
}

.app-main {
  flex: 1;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.main-content {
  min-width: 0;
}

.side-panel {
  position: sticky;
  top: 90px;
}

.alerts-full {
  max-width: 680px;
  margin: 0 auto;
}

.alerts-card-large {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 0;
  overflow: hidden;
}

.app-footer {
  padding: 20px 24px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

.app-footer p {
  margin: 0;
}

@media (max-width: 1024px) {
  .content-layout {
    grid-template-columns: 1fr;
  }
  .side-panel {
    position: static;
  }
}

@media (max-width: 640px) {
  .header-inner {
    padding: 12px 16px;
    flex-direction: column;
    align-items: stretch;
  }
  .tabs {
    overflow-x: auto;
    justify-content: flex-start;
  }
  .tab-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
  .app-main {
    padding: 16px;
  }
}
</style>
