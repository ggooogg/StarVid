// 极简全局提示队列，供 ToastHost 渲染
import { ref } from 'vue'

export const toasts = ref([])

let seed = 0

function push(message, type, duration) {
  const id = ++seed
  toasts.value = [...toasts.value, { id, message, type }]
  setTimeout(() => {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }, duration)
}

export const toast = {
  success: (message, duration = 2200) => push(message, 'success', duration),
  warning: (message, duration = 2600) => push(message, 'warning', duration),
  error: (message, duration = 2600) => push(message, 'error', duration),
}
