<!-- 设置抽屉：数据源多选、功能开关、豆瓣数据/图片代理、清除缓存 -->
<script setup>
import { ref, computed } from 'vue'
import AppDrawer from './ui/AppDrawer.vue'
import AppSelect from './ui/AppSelect.vue'
import AppInput from './ui/AppInput.vue'
import AppSwitch from './ui/AppSwitch.vue'
import Icon from './ui/Icon.vue'
import { useUiStore } from '../stores/ui'
import { useSettingsStore } from '../stores/settings'
import { DOUBAN_DATA_PROXIES, DOUBAN_IMAGE_PROXIES } from '../lib/doubanProxies'
import { API_SITE_OPTIONS, ALL_SOURCE_KEYS, getSelectedSources, setSelectedSources } from '../data/apiSites'
import { toast } from '../lib/toast'

const ui = useUiStore()
const settings = useSettingsStore()

const EMAIL = 'wanwanhuigui@gmail.com'
const apiSources = API_SITE_OPTIONS
const selectedApis = ref(getSelectedSources())

function persistApis() {
  setSelectedSources(selectedApis.value)
}

function selectAll(on) {
  selectedApis.value = on ? [...ALL_SOURCE_KEYS] : []
  persistApis()
}

function clearCache() {
  localStorage.clear()
  toast.success('已清除本地缓存，即将刷新')
  setTimeout(() => location.reload(), 1200)
}

// 当前选中的代理项（用于展示说明与致谢）
const currentDataProxy = computed(
  () => DOUBAN_DATA_PROXIES.find((p) => p.value === settings.doubanProxyType) || {}
)
const currentImageProxy = computed(
  () => DOUBAN_IMAGE_PROXIES.find((p) => p.value === settings.doubanImageProxyType) || {}
)
</script>

<template>
  <AppDrawer
    :open="ui.settingsOpen"
    width="440px"
    aria-label="设置"
    @close="ui.closeSettings()"
  >
    <div class="settings">
      <div class="set-head">
        <h3 class="gradient-text">设置</h3>
        <button class="ui-btn icon" aria-label="关闭" @click="ui.closeSettings()">
          <Icon name="close" :size="20" />
        </button>
      </div>

      <div class="set-body">
        <div class="set-card">
          <div class="card-head">
            <div class="card-title">数据源设置</div>
            <div class="batch-btns">
              <button class="ui-btn sm" @click="selectAll(true)">全选</button>
              <button class="ui-btn sm" @click="selectAll(false)">全不选</button>
            </div>
          </div>
          <div class="api-list">
            <div class="api-group">
              <label v-for="src in apiSources" :key="src.key" class="api-item">
                <input
                  v-model="selectedApis"
                  type="checkbox"
                  :value="src.key"
                  @change="persistApis"
                />
                <span class="box"><Icon v-if="selectedApis.includes(src.key)" name="check" :size="11" /></span>
                <span class="label">{{ src.name }}</span>
              </label>
            </div>
          </div>
          <div class="api-count">已选数量：{{ selectedApis.length }} / {{ apiSources.length }}</div>
        </div>

        <div class="set-card">
          <div class="card-title">功能开关</div>

          <div class="switch-row">
            <div>
              <div class="switch-label">启用优选和测速</div>
              <div class="switch-desc">自动优选最快数据源并测量镜像延迟</div>
            </div>
            <AppSwitch v-model="settings.optimization" />
          </div>

          <div class="switch-row">
            <div>
              <div class="switch-label">分片广告过滤</div>
              <div class="switch-desc">关闭可减少旧版浏览器卡顿</div>
            </div>
            <AppSwitch v-model="settings.adFilter" />
          </div>

          <div class="switch-row">
            <div>
              <div class="switch-label">豆瓣热门推荐</div>
              <div class="switch-desc">首页显示豆瓣热门影视内容</div>
            </div>
            <AppSwitch v-model="settings.doubanHot" />
          </div>
        </div>

        <div class="set-card">
          <div class="card-title">豆瓣数据代理</div>
          <div class="switch-desc mb">选择豆瓣接口数据的转发方式</div>
          <AppSelect v-model="settings.doubanProxyType" :options="DOUBAN_DATA_PROXIES" />
          <AppInput
            v-if="settings.doubanProxyType === 'custom'"
            v-model="settings.doubanProxyUrl"
            class="proxy-input"
            placeholder="自定义代理前缀，如 https://example.com/"
          />
          <div v-if="currentDataProxy.desc" class="switch-desc mt">{{ currentDataProxy.desc }}</div>
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
          <AppSelect v-model="settings.doubanImageProxyType" :options="DOUBAN_IMAGE_PROXIES" />
          <AppInput
            v-if="settings.doubanImageProxyType === 'custom'"
            v-model="settings.doubanImageProxyUrl"
            class="proxy-input"
            placeholder="自定义代理前缀，如 https://example.com/"
          />
          <div v-if="currentImageProxy.desc" class="switch-desc mt">{{ currentImageProxy.desc }}</div>
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
          <button class="ui-btn block danger" @click="clearCache">
            <Icon name="delete" :size="15" /><span>清除 Cookie</span>
          </button>
        </div>

        <div class="set-card">
          <div class="card-title">关于</div>
          <div class="about-name">StarVid <span class="about-ver">v0.0.0</span></div>
          <p class="switch-desc about-desc">
            基于 Vue 3 编写的个人学习项目，仅做公开接口聚合，不存储任何视频内容。
          </p>
          <router-link to="/disclaimer" class="about-link" @click="ui.closeSettings()">
            <Icon name="alert" :size="15" />
            <span>免责声明与使用条款</span>
            <Icon name="arrow-right" :size="13" class="arrow" />
          </router-link>
          <a class="about-link" :href="`mailto:${EMAIL}`">
            <Icon name="mail" :size="15" />
            <span class="mail-text">{{ EMAIL }}</span>
          </a>
        </div>
      </div>
    </div>
  </AppDrawer>
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
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text);
  cursor: pointer;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .box {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: #fff;
    transition: all 0.15s ease;
  }

  input:checked + .box {
    background: var(--primary);
    border-color: var(--primary);
  }

  input:focus-visible + .box {
    box-shadow: 0 0 0 2px var(--primary-soft);
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

.mb {
  margin-bottom: 12px;
}

.mt {
  margin-top: 10px;
}

.proxy-input {
  margin-top: 10px;
}

.thanks {
  display: inline-block;
  margin-top: 12px;
  font-size: 12px;
  color: var(--primary);
}

.about-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.about-ver {
  margin-left: 6px;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}

.about-desc {
  margin-top: 8px;
}

.about-link {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  transition: color 0.2s ease, border-color 0.2s ease;

  &:hover {
    color: var(--primary);
    border-color: var(--primary);
  }

  .arrow {
    margin-left: auto;
  }

  .mail-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
