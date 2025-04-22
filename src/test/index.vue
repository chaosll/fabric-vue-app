<template>
  <SavedScene v-if="savedSceneStore.showSavedScene" />
  <div
    class="fixed flex h-full w-full bg-[#EEF2FA]"
    v-loading="pageLoading"
    :element-loading-text="pageLoadingText"
  >
    <!-- h-[calc(100%-60px)] -->
    <div class="flex h-full w-full" v-show="!showCombinePreview">
      <div
        style="scrollbar-gutter: stable"
        class="my-5 ml-5 w-[25.5rem] shrink-0 rounded-lg border border-white bg-[#FFFFFF] py-5"
      >
        <div title="product-model" class="product-title px-6">
          <span
            class="product-title__text"
            :title="productStore.productInfo.name || productStore.productInfo.model"
            >{{ productStore.productInfo.name || productStore.productInfo.model }}</span
          >
          <!-- <md-tooltip
              class="box-item"
              effect="dark"
              :content="productStore.productInfo.name || productStore.productInfo.model"
              placement="top"
            >
              <span class="product-title__text" :title="productStore.productInfo.name || productStore.productInfo.model">{{ productStore.productInfo.name || productStore.productInfo.model }}</span>
            </md-tooltip> -->
        </div>

        <MdTabs
          v-model="pageStore.activeTab"
          class="customize-tabs generateTabs mt-2.5"
          type="card"
          :before-leave="handleBeforeLeave"
        >
          <MdTabPane name="creativeBuild" label="AI创意生图" class="h-full">
            <div style="height: calc(-230px + 100vh)" class="overflow-y-auto px-6">
              <div class="customize-tab__title">
                <h3 class="customize-tab__title__txt">选择产品图</h3>
                <div class="customize-tab__title__extra"></div>
              </div>
              <!-- step1 选择产品图 -->
              <ImageGallery
                ref="creativeBuildProductGalleryRef"
                :items="productStore.productImageList"
                @select="handleImageSelect"
              />
              <div class="customize-tab__title">
                <h3 class="customize-tab__title__txt">
                  图片尺寸（像素）<span
                    class="customize-tab__title__sub text-gray-500 fs-12 text-sm"
                    >预计单张生图时间大约{{ estimatedTimeText }}</span
                  >
                </h3>
              </div>
              <!-- step2 选择生成图片尺寸 -->
              <SizeSelector @change="handleSizeChange"></SizeSelector>
              <div class="customize-tab__title">
                <h3 class="customize-tab__title__txt">选择画面风格</h3>
                <div class="customize-tab__title__extra"></div>
              </div>
              <div class="style-box mt-4">
                <StyleTabs
                  style="margin-bottom: 12px"
                  v-model="currentStyle"
                  :tabs="styleList"
                  :visible-count="4"
                  @change="handleStyleChange"
                />
              </div>
              <div
                style="min-height: 224px"
                v-loading="loading"
                element-loading-background="#FFFFFF"
              >
                <!--                <MaterialWaterfall-->
                <!--                  ref="materialWaterfallRef"-->
                <!--                  :list="creativePageConfig.list"-->
                <!--                  -->
                <!--                  height="calc(100vh - 550px)"-->
                <!--                  @select="handleCreativeSceneSelect"-->
                <!--                  @load-more="loadMoreCreativeSceneMaterial"-->
                <!--                />-->
                <ImageList
                  v-if="creativePageConfig.list && creativePageConfig.list.length > 0"
                  ref="materialWaterfallRef"
                  :images="creativePageConfig.list"
                  @select="handleCreativeSceneSelect"
                />
                <div v-else class="flex h-full w-full items-center justify-center">
                  <ex-empty class="w-full" layout="ImageEmpty" description="即将上线，敬请期待" />
                </div>
              </div>

              <loading-btn
                v-if="imageGenerateStore.sceneState === GENERATE_STATUS.Generating"
                text="AI正在生成背景图，请稍等..."
                cancel-text="取消生成"
                :show-cancel="true"
                @cancel="handsleCancel"
              />
              <md-tooltip
                v-else
                :visible="isShowBgiTooltip"
                popper-class="tooltip"
                effect="dark"
                content="切换风格后需要重新生成背景图哦！"
                placement="top"
                ref="tooltipRef"
              >
              <div
                :class="
                  isCreativeBuildButtonEnabled ? 'create-scene-box-active' : 'create-scene-box'
                "
                @click="handleGenCreativeScene"
              >
                生成背景图
              </div>
            </md-tooltip>

            </div>
            <div class="mx-6">
              <LoadingCircleBtn
                class="my-2.5"
                v-if="imageGenerateStore.combineState === GENERATE_STATUS.Generating"
                text="AI正在融合场景图，请稍等..."
                cancel-text="取消生成"
                :show-cancel="true"
                @cancel="handleCancel"
              />
              <div
                v-else
                :class="
                  imageGenerateStore.sceneState === GENERATE_STATUS.Completed
                    ? 'create-action-box-active'
                    : 'create-action-box'
                "
                @click="handleGenCreativeBuildImage"
              >
                AI生成自然效果
              </div>
            </div>
          </MdTabPane>
          <MdTabPane name="customizeBuild" label="AI定制设计" class="h-full">
            <div class="flex h-full w-full items-center justify-center">
              <ex-empty class="w-full" layout="ImageEmpty" description="即将上线，敬请期待" />
            </div>
          </MdTabPane>
          <MdTabPane name="fixedSceneBuild" label="固定场景生图">
            <div class="mx-6">
              <div class="customize-tab__title">
                <h3 class="customize-tab__title__txt">选择产品图</h3>
                <div class="customize-tab__title__extra"></div>
              </div>
              <ImageGallery
                ref="fixedSceneProductGalleryRef"
                :items="productStore.productImageList"
                @select="handleImageSelect"
              />
              <div class="customize-tab__title">
                <h3 class="customize-tab__title__txt">选择背景素材</h3>
                <div class="customize-tab__title__extra">
                  <md-link
                    class="mcsp-link refresh-btn"
                    :icon="RefreshLeft"
                    @click="handleGetRamdomFixedSceneMaterial"
                    >换一批</md-link
                  >
                  <md-popover
                    :visible="dialogVisible"
                    placement="right"
                    :width="700"
                    @show="handleDialogShowMoreFixedScene"
                  >
                    <template #reference>
                      <md-link
                        :class="'mcsp-link ' + (dialogVisible ? 'md-link--active' : '')"
                        @click.stop="handleDialogShowMoreFixedScene"
                      >
                        查看更多素材<md-icon class="md-icon--right"><arrow-right /></md-icon>
                      </md-link>
                    </template>
                    <div class="more-material-box">
                      <div class="more-material-box--title">选择背景素材</div>
                      <md-icon class="more-material-box--close" @click="dialogVisible = false"
                        ><close
                      /></md-icon>
                      <div class="more-material-filter-row">
                        <div class="more-material-filter-row__label">类型：</div>
                        <div class="more-material-filter-row__content">
                          <StyleTabs
                            ref="fixedSceneStyleTabsRef"
                            v-model="currentFixedSceneStyle"
                            :tabs="fixedSceneStyleList"
                            @change="handleFixedSceneStyleChange"
                          />
                        </div>
                      </div>
                      <div
                        class="more-material-filter-row"
                        v-show="currentFixedSceneStyle == '居家空间'"
                      >
                        <div class="more-material-filter-row__label">适配角度：</div>
                        <div class="more-material-filter-row__content">
                          <AngleSelector
                            ref="fixedSceneAngleSelectorRef"
                            :visible-items="angleList1"
                            :hidden-items="angleList2"
                            v-model="currentAngle"
                            :visible-count="2"
                            @select="handleAngleSelect"
                          />
                        </div>
                      </div>

                      <div
                        class=""
                        style="height: 500px"
                        v-loading="moreMaterialLoading"
                        element-loading-background="#FFFFFF"
                      >
                        <MaterialWaterfall
                          ref="fixedSceneDialogWaterfallRef"
                          :list="fixedSceneDialogPageConfig.list"
                          height="500px"
                          @select="handleDialogBgMaterialSelect"
                        />
                      </div>
                    </div>
                  </md-popover>
                </div>
              </div>

              <div
                style="height: calc(100vh - 370px)"
                v-loading="loading"
                element-loading-background="#FFFFFF"
              >
                <MaterialWaterfall
                  v-if="fixedScenePageConfig.list && fixedScenePageConfig.list.length"
                  ref="fixedSceneWaterfallRef"
                  :list="fixedScenePageConfig.list"
                  @select="handleBgMaterialSelect"
                  height="calc(100vh - 370px)"
                />
                <div v-else class="flex h-full w-full items-center justify-center">
                  <ex-empty class="w-full" layout="ImageEmpty" description="即将上线，敬请期待" />
                </div>
              </div>

              <div
                :class="
                  isFixedSceneBuildButtonEnabled && !materialRenderLoading
                    ? 'create-action-box-active'
                    : 'create-action-box'
                "
                @click="handleGenFixedSceneBuildImage"
              >
                AI生成自然效果
              </div>
            </div>
          </MdTabPane>
        </MdTabs>
      </div>
      <KeepAlive>
        <div
          class="my-5 mr-5 ml-3 flex-1 overflow-hidden rounded-lg border border-white bg-[#FAFBFE]"
          v-loading="materialRenderLoading"
        >
          <GeneratePreview
            v-show="pageStore.activeTab === ACTIVE_TAB_NAME.CreativeBuild"
            loadingText="背景图片生成中"
            ref="refImageGeneratePreview"
            :aiDrawingStore="imageGenerateStore"
            useRevoke
          />
          <GeneratePreview
            v-show="pageStore.activeTab === ACTIVE_TAB_NAME.FixedSceneBuild"
            ref="refFixedSceneGeneratePreview"
            loadingText="自然效果生成中"
            :aiDrawingStore="fixedImageGenerateStore"
            useRevoke
          />
        </div>
      </KeepAlive>
    </div>
    <div class="relative flex h-full w-full" v-if="showCombinePreview">
      <md-button class="absolute top-10 left-10 circle-button" @click="resetState" :icon="ArrowLeft"
        >返回</md-button
      >
      <CombinePreview
        v-show="pageStore.activeTab === ACTIVE_TAB_NAME.CreativeBuild"
        ref="refImageGeneratePreview"
        :aiDrawingStore="imageGenerateStore"
        useRevoke
      />
      <CombinePreview
        v-show="pageStore.activeTab === ACTIVE_TAB_NAME.FixedSceneBuild"
        ref="refFixedSceneGeneratePreview"
        :aiDrawingStore="fixedImageGenerateStore"
        useRevoke
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, Ref, watch, onMounted, onUnmounted, nextTick, provide, toRaw, onBeforeUnmount, computed } from 'vue'
import { RefreshLeft, ArrowRight, ArrowLeft, Close } from '@element-plus/icons-vue'
import { v4 as uuidv4 } from 'uuid'
import { ElMessage as MdMessage, ElMessageBox as MdMessageBox, ElLoading } from 'element-plus'
import { debounce } from 'lodash-es'
import AiDrawService from '~/api/backend/AiDrawService'
import LoadingBtn from '~/components/LoadingBtn.vue'
import LoadingCircleBtn from '~/components/LoadingCircleBtn.vue'
import GeneratePreview from './components/GeneratePreview.vue'
import ImageGallery from './components/ProductImageGallery.vue'
import MaterialWaterfall from './components/MaterialWaterfall.vue'
import ImageList from './components/ImageListWithScrollBar.vue'
import StyleTabs from './components/StyleTabs.vue'
import SizeSelector from './components/SizeSelector.vue'
import AngleSelector from './components/AngleSelector.vue'
import ExEmpty from '../../components/basic/ExEmpty.vue'
import CombinePreview from './components/CombinePreview.vue'
import SavedScene from './components/SavedScene.vue'

