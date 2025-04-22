<template>
  <div ref="containerRef" class="image-list-container">
    <div
      v-for="(image, index) in images"
      :key="image.material_id"
      class="image-item"
      :class="{ selected: selectedIndex === index }"
      @click="handleImageClick(index)"
    >
      <img :src="image.thumb_url" :alt="`Image ${index + 1}`" class="image-display" />
      <div v-if="selectedIndex === index" class="overlay">
        <md-tooltip
          :visible="tooltipVisible"
          effect="dark"
          :content="content"
          placement="top"
          ref="tooltipRef"
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          v-model.number="sliderValue"
          class="slider"
          @input="handleSliderInput"
          aria-label="Image Value Slider"
          :style="{ '--value-percent': sliderValue * 100 + '%' }"
        />
      </md-tooltip>
        <input
          min="0"
          max="1"
          step="0.1"
          v-model.number="sliderValue"
          class="input-value"
          @input="handleInputChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 导入 Vue 相关 API
import { ref, watch, computed, onMounted, onBeforeUnmount, onActivated } from 'vue'

// --- Props 定义 ---
// 定义图片对象的接口
interface ImageObject {
  thumb_url: string // 缩略图 URL
  material_id?: string | number // 素材 ID (可选)
  id?: string | number // ID (可选)
  // 可以添加其他需要的属性
  [key: string]: any // 允许其他任意属性
}
// 定义组件 Props 接口
interface Props {
  images: ImageObject[] // 图片数组，使用上面定义的接口
}
// 使用 defineProps 接收父组件传递的 images 属性
const props = defineProps<Props>()

// --- Emits 定义 ---
// 定义组件触发的事件接口
interface Emits {
  // 'select' 事件：当图片被选中或滑块值改变时触发
  (e: 'select', payload: { item: ImageObject; value: number; isSizeChange?: boolean; isSliderChange?: boolean }): void
  // 'deselect' 事件：当取消选择时触发 (当前未明确使用，但已定义)
  (e: 'deselect'): void
}
// 使用 defineEmits 定义组件可以触发的事件
const emit = defineEmits<Emits>()

// --- 响应式状态变量 ---
const selectedIndex = ref<number | null>(null) // 当前选中图片的索引，null 表示没有选中
const sliderValue = ref<number>(0.7) // 滑块的值，范围 0-1，默认 0.7
const containerRef = ref<HTMLElement | null>(null) // 图片列表容器的模板引用

// --- 方法定义 ---
/**
 * 处理图片点击事件
 * @param index 被点击图片的索引
 */
const handleImageClick = (index: number) => {
  // 如果点击的是已选中的图片，则不做任何事
  if (selectedIndex.value === index) {
    return
  }
  // 更新选中索引
  selectedIndex.value = index
  // 重置滑块值为默认值 (0.4)
  sliderValue.value = 0.4
  // 触发 'select' 事件，传递选中图片信息和当前滑块值
  emit('select', {
    item: props.images[index],
    value: sliderValue.value,
  })
}

/**
 * 处理滑块 input 事件
 * @param event Input 事件对象
 */
const handleSliderInput = (event: Event) => {
  // 尝试修改 tooltip 样式 (可能需要调整，根据 tooltip 组件实现)
  changeTooltipStyle()
  // v-model 已经处理了 sliderValue 的更新
  const target = event.target as HTMLInputElement // 获取事件目标元素
  // 如果有图片被选中
  if (selectedIndex.value !== null) {
    // 触发 'select' 事件，传递选中图片信息、新的滑块值，并标记为尺寸变化
    emit('select', {
      item: props.images[selectedIndex.value],
      value: parseFloat(target.value), // 将滑块值转为数字
      isSizeChange: true, // 标记为尺寸变化
    })
  }
}

// --- Tooltip 相关状态和逻辑 ---
const tooltipVisible = ref(false) // 控制 tooltip 的可见性
const timer = ref<any>(null) // tooltip 自动隐藏的定时器 ID

