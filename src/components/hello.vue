<template>
  <div class="head">
    <div class="content">
      <ElTooltip
        :visible="visible"
        class="box-item"
        effect="dark"
        :content="`Value: ${inputValue}`"
        placement="top"
        :virtual-ref="tooltipTargetRef"
        virtual-triggering>
      </ElTooltip>
      <input
        ref="inputRef"
        type="range"
        min="0"
        max="1"
        step="0.1"
        v-model="inputValue"
        class="slider"
        id="myRange" />
      <div class="container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElTooltip } from 'element-plus'
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'

const visible = ref<boolean>(false)
const inputValue = ref<number>(0.7)
const timer = ref<any>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const tooltipTargetRef = ref<any>(null)

const updateTooltipPosition = () => {
  if (!inputRef.value) return

  const inputRect = inputRef.value.getBoundingClientRect()
  const sliderWidth = inputRef.value.clientWidth
  const thumbOffset = inputValue.value * sliderWidth
  const trackOffsetX = 0

  const targetX = inputRect.left + trackOffsetX + thumbOffset
  const targetY = inputRect.top + inputRect.height / 2

  tooltipTargetRef.value = {
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      top: targetY,
      left: targetX,
      right: targetX,
      bottom: targetY,
    }),
  }
}

watch(inputValue, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    nextTick(() => {
      updateTooltipPosition()
      visible.value = true
    })

    if (timer.value) {
      clearTimeout(timer.value)
    }
    timer.value = setTimeout(() => {
      visible.value = false
    }, 1000)
  }
}, { immediate: false })

onMounted(() => {
  nextTick(() => {
    updateTooltipPosition()
  })
})

onBeforeUnmount(() => {
  if (timer.value) {
    clearTimeout(timer.value)
  }
})
</script>

<style scoped>
.content {
  padding: 50px;
  position: relative;
}
.slider {
  width: 300px;
  display: block;
  margin-top: 20px;
}
</style>

<!-- <style scoped lang="scss">
.head {
  width: 100%;
  height: 100%;
  background-color: #fff;
  div {
    padding: 20px;
  }
  .content {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    color: aqua;
    background-color: rgba($color: #000000, $alpha: 0.1);
  }
}
.el-popper.is-dark {
  color: #7fae1b !important;
}
</style> -->
