<template>
  <div class="supplies-view">
    <div class="view-header">
      <h2>
        <span class="icon">📦</span>
        本周用品估算
      </h2>
      <p class="subtitle">按食物类型和用品类别合并计算，标记需要关注的项目</p>
    </div>

    <div class="summary-cards">
      <div class="summary-card blue">
        <div class="card-num">{{ totalItems }}</div>
        <div class="card-label">估算品类总数</div>
      </div>
      <div class="summary-card green">
        <div class="card-num">{{ okCount }}</div>
        <div class="card-label">库存充足</div>
      </div>
      <div class="summary-card yellow">
        <div class="card-num">{{ prepareCount }}</div>
        <div class="card-label">建议提前准备</div>
      </div>
      <div class="summary-card red">
        <div class="card-num">{{ insufficientCount }}</div>
        <div class="card-label">库存不足</div>
      </div>
    </div>

    <div class="section-card">
      <h3 class="section-title">
        <span class="section-icon">🍖</span>
        食物用量估算
        <span class="section-subtitle">（含执行消耗对比）</span>
      </h3>
      <div v-if="foodList.length === 0" class="empty-section">
        <p>暂无食物相关计划数据</p>
      </div>
      <div v-else class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>食物类型</th>
              <th>类别</th>
              <th>计划餐次</th>
              <th>已执行餐次</th>
              <th>预计总克数</th>
              <th>已执行克数</th>
              <th>剩余待喂食</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(food, idx) in foodList" :key="idx">
              <td>
                <span class="food-name">{{ food.name }}</span>
              </td>
              <td>
                <span class="cat-badge food">{{ food.category }}</span>
              </td>
              <td class="num">{{ food.meals }} 餐</td>
              <td class="num">
                <span class="executed">{{ food.executedMeals || 0 }} 餐</span>
              </td>
              <td class="num strong">{{ food.totalGrams.toLocaleString() }} g</td>
              <td class="num">
                <span class="executed-gram">{{ (food.executedGrams || 0).toLocaleString() }} g</span>
              </td>
              <td class="num">
                <span :class="(food.remainingGrams || 0) < 0 ? 'text-danger' : 'text-success'">
                  {{ (food.remainingGrams || 0).toLocaleString() }} g
                </span>
              </td>
              <td>
                <span v-if="(food.executedGrams || 0) >= food.totalGrams && food.totalGrams > 0" class="status-tag prepare">
                  已完成
                </span>
                <span v-else class="status-tag ok">进行中</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-card">
      <h3 class="section-title">
        <span class="section-icon">🧴</span>
        用品消耗估算（按类别合并 · 含执行对比）
      </h3>
      <div v-if="categoryList.length === 0" class="empty-section">
        <p>暂无用品消耗记录</p>
      </div>
      <div v-else class="category-groups">
        <div
          v-for="(cat, cIdx) in categoryList"
          :key="cIdx"
          class="category-group"
          :class="{
            'group-insufficient': cat.status === 'insufficient',
            'group-prepare': cat.status === 'prepare'
          }"
        >
          <div class="category-header" @click="toggleCategory(cIdx)">
            <span class="expand-icon">{{ expandedCategories.includes(cIdx) ? '▼' : '▶' }}</span>
            <span class="cat-badge large" :class="getCatClass(cat.category)">{{ cat.category }}</span>
            <span class="cat-summary">
              <span class="cat-count">{{ cat.itemCount }} 种用品</span>
              <span class="divider">|</span>
              <span>计划消耗 <strong class="planned-num">{{ cat.totalQuantity }}</strong></span>
              <span class="divider">|</span>
              <span>已执行 <strong class="executed-num">{{ cat.totalExecuted || 0 }}</strong></span>
              <span class="divider">|</span>
              <span>原库存 <strong>{{ cat.totalOriginalStock !== undefined ? cat.totalOriginalStock : cat.totalStock }}</strong></span>
              <span class="divider">|</span>
              <span
                class="diff-num"
                :class="(cat.totalRemaining !== undefined ? cat.totalRemaining : cat.diff) < 0 ? 'text-danger' : (cat.totalRemaining !== undefined ? cat.totalRemaining : cat.diff) <= 2 ? 'text-warning' : 'text-success'"
              >
                扣减后剩余 {{ (cat.totalRemaining !== undefined ? cat.totalRemaining : cat.diff) > 0 ? '+' : '' }}{{ (cat.totalRemaining !== undefined ? cat.totalRemaining : cat.diff) }}
              </span>
            </span>
            <span class="cat-status">
              <span v-if="cat.postStatus === 'insufficient'" class="status-tag insufficient">
                🔴 已不足
              </span>
              <span v-else-if="cat.postStatus === 'prepare'" class="status-tag prepare">
                🟡 扣减后偏低
              </span>
              <span v-else class="status-tag ok">
                🟢 充足
              </span>
            </span>
          </div>
          <div v-show="expandedCategories.includes(cIdx)" class="category-items">
            <table class="data-table inner-table">
              <thead>
                <tr>
                  <th>用品名称</th>
                  <th>计划消耗</th>
                  <th>已执行消耗</th>
                  <th>计划待执行</th>
                  <th>原始库存</th>
                  <th>扣减后剩余</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, idx) in cat.items"
                  :key="idx"
                  :class="{
                    'row-insufficient': item.postStatus === 'insufficient',
                    'row-prepare': item.postStatus === 'prepare'
                  }"
                >
                  <td>
                    <span class="item-name">{{ item.name }}</span>
                  </td>
                  <td class="num planned-num">{{ item.quantity || 0 }}</td>
                  <td class="num executed-num">{{ item.executedQuantity || 0 }}</td>
                  <td class="num">
                    <span :class="(item.plannedRemaining !== undefined && item.plannedRemaining < 0) ? 'text-danger' : ''">
                      {{ item.plannedRemaining !== undefined ? item.plannedRemaining : (item.quantity || 0) }}
                    </span>
                  </td>
                  <td class="num">{{ item.originalStock !== undefined ? item.originalStock : (item.stock || 0) }}</td>
                  <td class="num" :class="(item.remainingQuantity !== undefined ? item.remainingQuantity : item.diff) < 0 ? 'text-danger' : (item.remainingQuantity !== undefined ? item.remainingQuantity : item.diff) <= 2 ? 'text-warning' : 'text-success'">
                    {{ (item.remainingQuantity !== undefined ? item.remainingQuantity : item.diff) > 0 ? '+' : '' }}{{ (item.remainingQuantity !== undefined ? item.remainingQuantity : item.diff) }}
                  </td>
                  <td>
                    <span v-if="item.postStatus === 'insufficient'" class="status-tag insufficient">
                      已不足
                    </span>
                    <span v-else-if="item.postStatus === 'prepare'" class="status-tag prepare">
                      扣减后偏低
                    </span>
                    <span v-else class="status-tag ok">
                      充足
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="tips-section">
      <h3 class="section-title">
        <span class="section-icon">💡</span>
        采购建议
      </h3>
      <div class="tips-grid">
        <div v-if="insufficientCount > 0" class="tip-card danger">
          <h4>立即采购清单</h4>
          <ul>
            <li v-for="item in insufficientItems" :key="item.name">
              <strong>{{ item.name }}</strong>：需要 {{ Math.abs(item.diff) }} 才能满足本周需求
            </li>
          </ul>
        </div>
        <div v-if="prepareCount > 0" class="tip-card warning">
          <h4>建议近期采购</h4>
          <ul>
            <li v-for="item in prepareItems" :key="item.name">
              <strong>{{ item.name }}</strong>：剩余 {{ item.diff }}，库存偏低
            </li>
          </ul>
        </div>
        <div v-if="insufficientCount === 0 && prepareCount === 0" class="tip-card success">
          <h4>库存状态良好</h4>
          <p>本周所有用品库存充足，无需紧急采购 🎉</p>
        </div>
        <div v-if="foodList.length > 0" class="tip-card info">
          <h4>食物采购参考</h4>
          <ul>
            <li v-for="food in foodList" :key="food.name">
              {{ food.name }}：共需约 <strong>{{ food.totalGrams.toLocaleString() }}g</strong>
              <span v-if="food.totalGrams > 500" class="tag warn">建议多备</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getWeeklySuppliesEstimateWithExecution } from '../composables/usePetStore'