// 监听 sliderValue 的变化，用于控制 tooltip 的显示和自动隐藏
watch(sliderValue, (newValue, oldValue) => {
  console.log('watch-----------------------------', newValue, oldValue)
  // 仅当值实际变化时触发
  if (newValue !== oldValue) {
    tooltipVisible.value = true // 显示 tooltip
    // 如果已有定时器，清除它
    if (timer.value) {
      clearTimeout(timer.value)
    }
    // 设置新的定时器，1.5秒后隐藏 tooltip
    timer.value = setTimeout(() => {
      tooltipVisible.value = false
    }, 1500)
  }
})

/**
 * 根据滑块值生成 tooltip 的内容文本
 * @param value 当前滑块值
 * @returns 返回描述差异化强度的字符串
 */
function contenthandle(value: number): string {
  if (value >= 0.7) {
    return `${value}（差异化强）`
  }
  if (value >= 0.4) {
    return `${value}（差异化适中）`
  }
  if (value > 0) {
    return `${value}（差异化弱）`
  }
  return `${value}（无差异化）`
}
// 计算属性，用于动态生成 tooltip 内容
const content = computed(() => contenthandle(sliderValue.value))

/**
 * 处理文本输入框的 input 事件 (与滑块关联)
 * @param event Input 事件对象
 */
const handleInputChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  let numValue = parseFloat(target.value) // 解析输入值为数字

  // 对输入值进行校验和边界处理
  if (isNaN(numValue)) numValue = 0
  else if (numValue < 0) numValue = 0
  else if (numValue > 1) numValue = 1

  // 只有当解析后的数字与当前 sliderValue 不同时才更新
  // 防止输入非数字字符或超出范围的值导致不必要的更新或循环
  if (sliderValue.value !== numValue) {
    sliderValue.value = numValue // 更新滑块值
  }

  // 如果有图片被选中
  if (selectedIndex.value !== null) {
    // 触发 'select' 事件，传递验证/解析后的值
    emit('select', {
      item: props.images[selectedIndex.
        
      ],
      value: numValue,
    })
  }
}

// --- 监听器 ---
// 监听 props.images 的变化
watch(
  () => props.images,
  () => {
    // 当图片列表数据变化时，重置选中状态和滑块值
    selectedIndex.value = null
    sliderValue.value = 0.7
  },
  { deep: true }, // 深度监听，因为 images 是数组
)

// --- 暴露给父组件的方法 ---
// 使用 defineExpose 将方法和属性暴露给父组件
defineExpose({
  /**
   * 通过索引设置选中项
   * @param index 要选中的图片索引
   */
  setSelected(index: number) {
    if (index >= -1 && index < props.images.length) {
      selectedIndex.value = index
    }
  },
  /**
   * 获取当前选中的图片信息和索引
   * @returns 返回包含 item 和 index 的对象，如果未选中则返回 null
   */
  getSelected() {
    return selectedIndex.value !== null && selectedIndex.value >= 0
      ? {
          item: props.images[selectedIndex.value],
          index: selectedIndex.value,
        }
      : null
  },

  /**
   * 将图片列表容器滚动到顶部
   */
  scrollToTop() {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0
    }
  },

  /**
   * 通过索引选中图片 (会触发点击逻辑和事件)
   * @param index 要选中的图片索引
   */
  selectByIndex(index: number) {
    if (index >= 0 && index < props.images.length) {
      handleImageClick(index) // 调用内部的点击处理函数
    }
  },

  /**
   * 通过素材 ID 或 ID 选中图片 (会触发点击逻辑和事件)
   * @param id 要选中的图片的 material_id 或 id
   */
  selectById(id: string | number) {
    // 查找对应 ID 的图片索引
    const index = props.images.findIndex((item) => item.material_id === id || item.id === id)
    // 如果找到，则调用内部的点击处理函数
    if (index !== -1) {
      handleImageClick(index)
    }
  },

  /**
   * 获取当前选中的素材信息 (与 getSelected 类似)
   * @returns 返回包含 item 和 index 的对象，如果未选中则返回 null
   */
  getCurrentSelected() {
    return selectedIndex.value !== null && selectedIndex.value >= 0
      ? {
          item: props.images[selectedIndex.value],
          index: selectedIndex.value,
        }
      : null
  },

  /**
   * 清除当前选中状态
   */
  clearSelection() {
    selectedIndex.value = -1 // 将索引设为 -1 表示未选中
    // 注意：这里没有触发 deselect 事件，根据需要可以添加
    // emit('deselect')
  },
})

