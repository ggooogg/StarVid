<!-- 文本输入框（带清空按钮），支持 v-model -->
<script setup>
import Icon from './Icon.vue'

defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="ui-input">
    <input
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <button
      v-if="modelValue"
      type="button"
      class="clear"
      aria-label="清空"
      @click="emit('update:modelValue', '')"
    >
      <Icon name="close" :size="12" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.ui-input {
  position: relative;
  width: 100%;

  input {
    width: 100%;
    height: 32px;
    padding: 0 28px 0 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s ease;

    &::placeholder {
      color: var(--text-secondary);
    }

    &:focus {
      border-color: var(--primary);
    }
  }
}

.clear {
  position: absolute;
  top: 50%;
  right: 8px;
  width: 16px;
  height: 16px;
  padding: 0;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 999px;
  background: var(--skeleton);
  color: var(--text-secondary);
  cursor: pointer;

  &:hover {
    color: var(--text);
  }
}
</style>
