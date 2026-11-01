<!-- 内置图标集：统一 24 栅格线性风格，替代外部图标库 -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
})

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.2 16.2 21 21"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  'arrow-left': '<path d="M15 5l-7 7 7 7"/>',
  'arrow-right': '<path d="M9 5l7 7-7 7"/>',
  'arrow-down': '<path d="M5 9l7 7 7-7"/>',
  'back-to-top': '<path d="M12 19V6M6 12l6-6 6 6"/>',
  sort: '<path d="M8 20V5M8 5 5 8.5M8 5l3 3.5M16 4v15M16 19l-3-3.5M16 19l3-3.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>',
  star: '<path d="M12 3.8 14.9 9.6 21 10.5 16.5 14.9 17.6 21 12 18.1 6.4 21 7.5 14.9 3 10.5 9.1 9.6z"/>',
  'star-filled':
    '<path d="M12 3.8 14.9 9.6 21 10.5 16.5 14.9 17.6 21 12 18.1 6.4 21 7.5 14.9 3 10.5 9.1 9.6z" fill="currentColor" stroke="none" transform="translate(12 12) scale(1.08) translate(-12 -12)"/>',
  film: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M8 4.5v15M16 4.5v15"/>',
  monitor: '<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  coffee:
    '<path d="M4 7h12v5.5A5.5 5.5 0 0 1 10.5 18h-1A5.5 5.5 0 0 1 4 12.5z"/><path d="M16 8.5h1.6a2.6 2.6 0 0 1 0 5.2H16"/><path d="M3 21h14"/>',
  microphone:
    '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.6 8.4l-2.2 5-5 2.2 2.2-5z"/>',
  sunny:
    '<circle cx="12" cy="12" r="4.3"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>',
  moon: '<path d="M20.3 14.6A8.5 8.5 0 0 1 9.4 3.7 8.5 8.5 0 1 0 20.3 14.6z"/>',
  'video-play':
    '<rect x="3" y="4.5" width="18" height="15" rx="3"/><path d="M10.2 9.2l5.4 2.8-5.4 2.8z" fill="currentColor" stroke="none"/>',
  link: '<path d="M10.2 13.8l3.6-3.6"/><path d="M11 6.9l1.6-1.6a4.3 4.3 0 0 1 6.1 6.1L17 13"/><path d="M13 17.1l-1.6 1.6a4.3 4.3 0 0 1-6.1-6.1L7 11"/>',
  delete:
    '<path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14M10 10.5v6M14 10.5v6"/>',
  lightning: '<path d="M13 2.5 4.5 14H10l-1 7.5L18.5 10H13z" fill="currentColor" stroke="none"/>',
  house: '<path d="M3 11l9-7.5 9 7.5"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/>',
  setting:
    '<path d="M3 6h9M17 6h4M3 12h5M13 12h8M3 18h10M17 18h4"/><circle cx="14" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="15" cy="18" r="2"/>',
  alert:
    '<path d="M12 4.2 2.9 20h18.2z"/><path d="M12 9.8v4.6"/><circle cx="12" cy="17.2" r=".95" fill="currentColor" stroke="none"/>',
  mail: '<rect x="3" y="5.2" width="18" height="13.6" rx="2.5"/><path d="M3.8 6.8 12 13l8.2-6.2"/>',
}

const body = computed(() => ICONS[props.name] || '')
</script>

<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="body"
  />
</template>

<style scoped>
.icon {
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
}
</style>
