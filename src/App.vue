<!-- 根组件：布局 + 路由视图 + 全局设置抽屉与提示 -->
<script setup>
import AppLayout from './layouts/AppLayout.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
import ToastHost from './components/ui/ToastHost.vue'
</script>

<template>
  <AppLayout>
    <router-view />
  </AppLayout>

  <SettingsDrawer />
  <ToastHost />
</template>
