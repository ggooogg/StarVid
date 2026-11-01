<!-- 首次访问提示：聚合来源声明，关闭后在本地记住 -->
<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './ui/Icon.vue'

const KEY = 'starvid:notice-dismissed'

const route = useRoute()
const dismissed = ref(localStorage.getItem(KEY) === '1')
const visible = computed(() => !dismissed.value && route.path !== '/disclaimer')

function dismiss() {
  dismissed.value = true
  localStorage.setItem(KEY, '1')
}
</script>

<template>
  <div v-if="visible" class="notice-bar">
    <Icon name="alert" :size="15" class="notice-icon" />
    <p class="notice-text">
      本站仅聚合第三方公开接口，不存储任何视频内容，仅供学习交流。
      <router-link to="/disclaimer" class="notice-link">免责声明</router-link>
    </p>
    <button class="ui-btn icon notice-close" aria-label="关闭提示" @click="dismiss">
      <Icon name="close" :size="15" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.notice-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.1);
  font-size: 12.5px;
  line-height: 1.6;
}

.notice-icon {
  color: #f59e0b;
}

.notice-text {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--text-secondary);
}

.notice-link {
  color: var(--primary);
  font-weight: 600;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
}

.notice-close {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}
</style>
