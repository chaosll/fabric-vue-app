<template>
  <div class="flex h-full flex-1 items-center justify-center overflow-hidden">
    <div class="flex h-full w-full">
      <!-- 生成状态：当AI正在生成场景图时显示加载状态 -->
      <div
        v-if="aiDrawingStore.sceneState === GENERATE_STATUS.Generating"
        class="flex h-full w-full flex-col items-center justify-center"
      >
        <md-image :src="GENERATING_LOADING" class="generating-loading rounded-full" />
        {{ loadingText || '自然效果生成中' }}
        <ex-button class="mt-6 text-sm" @click="aiDrawingStore.cancelRequest()">取消</ex-button>
      </div>
      <!-- 生成状态：当AI生成完成后显示预览和编辑区域 -->
      <div
        class="relative h-full w-full"
        v-else-if="aiDrawingStore.sceneState === GENERATE_STATUS.Completed"
      >
        <!-- 预览编辑组件：用于调整产品图在背景图中的位置和大小 -->
        <PreviewGrabbing
          ref="refPreviewGrabbing"
          v-if="previewImage"
          v-model="aiDrawingStore.sceneGrabbingScale"
          :initScale="aiDrawingStore.sceneGrabbingScale"
          :bgImageUrl="previewImage?.url"
          :productImageUrl="aiDrawingStore.product?.file_url"
          :characterImageUrl="aiDrawingStore.character?.file_url"
          :imagePosition="aiDrawingStore.imagePosition"
          @delete="handleRemove"
          @changePosition="handleChangePosition"
        ></PreviewGrabbing>

        <!-- 底部工具栏：根据不同生成模式显示不同的提示和工具 -->
        <div
          class="absolute right-0 flex w-full items-center px-6"
          :class="[
            pageStore.activeTab === ACTIVE_TAB_NAME.CreativeBuild ? 'bottom-[4.5rem]' : 'bottom-0',
          ]"
        >
          <div class="mx-auto mb-6">
            <!-- 固定场景模式下的操作提示 -->
            <ai-draw-tooltip
              v-if="pageStore.activeTab === ACTIVE_TAB_NAME.FixedSceneBuild"
              text="已为你匹配产品图最佳位置，你可以自行调整产品大小和位置。 "
              :show-close="true"
            />
            <!-- 创意生图模式下的操作提示 -->
            <ai-draw-tooltip
              v-if="pageStore.activeTab === ACTIVE_TAB_NAME.CreativeBuild"
              text="为了更好的效果，你可以自行调整产品大小和位置。 "
              :show-close="true"
            />
          </div>
          <!-- 缩放控制器：用于调整预览图的缩放比例 -->
          <div class="absolute right-6 bottom-6">
            <Zoom
              v-if="refPreviewGrabbing"
              v-model="aiDrawingStore.sceneGrabbingScale"
              @zoom-in="refPreviewGrabbing.zoomIn"
              @zoom-out="refPreviewGrabbing.zoomOut"
            >
              <md-dropdown popper-class="customize-dropdown my-2">
                <div
                  class="h-8 w-12 cursor-pointer rounded-lg text-center leading-8 text-[#1D2129] hover:bg-[#F2F3F5]"
                >
                  {{ aiDrawingStore.sceneGrabbingScale }}%
                </div>
                <template #dropdown>
                  <md-dropdown-menu>
                    <md-dropdown-item
                      v-for="item in moreScale"
                      :key="item.name"
                      @click="item.click"
                    >
                      <div class="flex w-full items-center justify-center">
                        {{ item.name }}
                      </div>
                    </md-dropdown-item>
                  </md-dropdown-menu>
                </template>
              </md-dropdown>
            </Zoom>
          </div>
        </div>
        <!-- 创意生图模式下的底部图片选择区域：显示生成的多张背景图供选择 -->
        <div
          v-if="pageStore.activeTab === ACTIVE_TAB_NAME.CreativeBuild"
          class="absolute bottom-0 right-0 flex h-[4.5rem] w-full items-center justify-between bg-white px-6"
        >
          <div>
            <div v-if="aiDrawingStore.sceneImageData.length > 0" class="flex gap-2">
              <SelectableImageGallery
                :items="aiDrawingStore.sceneImageData"
                :default-selected="0"
                @select="handleImageSelect"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- 未开始生成状态：提示用户先在左侧完成设置 -->
      <div v-else class="flex w-full items-center justify-center">
        <ex-empty class="w-full" layout="ContentEmpty" description="请先在左侧区域完成生图操作" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { IAiDrawingStore, useGenerateStore } from '~/store/aiDrawingStore'