import { useGenerateStore } from '~/store/aiDrawingStore'
import { ACTIVE_TAB_NAME, GENERATE_STATUS } from '~/store/materialEditorStore'
import { useCommunicationStore } from '~/store/communicationStore'
import { useProductStore } from '~/store/productStore'
import { useSavedSceneStore } from '~/store/savedSceneStore'

const dialogVisible = ref(false)
const loading = ref(false)
const pageLoading = ref(false)
const pageLoadingText = ref('加载中...')
const moreMaterialLoading = ref(false)
const materialRenderLoading = ref(false)
const showSavedScene = ref(false)
const currentMaterial_id = ref<number|string>()
const currrentImageUrl = ref<string>()
provide('currentMaterial_id', currentMaterial_id)

const productStore = useProductStore()
const { pageStore, imageGenerateStore, fixedImageGenerateStore } = useGenerateStore()

const communicationStore = useCommunicationStore()
const savedSceneStore = useSavedSceneStore()

const getSceneMaterial = async () => {
  if (pageStore.activeTab === ACTIVE_TAB_NAME.FixedSceneBuild) {
    if (fixedScenePageConfig.list.length == 0) {
      fixedSceneProductGalleryRef.value.selectImageByIndex(0)
    }
  } else {
    if (creativePageConfig.list.length == 0) {
      creativeBuildProductGalleryRef.value.selectImageByIndex(0)
    }
  }
}

