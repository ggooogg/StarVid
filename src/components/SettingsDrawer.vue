<!-- 设置抽屉：数据源多选、功能开关、豆瓣数据/图片代理、清除缓存 -->
<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Delete } from '@element-plus/icons-vue'
import { useUiStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { DOUBAN_DATA_PROXIES, DOUBAN_IMAGE_PROXIES } from '../lib/doubanProxies'
import { API_SITE_OPTIONS, ALL_SOURCE_KEYS, getSelectedSources, setSelectedSources } from '../data/apiSites'

const ui = useUiStore()
const settings = useSettingsStore()

const apiSources = API_SITE_OPTIONS // 所有可选资源站

const selectedApis = ref(getSelectedSources()) // 当前已选资源站

/** 持久化用户选择的资源站 */
function persistApis() {
  setSelectedSources(selectedApis.value)
}

/**
 * 全选 / 全不选资源站。
 * @param {boolean} on true 为全选，false 为全不选
 */
function selectAll(on) {
  selectedApis.value = on ? [...ALL_SOURCE_KEYS] : []
  persistApis()
}

/**
 * 清除所有本地缓存（localStorage）并刷新页面。
 */
function clearCookie() {
  localStorage.clear()
  ElMessage.success('已清除本地缓存，即将刷新')
  setTimeout(() => location.reload(), 1200)
}

// 当前选中的豆瓣数据/图片代理（用于展示说明与致谢信息）
const currentDataProxy = computed(
  () => DOUBAN_DATA_PROXIES.find((p) => p.value === settings.doubanProxyType) || {}
)
const currentImageProxy = computed(
  () => DOUBAN_IMAGE_PROXIES.find((p) => p.value === settings.doubanImageProxyType) || {}
)

// 抽屉宽度：移动端占 90%，桌面端固定 440px
const drawerSize = computed(() =>
  window.innerWidth < 768 ? '90%' : '440px'
)
</script>

<template>
  <el-drawer
    :model-value="ui.settingsOpen"
    :size="drawerSize"
    direction="rtl"
    :with-header="false"
    @update:model-value="ui.closeSettings()"
    class="settings-drawer"
  >
    <div class="settings">
      <div class="set-head">
        <h3 class="gradient-text">设置</h3>
        <el-button text circle @click="ui.closeSettings()">
          <el-icon :size="20"><Close /></el-icon>
        </el-button>
      </div>

      <div class="set-body">
        <div class="set-card">
          <div class="card-head">
            <div class="card-title">数据源设置</div>
            <div class="batch-btns">
              <el-button size="small" @click="selectAll(true)">全选</el-button>
              <el-button size="small" @click="selectAll(false)">全不选</el-button>
            </div>
          </div>
          <div class="api-list">
            <el-checkbox-group v-model="selectedApis" class="api-group" @change="persistApis">
              <el-checkbox
                v-for="src in apiSources"
                :key="src.key"
                :value="src.key"
                class="api-item"
              >
                {{ src.name }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
          <div class="api-count">已选数量：{{ selectedApis.length }} / {{ apiSources.length }}</div>
        </div>

        <div class="set-card">
          <div class="card-title">功能开关</div>

          <div class="switch-row">
            <div>
              <div cl ass="switch-label">启用优选和测速</div>
              <div class="switch-desc">自动优选最快数据源并测量镜像延迟</div>
            </div>
            <el-switch v-model="settings.optimization" />
          </div>

          <div class="switch-row">
            <div>
              <div class="switch-label">分片广告过滤</div>
              <div class="switch-desc">关闭可减少旧版浏览器卡顿</div>
            </div>
            <el-switch v-model="settings.adFilter" />
          </div>

          <div class="switch-row">
            <div>
              <div class="switch-label">豆瓣热门推荐</div>
              <div class="switch-desc">首页显示豆瓣热门影视内容</div>
            </div>
            <el-switch v-model="settings.doubanHot" />
          </div>
        </div>

        <div class="set-card">
          <div class="card-title">豆瓣数据代理</div>
          <div class="switch-desc mb">选择豆瓣接口数据的转发方式</div>
          <el-select v-model="settings.doubanProxyType" size="small" class="proxy-select">
            <el-option
              v-for="p in DOUBAN_DATA_PROXIES"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
          <el-input
            v-if="settings.doubanProxyType === 'custom'"
            v-model="settings.doubanProxyUrl"
            size="small"
            class="proxy-input"
            placeholder="自定义代理前缀，如 https://example.com/"
            clearable
          />
          <div v-if="currentDataProxy.desc" class="switch-desc" style="margin-top: 10px">
            {{ currentDataProxy.desc }}
          </div>
          <a
            v-if="currentDataProxy.thanks"
            class="thanks"
            :href="currentDataProxy.thanks.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ currentDataProxy.thanks.text }}
          </a>
        </div>

        <div class="set-card">
          <div class="card-title">豆瓣图片代理</div>
          <div class="switch-desc mb">选择豆瓣海报图片的加载方式（防盗链）</div>
          <el-select v-model="settings.doubanImageProxyType" size="small" class="proxy-select">
            <el-option
              v-for="p in DOUBAN_IMAGE_PROXIES"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
          <el-input
            v-if="settings.doubanImageProxyType === 'custom'"
            v-model="settings.doubanImageProxyUrl"
            size="small"
            class="proxy-input"
            placeholder="自定义代理前缀，如 https://example.com/"
            clearable
          />
          <div v-if="currentImageProxy.desc" class="switch-desc" style="margin-top: 10px">
            {{ currentImageProxy.desc }}
          </div>
          <a
            v-if="currentImageProxy.thanks"
            class="thanks"
            :href="currentImageProxy.thanks.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ currentImageProxy.thanks.text }}
          </a>
        </div>

        <div class="set-card">
          <div class="card-title">一般功能</div>
          <el-button class="block-btn danger" @click="clearCookie">
            <el-icon><Delete /></el-icon><span class="ml">清除 Cookie</span>
          </el-button>
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
.settings {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.set-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--border);

  h3 {
    font-size: 18px;
    font-weight: 700;
  }
}

.set-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.set-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
  margin-bottom: 16px;
}

.card-head .card-title {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.batch-btns {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.api-list {
  max-height: 240px;
  overflow-y: auto;
  padding-right: 4px;
}

.api-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 16px;
}

.api-item {
  font-size: 14px;
  margin-right: 0;
  height: auto;

  :deep(.el-checkbox__label) {
    font-size: 14px;
    color: var(--text);
  }
}

.api-count {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border);

  &:last-of-type {
    border-bottom: none;
  }
}

.select-row {
  padding: 14px 0 0;
  margin-top: 4px;
  border-top: 1px solid var(--border);
}

.switch-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.switch-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-top: 4px;
}

.select-row .proxy-select {
  margin-top: 10px;
}

.mb {
  margin-bottom: 12px;
}

.proxy-select {
  width: 100%;
}

.proxy-input {
  width: 100%;
  margin-top: 10px;
}

.thanks {
  display: inline-block;
  margin-top: 12px;
  font-size: 12px;
  color: var(--primary);
}

.block-btn {
  width: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &.danger {
    color: var(--el-color-danger, #f56c6c);
  }
}

.ml {
  margin-left: 6px;
}
</style>