import { GenImageData } from '@/types/service/api/backend/AiDrawServiceTypes'
import Zoom from '~/components/Zoom.vue'
import ExEmpty from '~/components/basic/ExEmpty.vue'
import PreviewGrabbing from './PreviewGrabbing.vue'
import CombinePreview from './CombinePreview.vue'
import GENERATING_LOADING from '~/assets/images/generating-loading.gif'

import { ACTIVE_TAB_NAME, GENERATE_STATUS } from '~/store/materialEditorStore'
import ExButton from '~/components/basic/ExButton.vue'
import { v4 as uuidv4 } from 'uuid'
import AiDrawTooltip from '~/components/AiDrawTooltip.vue'
import SelectableImageGallery from './SelectableImageGallery.vue'

/**
 * 缩放预设选项类型定义
 * @typedef {Object} MoreScale
 * @property {number|string} name - 显示的名称
 * @property {Function} click - 点击执行的函数
 */
type MoreScale = {
  name: number | string
  click: () => void
}

/**
 * 缩放预设选项列表
 * 包含50%、100%、200%、400%和自适应选项
 */
const moreScale = ref<MoreScale[]>([
  {
    click: () => refPreviewGrabbing.value?.setScale(50),
    name: '50%',
  },
  {
    click: () => refPreviewGrabbing.value?.setScale(100),
    name: '100%',
  },
  {
    click: () => refPreviewGrabbing.value?.setScale(200),
    name: '200%',
  },
  {
    click: () => refPreviewGrabbing.value?.setScale(400),
    name: '400%',
  },
  {
    click: () => refPreviewGrabbing.value?.setScale(0),
    name: '自适应',
  },
])

/**
 * 组件属性定义
 * @typedef {Object} Props
 * @property {string} loadingText - 加载时显示的文本
 * @property {IAiDrawingStore} aiDrawingStore - AI绘图状态存储
 * @property {boolean} useRevoke - 是否使用撤销功能
 */
const props = defineProps<{
  loadingText: string
  aiDrawingStore: Reactive<IAiDrawingStore>
  useRevoke?: boolean
}>()

// 从props中解构出aiDrawingStore
const { aiDrawingStore } = props
// 获取页面状态
const { pageStore } = useGenerateStore()

// 预览编辑组件引用
const refPreviewGrabbing = ref<InstanceType<typeof PreviewGrabbing>>()
// 当前预览图信息
const previewImage = ref<GenImageData>()
// 当前选中的图片索引
const currentSelectIndex = ref<number>(0)

/**
 * 场景保存配置
 * 用于批量操作多张图片
 */
const saveSceneConfig = reactive({
  isMultiple: false, // 是否批量模式
  text: '批量操作',   // 按钮文本
})

// 批量选中的图片数组
const multipleArray = ref([])

/**
 * 切换批量操作模式
 * 在单选和多选模式之间切换
 */
const batchSave = () => {
  saveSceneConfig.isMultiple = !saveSceneConfig.isMultiple
  if (saveSceneConfig.isMultiple) {
    saveSceneConfig.text = '取消'
  } else {
    saveSceneConfig.text = '批量操作'
  }
}

/**
 * 保存场景到父窗口
 * 通过postMessage发送数据到父窗口
 */
const saveScene = async () => {
  // @TODO: 发送
  window.parent.postMessage(
    {
      type: 'AI_DRAW_RESULT',
      fromPageId: pageId.value,
      toPageId: parentId.value,
      data: multipleArray.value,
    },
    '*',
  ) // @TODO: 确定发送域
}

/**
 * 处理图片选择事件
 * @param {Object} items - 选中的图片信息
 */
const handleImageSelect = async (items: any) => {
  // 处理选中的商品信息
  console.log('选中的商品信息：', items)
  if (saveSceneConfig.isMultiple) {
    multipleArray.value = items
  } else {
    multipleArray.value = [items.image]
    switchImage(items.image, items.index)
  }
}