watch(
  () => pageStore.activeTab,
  (newTab) => {
    console.log('标签页切换:', newTab)
    getSceneMaterial()
  },
)

const materialWaterfallRef = ref()

const currentStyle = ref('')
const styleList = ref([
  { label: '推荐', value: '' },
  { label: '室内场景', value: '室内场景' },
  { label: '有机生态', value: '有机生态' },
  { label: '极简幻境', value: '极简幻境' },
  { label: '暗夜轻奢', value: '暗夜轻奢' },
  { label: '炫酷科幻', value: '炫酷科幻' },
  { label: '抽象几何', value: '抽象几何' },
  { label: '超现实展台', value: '超现实展台' },
])
const currentFixedSceneStyle = ref('全部')
const fixedSceneStyleList = ref([
  { label: '全部', value: '全部' },
  { label: '居家空间', value: '居家空间' },
  { label: '展台场景', value: '展台场景' },
  { label: '自然生态', value: '自然生态' },
  { label: '抽象几何', value: '抽象几何' },
  { label: '虚实幻境', value: '虚实幻境' },
])

const handleStyleChange = (item: { label: string; value: string }) => {
  console.log('选中的风格：', item)
  currentStyle.value = item.value
  getCreativeSceneMaterial()
}
const outputSize = ref({ width: 1600, height: 1600 })
const estimatedTimeText = ref('100秒')
const handleSizeChange = async (value) => {
  console.log('handleSizeChange', value)
  outputSize.value = value
  getCreativeSceneEstimatedTime()
}