const estimate = computed(() => getWeeklySuppliesEstimateWithExecution())
const foodList = computed(() => estimate.value.foodList)
const supplyList = computed(() => estimate.value.supplyList)
const categoryList = computed(() => estimate.value.categoryList)

const expandedCategories = ref([0])

function toggleCategory(idx) {
  const pos = expandedCategories.value.indexOf(idx)
  if (pos === -1) {
    expandedCategories.value.push(idx)
  } else {
    expandedCategories.value.splice(pos, 1)
  }
}

const totalItems = computed(() => foodList.value.length + supplyList.value.length)
const insufficientItems = computed(() => supplyList.value.filter(i => i.postStatus === 'insufficient'))
const prepareItems = computed(() => supplyList.value.filter(i => i.postStatus === 'prepare'))
const insufficientCount = computed(() => insufficientItems.value.length)
const prepareCount = computed(() => prepareItems.value.length)
const okCount = computed(() => supplyList.value.filter(i => i.postStatus === 'ok').length + foodList.value.length)

function getCatClass(category) {
  const map = {
    '食品': 'food',
    '清洁用品': 'clean',
    '美容用品': 'beauty',
    '玩具': 'toy',
    '药品': 'medicine'
  }
  return map[category] || 'other'
}
</script>

<style scoped>
.supplies-view {
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
.summary-card.red { border-top-color: #ef4444; }

.card-num {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  line-height: 1.2;
}
.summary-card.red .card-num { color: #dc2626; }
.summary-card.yellow .card-num { color: #d97706; }
.summary-card.green .card-num { color: #059669; }

.card-label {
  margin-top: 6px;
  font-size: 13px;
  color: #6b7280;
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

.empty-section {
  padding: 30px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

.data-table-wrap {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th,
.data-table td {
  padding: 12px 14px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
}

.data-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  white-space: nowrap;
}

.data-table tbody tr:hover {
  background: #f9fafb;
}

.data-table tr.row-insufficient {
  background: #fef2f2;
}
.data-table tr.row-insufficient:hover {
  background: #fee2e2;
}
.data-table tr.row-prepare {
  background: #fffbeb;
}
.data-table tr.row-prepare:hover {
  background: #fef3c7;
}

.data-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.data-table td.num.strong {
  font-weight: 600;
  color: #1f2937;
}

.text-danger { color: #dc2626; font-weight: 600; }
.text-warning { color: #d97706; font-weight: 600; }
.text-success { color: #059669; }

.food-name,
.item-name {
  font-weight: 500;
  color: #1f2937;
}

.cat-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}
.cat-badge.food { background: #fef3c7; color: #92400e; }
.cat-badge.clean { background: #dbeafe; color: #1e40af; }
.cat-badge.beauty { background: #fce7f3; color: #9d174d; }
.cat-badge.toy { background: #ddd6fe; color: #5b21b6; }
.cat-badge.medicine { background: #fecaca; color: #991b1b; }
.cat-badge.other { background: #e5e7eb; color: #374151; }

.status-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}
.status-tag.ok {
  background: #d1fae5;
  color: #065f46;
}
.status-tag.prepare {
  background: #fef3c7;
  color: #92400e;
}
.status-tag.insufficient {
  background: #fee2e2;
  color: #991b1b;
}

.tag.warn {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 6px;
  font-size: 10px;
}

.category-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-group {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s;
}
.category-group.group-insufficient {
  border-color: #fecaca;
  background: #fef2f2;
}
.category-group.group-prepare {
  border-color: #fde68a;
  background: #fffbeb;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  background: #fff;
  user-select: none;
  transition: background 0.2s;
}
.category-header:hover {
  background: #f9fafb;
}
.group-insufficient .category-header { background: #fef2f2; }
.group-prepare .category-header { background: #fffbeb; }

.expand-icon {
  font-size: 10px;
  color: #9ca3af;
  width: 14px;
  text-align: center;
}

.cat-badge.large {
  padding: 5px 12px;
  font-size: 12px;
}

.cat-summary {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #4b5563;
  flex-wrap: wrap;
}

.cat-summary strong {
  color: #111827;
  font-weight: 600;
}

.cat-count {
  font-weight: 500;
  color: #374151;
}

.divider {
  color: #d1d5db;
}

.diff-num {
  font-weight: 600;
}

.cat-status {
  flex-shrink: 0;
}

.category-items {
  padding: 0 16px 16px 16px;
  background: #fff;
}

.inner-table {
  font-size: 13px;
}
.inner-table th,
.inner-table td {
  padding: 8px 12px;
}
.inner-table th {
  font-size: 12px;
  background: #f9fafb;
}

.tips-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.tip-card {
  border-radius: 10px;
  padding: 16px;
  border-left: 4px solid #9ca3af;
}

.tip-card.danger {
  background: #fef2f2;
  border-left-color: #ef4444;
}
.tip-card.warning {
  background: #fffbeb;
  border-left-color: #f59e0b;
}
.tip-card.success {
  background: #ecfdf5;
  border-left-color: #10b981;
}
.tip-card.info {
  background: #eff6ff;
  border-left-color: #3b82f6;
}

.tip-card h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #1f2937;
}

.tip-card ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #374151;
  line-height: 1.8;
}

.tip-card p {
  margin: 0;
  font-size: 13px;
  color: #374151;
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  .data-table th,
  .data-table td {
    padding: 10px;
    font-size: 13px;
  }
}

.section-subtitle {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 400;
  margin-left: 6px;
}

.executed {
  color: #4f46e5;
  font-weight: 500;
}

.executed-gram {
  color: #4f46e5;
  font-weight: 500;
}

.planned-num {
  color: #2563eb;
  font-weight: 500;
}

.executed-num {
  color: #7c3aed;
  font-weight: 600;
}
</style>