// --- Tooltip 样式修改相关 (可能需要根据实际 Tooltip 组件调整) ---
const tooltipRef = ref(null) // Tooltip 组件的模板引用

/**
 * 尝试通过 JavaScript 修改 Tooltip 弹出内容的样式
 * 注意：这种方式可能不稳定，依赖于 Tooltip 组件的内部结构，
 * 优先考虑使用 CSS 或组件提供的 Props/Slots 进行样式定制。
 */
function changeTooltipStyle() {
  console.log('changeTooltipStyle', tooltipRef.value)
  // 尝试访问 Tooltip 内部的弹出层 DOM 元素 (这部分依赖具体组件实现，可能不通用)
  const tooltipEl = tooltipRef.value?.popperRef?.contentRef
  console.log('tooltipEl', tooltipEl)

  if (tooltipEl) {
    // 直接修改 DOM 元素的 style 属性
    Object.assign(tooltipEl.style, {
      width: '118px',
      height: '32px',
      fontSize: '12px',
      borderRadius: '8px',
      backgroundColor: '#1D2129',
      border: '8px solid #1D2129',
      padding: '6px 8px',
      alignSelf: 'stretch',
      zIndex: '99999', // 尝试提高层级
    })

    // 尝试修改内部 span 的样式 (同样依赖内部结构)
    const spans = tooltipEl.querySelectorAll('span')
    spans.forEach((span) => {
      Object.assign(span.style, {
        letterSpacing: 'normal',
        lineHeight: '20px',
        textAlign: 'center',
      })
    })
  }
}

onMounted(() => {
  // 组件挂载后可以执行一些初始化操作，例如首次样式调整
  // changeTooltipStyle() // 如果需要在挂载后立即调整样式，可以在这里调用
})

// onBeforeUnmount(() => {
//   // 清理定时器等副作用
//   if (timer.value) {
//     clearTimeout(timer.value)
//   }
// })
</script>

<style scoped>
.image-list-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.image-item {
  position: relative;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 9px; /* 7px image + 2px border */
  overflow: hidden;
  transition: border-color 0.3s ease;
}

.image-display {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 7px;
  transition: opacity 0.3s ease;
}

.image-item.selected {
  border-color: #fa2c19;
}

.image-item.selected .image-display {
  opacity: 0.4;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  box-sizing: border-box;
  pointer-events: all;
  z-index: 1;
  background: rgba(0, 0, 0, 40%);
}

.slider {
  --thumb-width: 18px;

  width: 80%;
  margin-bottom: 10px;
  cursor: grab;
  appearance: none;
  height: 8px;
  border-radius: 5px;
  outline: none;
  background: linear-gradient(
    to right,
    #fa2c19 0%,
    #fa2c19 var(--value-percent, 70%),
    /* Filled color up to percentage */ #dddddd var(--value-percent, 70%),
    /* Default color after percentage */ #dddddd 100%
  );
}

.slider:active {
  cursor: grabbing;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: var(--thumb-width);
  height: var(--thumb-width);
  border: 2px solid #fa2c19;
  background: #ffffff; /* Thumb color */
  border-radius: 50%;
  cursor: grab;
}

.slider::-moz-range-thumb {
  width: var(--thumb-width);
  height: var(--thumb-width);
  background: #fa2c19; /* Thumb color */
  border-radius: 50%;
  cursor: grab;
  border: none;
}

.slider::-moz-range-track {
  width: 100%;
  height: 8px;
  cursor: pointer;
  background: #dddddd; /* Default track color */
  border-radius: 5px;
}

.slider::-moz-range-progress {
  background-color: #fa2c19; /* Filled color */
  height: 8px; /* Match track height */
  border-radius: 5px; /* Match track radius */
}

.input-value {
  width: 60px;
  text-align: center;
  border: 1px solid #cccccc;
  border-radius: 4px;
  padding: 4px 6px;
}
.input-value:focus {
  border: 1px solid #fa2c19;
}
.input-value::-webkit-outer-spin-button,
.input-value::-webkit-inner-spin-button {
  margin: 0;
}
</style>