const getCreativeSceneEstimatedTime = async () => {
  const result = await AiDrawService.getCreativeSceneEstimatedTime({
    material_id: creativePageConfig.useScene,
    product_url: productStore.creativeCurrentProductImage.imageUrl,
    output_size: outputSize.value,
  })
  if (result.errcode === 0) {
    const estimatedTime = result.data.estimated_secs

    if (estimatedTime < 60) {
      estimatedTimeText.value = estimatedTime + 's'
    } else {
      const minutes = Math.ceil(estimatedTime / 60)
      estimatedTimeText.value = `${minutes}分钟`
    }
  }
}

const fixedSceneStyleTabsRef = ref()
const handleFixedSceneStyleChange = (item: { label: string; value: string }) => {
  console.log('选中的风格：', item)
  currentFixedSceneStyle.value = item.value
  getDialogFixedSceneMaterial()
}

const creativePageConfig = reactive({
  index: 1,
  size: 10,
  total: 0,
  useScene: '',
  tuneFactor: 0.7,
  loading: false,
  tips: '加载更多',
  list: [],
})
const getCreativeSceneMaterial = async () => {
  creativePageConfig.index = 1
  loading.value = true
  await fetchCreativeMaterial()
  loading.value = false
  if (creativePageConfig.list.length > 0) {
    materialWaterfallRef.value?.selectByIndex(0)
    nextTick(() => {
      materialWaterfallRef?.value?.scrollToTop()
    })
  } else {
    creativePageConfig.useScene = null
  }
}

const loadMoreCreativeSceneMaterial = async () => {
  console.log('loadMoreCreativeSceneMaterial')
  creativePageConfig.index++
  await fetchCreativeMaterial(true)
}

const fetchCreativeMaterial = async (isLoadMore = false) => {
  if (creativePageConfig.loading) return

  creativePageConfig.loading = true
  try {
    const result = await AiDrawService.getCreativeSceneMaterial({
      page: creativePageConfig.index,
      page_size: creativePageConfig.size,
      style_tag: currentStyle.value,
      product: productStore.getProductBaseInfo,
    })

    if (result.errcode === 0) {
      let materials = result.data.materials
      materials = materials.map((item) => ({
        ...item,
        thumb_url: item.thumb_url,
        url: item.url,
      }))

      if (isLoadMore) {
        creativePageConfig.list = [...creativePageConfig.list, ...materials]
      } else {
        creativePageConfig.list = materials
      }
      creativePageConfig.total = result.data.total
    }
  } finally {
    creativePageConfig.loading = false
  }
}