// 页面唯一标识
const pageId = ref(uuidv4())
// 父页面ID
const parentId = ref('')

/**
 * 组件挂载时的初始化
 * 获取URL参数并添加消息监听
 */
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)

  parentId.value = urlParams.get('parent-id') || ''

  // 添加消息监听
  window.addEventListener('message', handleMessage)
})

/**
 * 处理来自父窗口的消息
 * @param {MessageEvent} event - 消息事件对象
 */
const handleMessage = (event: MessageEvent) => {
  const { type, data, fromPageId, toPageId } = event.data

  // 如果消息不是发给当前页面的，则忽略
  if (toPageId !== pageId.value) return

  switch (type) {
    case 'CONFIRM_RECEIVED':
      // 确认父页面已收到场景结果
      handleConfirmReceived()
      break
  }
}

/**
 * 处理确认接收消息
 * 父页面确认接收到生成结果后的处理
 */
const handleConfirmReceived = () => {
  // TODO: 跳转成功页
  console.log('Parent page confirmed receiving the result')
}

/**
 * 切换预览图
 * @param {GenImageData} raw - 图片数据
 * @param {number} index - 图片索引
 */
const switchImage = (raw: GenImageData, index?: number) => {
  previewImage.value = raw.url
  console.log(raw)
  aiDrawingStore.useSceneImage = raw.url
  currentSelectIndex.value = index || 0
}

/**
 * 监听useSceneImage变化
 * 当场景图变更时更新预览
 */
watchImmediate(
  () => aiDrawingStore.useSceneImage,
  (val) => {
    console.log('useSceneImage', val)
    if (!val) {
      aiDrawingStore.sceneState = GENERATE_STATUS.Incomplete
    }
    previewImage.value = { url: val }
  },
)

/**
 * 监听产品图变化
 * 当产品图变更时记录日志
 */
watchImmediate(
  () => aiDrawingStore.product,
  (val) => {
    console.log('product file_url', val)
  },
  {
    deep: true,
  },
)

watchImmediate(
  () => aiDrawingStore.sceneImageData,
  (val) => {
    console.log('sceneImageData', val.value)
    if (!aiDrawingStore.sceneImageData.length) {
      return
    }
    if (currentSelectIndex.value === 0) {
      switchImage(aiDrawingStore.sceneImageData[0], 0)
    } else if (currentSelectIndex.value >= aiDrawingStore.sceneImageData.length) {
      currentSelectIndex.value = aiDrawingStore.sceneImageData.length - 1
      switchImage(aiDrawingStore.sceneImageData[currentSelectIndex.value], currentSelectIndex.value)
    } else {
      switchImage(aiDrawingStore.sceneImageData[currentSelectIndex.value], currentSelectIndex.value)
    }
  },
  {
    deep: true,
  },
)

const handleRemove = (key: 'product' | 'character') => {
  const defaultValue = {
    material_name: '',
    file_path: '',
    file_url: '',
    id: 0,
    is_delete: 1,
  }

  aiDrawingStore.imagePosition[key] = ''
  Object.assign(aiDrawingStore[key], defaultValue)
}

const handleChangePosition = async (
  key: 'product' | 'character',
  position: string,
  _image: object,
) => {
  console.log('handleChangePosition', position)
  aiDrawingStore.imagePosition.product = position
  // if (
  //   aiDrawingStore.imagePosition[key]?.indexOf(aiDrawingStore[key].file_url) === -1 ||
  //   !isSameImagePosition(aiDrawingStore.imagePosition[key], position)
  // ) {
  //   aiDrawingStore.imagePosition[key] = position
  // }
}
</script>

<style lang="scss" scoped>
.generating-loading {
  width: 120px;
  height: 120px;
  margin-bottom: 12px;
  position: relative;
  &::before {
    top: 0;
    content: ' ';
    position: absolute;
    width: 120px;
    height: 120px;
    opacity: 0.1;
    background: linear-gradient(342deg, #0f5fff 10%, #ffffff 51%, rgba(15, 95, 255, 30%) 91%);
  }
}

.active {
  border: 2px solid #0f5fff;
  opacity: 1;
}
</style>
