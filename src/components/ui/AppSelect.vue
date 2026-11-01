<!-- 下拉选择，基于原生 select 以保留移动端体验 -->
<script setup>
import Icon from './Icon.vue'

defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] }, // [{ label, value }]
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="ui-select">
    <select :value="modelValue" @change="emit('update:modelValue', $event.target.value)">
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <Icon name="arrow-down" :size="14" class="arrow" />
  </div>
</template>

<style scoped lang="scss">
.ui-select {
  position: relative;
  width: 100%;

  select {
    width: 100%;
    height: 32px;
    padding: 0 30px 0 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    cursor: pointer;
    outline: none;
    appearance: none;
    transition: border-color 0.2s ease;

    &:focus {
      border-color: var(--primary);
    }
  }
}

.arrow {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}
</style>