const fixedSceneWaterfallRef = ref()
const fixedScenePageConfig = reactive({
  index: 1,
  size: 200,
  total: 0,
  loading: false,
  list: [],
  tips: '加载更多',
  useScene: '',
})
const fixedSceneDialogWaterfallRef = ref()
const fixedSceneDialogPageConfig = reactive({
  index: 1,
  size: 200,
  total: 0,
  loading: false,
  list: [],
  tips: '加载更多',
  useScene: '',
})
const getDialogFixedSceneMaterial = async () => {
  fixedSceneDialogPageConfig.index = 1
  moreMaterialLoading.value = true
  setTimeout(async () => {
    fixedSceneDialogPageConfig.list = []
    await fetchDialogFixedSceneMaterial()
    moreMaterialLoading.value = false
  }, 100)
}
const loadMoreDialogFixedSceneMaterial = async () => {
  fixedSceneDialogPageConfig.index++
  await fetchDialogFixedSceneMaterial(true)
}
const fetchDialogFixedSceneMaterial = async (isLoadMore = false) => {
  try {
    const result = await AiDrawService.getFixedSceneMaterial({
      page: fixedSceneDialogPageConfig.index,
      page_size: fixedSceneDialogPageConfig.size,
      style_tag: currentFixedSceneStyle.value === '全部' ? null : currentFixedSceneStyle.value,
      product: productStore.getProductBaseInfo,
      perspective_tag: currentAngle.value,
    })

    if (result.errcode === 0) {
      let materials = result.data.materials
      materials = materials.map((item) => ({
        ...item,
        thumb_url: item.thumb_url,
        url: item.url,
      }))

      if (isLoadMore) {
        fixedSceneDialogPageConfig.list = [...fixedSceneDialogPageConfig.list, ...materials]
      } else {
        fixedSceneDialogPageConfig.list = materials
      }
      fixedSceneDialogPageConfig.total = result.data.total || 0
    }
  } finally {
    fixedSceneDialogPageConfig.loading = false
  }
}

const getFixedSceneMaterial = async () => {
  fixedScenePageConfig.index = 1
  fixedScenePageConfig.list = []
  loading.value = true
  await fetchFixedSceneMaterial(false, true)
  loading.value = false
  if (fixedScenePageConfig.list.length > 0) {
    fixedSceneWaterfallRef.value?.selectByIndex(0)
  }
}

const loadMoreFixedSceneMaterial = async () => {
  console.log('loadMoreFixedSceneMaterial')
  fixedScenePageConfig.index++
  await fetchFixedSceneMaterial(true)
}

const fetchFixedSceneMaterial = async (isLoadMore = false, isRandom = false) => {
  try {
    let result = null
    if (isRandom) {
      result = await AiDrawService.getFixedSceneMaterialRandom({
        page: fixedScenePageConfig.index,
        page_size: fixedScenePageConfig.size,
        product: productStore.getProductBaseInfo,
      })
    } else {
      result = await AiDrawService.getFixedSceneMaterial({
        page: fixedScenePageConfig.index,
        page_size: fixedScenePageConfig.size,
        product: productStore.getProductBaseInfo,
      })
    }
    if (result.errcode === 0) {
      let materials = result.data.materials
      materials = materials.map((item) => ({
        ...item,
        thumb_url: item.thumb_url,
        url: item.url,
      }))
      if (isLoadMore) {
        fixedScenePageConfig.list = [...fixedScenePageConfig.list, ...materials]
      } else {
        fixedScenePageConfig.list = materials
      }
      fixedScenePageConfig.total = result.data.total || 0
    }
  } finally {
  }
}

const resetFixedSceneDialogMaterial = (item: any) => {
  console.log('resetFixedSceneDialogMaterial', item)
  if (fixedSceneDialogPageConfig.list.length > 0) {
    fixedSceneDialogPageConfig.list = []
    fixedSceneDialogPageConfig.index = 1
    fixedSceneDialogPageConfig.total = 0
    currentFixedSceneStyle.value = '全部'
  }
  if (item.perspective == '1' || item.perspective == '2') {
    currentAngle.value = 'F'
    const showAngles = filterAngles(['F', 'R-30', 'R-60', 'L-30', 'L-60'])
    const hideAngles = filterAngles(['R-15', 'R-45', 'R-75', 'L-15', 'L-45', 'L-75'])
    angleList1.splice(0, angleList1.length, ...showAngles)
    angleList2.splice(0, angleList2.length, ...hideAngles)
  }
  if (item.perspective == '4') {
    currentAngle.value = 'L-30'
    const showAngles = filterAngles(['L-15', 'L-30', 'L-45', 'L-60', 'L-75'])
    const hideAngles = filterAngles(['F', 'R-15', 'R-30', 'R-45', 'R-60', 'R-75'])
    angleList1.splice(0, angleList1.length, ...showAngles)
    angleList2.splice(0, angleList2.length, ...hideAngles)
  }
  if (
    item.perspective == '5' ||
    item.perspective == '3' ||
    item.perspective == '6' ||
    item.perspective == '7'
  ) {
    currentAngle.value = 'R-30'
    const showAngles = filterAngles(['R-15', 'R-30', 'R-45', 'R-60', 'R-75'])
    const hideAngles = filterAngles(['F', 'L-15', 'L-30', 'L-45', 'L-60', 'L-75'])
    angleList1.splice(0, angleList1.length, ...showAngles)
    angleList2.splice(0, angleList2.length, ...hideAngles)
  }
}

