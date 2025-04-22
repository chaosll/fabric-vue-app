<template>
  <div class="head">
    <div class="content">
      <!-- Tooltip 本身不再直接包裹触发元素 -->
      <ElTooltip
        :visible="visible"
        effect="dark"
        :content="`Value: ${inputValue}`"
        placement="top"
        :virtual-ref="tooltipTargetRef" <!-- 虚拟引用，指向动态计算的位置 -->
        virtual-triggering
        />

      <input
        ref="inputRef"
        type="range"
        min="0"
        max="1"
        step="0.1"
        v-model="inputValue"
        class="slider"
        id="myRange"
        />

      <!-- 其他内容容器 -->
      <div class="container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入 Element Plus Tooltip 组件和 Vue 的相关 API
import { ElTooltip } from 'element-plus'
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'

/**
 * 简单的防抖函数
 * @param func 需要执行的函数
 * @param wait 延迟时间（毫秒）
 * @returns 返回一个防抖后的函数
 */
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null; // 定时器 ID
  return function executedFunction(...args: Parameters<T>) {
    // 定义稍后执行的函数
    const later = () => {
      timeout = null; // 清除定时器 ID
      func(...args); // 执行原始函数
    };
    // 如果已有定时器，则清除
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    // 设置新的定时器
    timeout = setTimeout(later, wait);
  };
}

// --- 响应式变量定义 ---
const visible = ref<boolean>(false) // 控制 Tooltip 是否可见
const inputValue = ref<number>(0.7) // 滑块的当前值，默认 0.7
const timer = ref<any>(null) // 用于控制 Tooltip 自动隐藏的定时器
const inputRef = ref<HTMLInputElement | null>(null) // 滑块输入框的模板引用
const tooltipTargetRef = ref<any>(null) // Tooltip 虚拟引用的目标对象

/**
 * 更新 Tooltip 的虚拟目标位置
 * 这个函数计算滑块 thumb (可拖动圆点) 的中心位置，并将其设置为 Tooltip 的目标点
 */
const updateTooltipPosition = () => {
  // 确保 input 元素已挂载
  if (!inputRef.value) return

  const inputElement = inputRef.value // 获取滑块 DOM 元素
  const computedStyle = getComputedStyle(inputElement) // 获取计算后的样式
  const inputRect = inputElement.getBoundingClientRect() // 获取滑块元素的位置和尺寸信息
  const sliderWidth = inputElement.clientWidth // 获取滑块元素的内部宽度（不包括边框和滚动条）

  // 从 CSS 变量 `--slider-thumb-width` 读取滑块 thumb 的宽度
  // 默认为 16px
  const thumbWidthString = computedStyle.getPropertyValue('--slider-thumb-width').trim() || '16px'
  const thumbWidth = parseFloat(thumbWidthString) || 16

  // 估算滑块轨道的内边距（通常是 thumb 宽度的一半）
  // 这假设 thumb 在值为 0 和 1 时，其中心分别位于左右内边距的位置
  const trackPadding = thumbWidth / 2

  // 计算 thumb 中心可以实际移动的有效轨迹宽度
  // 总宽度减去两端的内边距
  const effectiveTrackWidth = sliderWidth - 2 * trackPadding // 或者近似为 sliderWidth - thumbWidth

  // 计算 thumb 中心点相对于有效轨迹起点的偏移量
  const thumbCenterOffset = inputValue.value * effectiveTrackWidth

  // 计算 Tooltip 目标的绝对水平 X 坐标
  // = 滑块左边界 + 左侧内边距 (到达轨迹起点) + thumb 中心的偏移量
  const targetX = inputRect.left + trackPadding + thumbCenterOffset

  // 计算 Tooltip 目标的绝对垂直 Y 坐标 (保持在滑块垂直中心)
  const targetY = inputRect.top + inputRect.height / 2

  // 更新 tooltipTargetRef，提供一个符合 virtual-ref 要求的对象
  // 这个对象必须有一个 getBoundingClientRect 方法，返回一个描述目标位置的矩形
  tooltipTargetRef.value = {
    getBoundingClientRect: () => ({
      width: 0, // 虚拟目标没有实际宽度
      height: 0, // 虚拟目标没有实际高度
      top: targetY,
      left: targetX,
      right: targetX,
      bottom: targetY,
    }),
  }
}

// 创建一个防抖版的 updateTooltipPosition 函数，用于窗口 resize 事件
const debouncedUpdatePosition = debounce(updateTooltipPosition, 100) // 100ms 防抖

// 监听 inputValue 的变化
watch(inputValue,async (newVal, oldVal) => {
  console.log(newVal, '<==', oldVal) // 打印新旧值，用于调试
  if (newVal !== oldVal) {
    // 使用 nextTick 确保 DOM 更新完成后再计算位置
   await nextTick()
    updateTooltipPosition() // 更新 Tooltip 位置
    visible.value = true // 显示 Tooltip

    // --- Tooltip 自动隐藏逻辑 ---
    if (timer.value) {
      clearTimeout(timer.value)
    }
    // 设置新的定时器，1秒后隐藏 Tooltip
    timer.value = setTimeout(() => {
      visible.value = false
    }, 1000)
  }
}, { immediate: false }) // 设置 immediate: false 避免初始挂载时立即触发

onMounted(async() => {
  // 使用 nextTick 确保初始样式已应用，再进行首次位置计算
  await nextTick()
  updateTooltipPosition()
  // 添加窗口大小变化监听器，窗口变化时（防抖后）更新 Tooltip 位置
  window.addEventListener('resize', debouncedUpdatePosition)
})

onBeforeUnmount(() => {
  if (timer.value) {
    clearTimeout(timer.value)
  }
  window.removeEventListener('resize', debouncedUpdatePosition)
})
</script>

<style scoped>
/* 内容区域样式 */
.content {
  padding: 50px; /* 添加内边距，避免 Tooltip 在边缘被截断 */
  position: relative; /* 设置相对定位，可能对复杂的 Tooltip 定位有帮助 */
}

/* 滑块样式 */
.slider {
  /* 定义滑块 thumb 宽度的 CSS 变量 */
  --slider-thumb-width: 16px; /* 默认宽度，适用于较大屏幕 */

  width: 300px; /* 设置滑块固定宽度 */
  display: block; /* 设置为块级元素，使其独占一行，便于布局 */
  margin-top: 20px; /* 在 Tooltip 和滑块之间添加一些垂直间距 */

  /* 媒体查询：针对不同屏幕尺寸调整 thumb 宽度 */
  @media (max-width: 768px) {
    --slider-thumb-width: 20px; /* 在中等屏幕上增大 thumb 宽度，方便触摸操作 */
    /* 如果你自定义了 thumb 的样式 (例如 ::-webkit-slider-thumb)， */
    /* 可能也需要在这里调整那些样式 */
  }
  @media (max-width: 480px) {
    --slider-thumb-width: 24px; /* 在小屏幕上进一步增大 thumb 宽度 */
  }
}
</style>
