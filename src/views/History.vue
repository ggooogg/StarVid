<!-- 观看历史页面 -->
<script setup>
import HistoryList from '../components/HistoryList.vue'
</script>

<template>
  <div class="fav-page">
    <HistoryList variant="grid" />
  </div>
</template>

<style scoped lang="scss">
.fav-page {
  max-width: 95%;
  margin: 16px auto 24px;
}
</style>