const handleImageSelect = async (item: any) => {
  console.log('选中的商品图片：', item)
  currrentImageUrl.value = String(item.imageUrl)
  

  if (pageStore.activeTab !== ACTIVE_TAB_NAME.FixedSceneBuild) {
    productStore.setCreativeCurrentProductImage(item)
    getCreativeSceneMaterial()
  } else {
    resetFixedSceneDialogMaterial(item)
    productStore.setFixedCurrentProductImage(item)
  }

  const mattingUrl = item.mattingImage || (await generateMatting(item))
  if (!mattingUrl) return

  await updateProductWithMatting(item, mattingUrl)
}

const generateMatting = async (item: any): Promise<string | null> => {
  try {
    pageLoading.value = true
    pageLoadingText.value = ''

    const result = await AiDrawService.genProductMatting({
      product_url: item.imageUrl,
      transparent: true,
    })

    return result.data.image_url
  } catch (error) {
    console.error('生成抠图失败:', error)
    pageLoading.value = false
    return null
  } finally {
      pageLoading.value = false
  }
}

const updateProductWithMatting = async (item: any, mattingUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = async () => {
      pageLoading.value = false

      const updatedItem = {
        ...item,
        mattingImage: mattingUrl,
        mattingWidth: img.width,
        mattingHeight: img.height,
      }

      productStore.updateProductImage(updatedItem)
      if (pageStore.activeTab === ACTIVE_TAB_NAME.FixedSceneBuild) {
        Object.assign(fixedImageGenerateStore.product, {
          file_path: mattingUrl,
          id: 0,
        })
      } else {
        Object.assign(imageGenerateStore.product, {
          file_path: mattingUrl,
          id: 0,
        })
      }

      resolve()
    }

    img.src = mattingUrl
  })
}

const isShowBgiTooltip = ref<boolean>(false)
const isFirstLoad = ref<boolean>(true)
const handleCreativeSceneSelect = (item: ImageItem, index: number, isSliderChange?: boolean) => {
  console.log('选中的创意生图风格素材：', isSliderChange)
  console.log('isSliderChange', isSliderChange,index)

  currentMaterial_id.value = String(item.material_id)
  let recordBgiParams = {
    '456':true
  }
  console.log('当前：', currentMaterial_id.value)
  console.log('仓库：', recordBgiParams)

  if (!recordBgiParams) {
    console.log('没有生成过图的话不需要提示')
    isShowBgiTooltip.value = false
    creativePageConfig.useScene = item.material_id
    creativePageConfig.tuneFactor = item.value
    isFirstLoad.value = false
    return
  }

  if (recordBgiParams.hasOwnProperty(currentMaterial_id.value)) {
    isShowBgiTooltip.value = false
  } else {
    isShowBgiTooltip.value = true
  }
  creativePageConfig.useScene = item.material_id
  creativePageConfig.tuneFactor = item.value
}

watch(
  isShowBgiTooltip,
  (newValue) => {
    if (newValue) {
      if (timer.value) {
        clearTimeout(timer.value)
      }
      timer.value = setTimeout(() => {
        isShowBgiTooltip.value = false
      }, 3000)
    }
  },
  {
    immediate: true,
  }
)

const currentBgMaterialSelect = ref(-1)
const handleBgMaterialSelect = async (item: ImageItem, index: number) => {
  materialRenderLoading.value = true
  console.log('选中的固定背景素材：', item)
  try {
    await loadImage(item.url)
    fixedImageGenerateStore.resetSceneImage(item)
    materialRenderLoading.value = false
  } catch (error) {
    console.error('背景图片加载失败:', error)
  }
}

const handleDialogBgMaterialSelect = async (item: ImageItem, index: number) => {
  console.log('选中的背景素材2：', item)
  dialogVisible.value = false
  fixedSceneWaterfallRef?.value?.clearSelection()
  fixedSceneWaterfallRef?.value?.scrollToTop()
  materialRenderLoading.value = true
  console.log('选中的固定背景素材：', item)
  try {
    await loadImage(item.url)
    fixedImageGenerateStore.resetSceneImage(item)
    materialRenderLoading.value = false
  } catch (error) {
    console.error('背景图片加载失败:', error)
  }
}

