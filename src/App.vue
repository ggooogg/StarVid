<!-- 应用根组件：AppLayout 布局 + router-view + 全局设置抽屉 -->
<script setup>
import AppLayout from './layouts/AppLayout.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
</script>

<template>
  <AppLayout>
    <router-view />
  </AppLayout>

  <SettingsDrawer />
</template>