const handleDialogShowMoreFixedScene = () => {
  dialogVisible.value = true
  nextTick(() => {
    if (fixedSceneDialogPageConfig.list.length == 0) {
      fixedSceneStyleTabsRef.value.selectByValue(currentFixedSceneStyle.value)
    }
  })
}

const refImageGeneratePreview = ref<InstanceType<typeof GeneratePreview>>()
const refFixedSceneGeneratePreview = ref<InstanceType<typeof GeneratePreview>>()

const isCreativeBuildButtonEnabled = computed(() => {
  return outputSize.value && creativePageConfig.useScene && productStore.creativeCurrentProductImage
})

const handleGenCreativeScene = async () => {
  if (isCreativeBuildButtonEnabled.value) {
    await imageGenerateStore.genSceneImage({
      material_id: creativePageConfig.useScene,
      tune_factor: creativePageConfig.tuneFactor,
      product: productStore.productInfo,
      output_size: outputSize.value,
    })
    isShowBgiTooltip.value = false
  }
}

const handleGenCreativeBuildImage = async () => {
  if (imageGenerateStore.sceneState === GENERATE_STATUS.Completed) {
    await imageGenerateStore.genCombineImage({
      product_url: productStore.creativeCurrentProductImage.imageUrl,
      product: productStore.productInfo,
      output_size: outputSize.value,
    })
  }
}

const isFixedSceneBuildButtonEnabled = computed(() => {
  return (
    Object.keys(productStore.fixedCurrentProductImage).length > 0 &&
    fixedScenePageConfig.list.length > 0
  )
})

const handleGenFixedSceneBuildImage = () => {
  console.log('handleGenFixedSceneBuildImage')
  if (isFixedSceneBuildButtonEnabled && !materialRenderLoading.value) {
    fixedImageGenerateStore.genCombineImage()
  }
}

const handleCancel = () => {
  imageGenerateStore.cancelRequest()
}

const showCombinePreview = computed(() => {
  if (pageStore.activeTab === ACTIVE_TAB_NAME.FixedSceneBuild) {
    return (
      fixedImageGenerateStore.combineState === GENERATE_STATUS.Completed ||
      fixedImageGenerateStore.combineState === GENERATE_STATUS.Generating
    )
  } else if (pageStore.activeTab === ACTIVE_TAB_NAME.CreativeBuild) {
    return (
      imageGenerateStore.combineState === GENERATE_STATUS.Completed ||
      imageGenerateStore.combineState === GENERATE_STATUS.Generating
    )
  } else {
    return false
  }
})

const resetState = () => {
  if (pageStore.activeTab === ACTIVE_TAB_NAME.FixedSceneBuild) {
    fixedImageGenerateStore.resetState()
  } else {
    imageGenerateStore.resetState()
  }
}

const baseURL = import.meta.env.VITE_APP_BASE_URL
const handleSendMaterial = () => {
  communicationStore.sendMessageToParent('AI_DRAW_RESULT', [
    {
      url: `${baseURL}/test11.png`,
    },
    {
      url: `${baseURL}/test11.png`,
    },
  ])
}

const handleGetRamdomFixedSceneMaterial = async () => {
  fixedScenePageConfig.index = 1
  loading.value = true

  await fetchFixedSceneMaterial(false, true)
  nextTick(() => {
    fixedSceneWaterfallRef?.value?.clearSelection()
    fixedSceneWaterfallRef?.value?.scrollToTop()
  })
  loading.value = false
}

const handleBeforeLeave = () => {
  if (imageGenerateStore.combineState === GENERATE_STATUS.Generating) {
    MdMessage({
      message: 'AI正在生图中，请等待生图完成再切换',
      type: 'warning',
    })
    return false
  } else {
    return true
  }
}

const loadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
  })
}

function changeTooltipStyle () {
  console.log('88888888888888',tooltipRef.value)
  const tooltipEl = tooltipRef.value?.popperRef?.contentRef
  
if (tooltipEl ) {
    Object.assign(tooltipEl.style, {
      width: '208px',
      height: '32px',
      fontSize: '12px',
      borderRadius: '8px',
      backgroundColor: '#1D2129',
      border: 'none',
      padding: '6px 8px',
      alignSelf: 'stretch',
      zIndex: '99999'
    })
    
    const spans = tooltipEl.querySelectorAll('span')
    spans.forEach(span => {
      Object.assign(span.style, {
        letterSpacing: 'normal',
        lineHeight: '20px',
        textAlign: 'center',
      })
    })

  }
}

onMounted(() => {
  isFirstLoad.value = true
  changeTooltipStyle()
})

onBeforeUnmount(() => {
  if (timer.value) {
    clearTimeout(timer.value)
  }
})
</script>

<style lang="scss">
.product-model {
  font-size: 12px;
  font-weight: 700;
}
.generateTabs {
  .md-tabs__header {
    margin: 0 1.5rem;
    margin-bottom: 20px;
  }
  .md-tabs__nav {
    display: flex;
    width: 100%;
    padding: 0 3px 0 4px;
    background: #f4f6f8;
    .md-tabs__item {
      position: relative;
      width: 100%;
      flex: 1;
      margin: 0;
      text-align: center;
      border: none;
      border-radius: 0;
      line-height: 42px;
      &:hover {
        color: #1d2129;
      }
      &.is-active {
        position: relative;
        left: -1px;
        margin-top: 3px;
        line-height: 36px;
        border-radius: 0;
        width: calc(100% + 1px);
        &::after {
          display: none;
        }
      }
      &::after {
        position: absolute;
        right: 0;
        top: 16px;
        content: '';
        width: 1px;
        height: 12px;
        background-color: #dbdfe4;
      }
    }
  }
  .md-tabs__nav .md-tabs__item:last-child {
    &::after {
      display: none;
    }
  }
  .md-tabs__content {
    height: 100%;
    overflow: visible;
  }
}
.customize-tab__title {
  position: relative;
  margin-bottom: 10px;
  .customize-tab__title__txt {
    font-family: 'PingFang SC';
    font-size: 14px;
    font-weight: 700;
    line-height: 18px;
    color: #1d2129;
  }
  .customize-tab__title__sub {
    display: inline-block;
    font-weight: normal;
    transform: scale(90%);
    text-indent: -10px;
  }
  .customize-tab__title__extra {
    position: absolute;
    right: 0;
    top: -6px;
    .refresh-btn {
      margin-right: 10px;
    }
    .md-icon--right {
      margin-left: 0;
      position: relative;
      top: 2px;
    }
  }
}
.mcsp-link:hover {
  color: #fa2c19 !important;
}
.md-link--active {
  color: #fa2c19 !important;
}

.more-material-box--title {
  margin: 10px 0 15px;
  font-size: 16px;
  font-weight: 700;
}
.more-material-box--close {
  position: absolute;
  right: 22px;
  top: 22px;
  font-size: 16px;
  cursor: pointer;
  color: #4e5969;
}
.create-scene-box {
  width: 100%;
  height: 32px;
  line-height: 32px;
  text-align: center;
  margin: 10px auto;
  color: #c0c5cf;
  background: #f2f3f5;
  border-radius: 4px;
  border: 1px solid #e5e6eb;
  font-family: 'PingFang SC';
  font-size: 12px;
  font-weight: normal;
  letter-spacing: normal;
  cursor: not-allowed;
}

.create-scene-box-active {
  width: 100%;
  height: 32px;
  line-height: 32px;
  text-align: center;
  margin: 10px auto;
  border-radius: 4px;
  font-family: 'PingFang SC';
  font-size: 12px;
  font-weight: normal;
  letter-spacing: normal;
  color: #fa2c19;
  border: 0.5px solid #fa2c19;
  cursor: pointer;
}

.create-action-box {
  margin: 10px auto 0;
  text-align: center;
  width: 100%;
  border-radius: 40px;
  height: 44px;
  line-height: 44px;
  background: #f2f3f5;
  box-sizing: border-box;
  border: 1px solid #e5e6eb;
  color: #c0c5cf;
  font-size: 16px;
  cursor: not-allowed;
  font-family: 'PingFang SC';
}
.create-action-box-active {
  font-size: 16px;
  font-family: 'PingFang SC';
  margin: 10px auto 0;
  text-align: center;
  width: 100%;
  border-radius: 40px;
  height: 44px;
  line-height: 44px;
  cursor: pointer;
  border: 0;
  background: linear-gradient(95deg, #ff7e66 0%, #ff3d2b 99%);
  box-shadow:
    0 0 2px 0 rgba(250, 44, 25, 12%),
    0 2px 6px 0 rgba(250, 44, 25, 16%),
    0 4px 12px 0 rgba(250, 44, 25, 20%);
  color: #ffffff;
}
.circle-button {
  border-radius: 100px;
  opacity: 1;
  z-index: 100;
  background: #ffffff;
}
.product-title__text {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.more-material-filter-row {
  margin-bottom: 15px;
  &__label {
    display: inline-block;
    width: 70px;
  }
  &__content {
    display: inline-block;
  }
}
</style>
