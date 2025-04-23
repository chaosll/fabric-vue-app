<template>
  <div ref="refCanvasContainerDiv" class="h-full w-full">
    <canvas :id="id"></canvas>
    <md-tooltip
      :visible="tooltipInstance.visible"
      :content="tooltipInstance.content"
      placement="bottom"
      trigger="click"
      virtual-triggering
      popper-class="customize-tooltip"
      :virtualRef="tooltipInstance.trigger"
    />
  </div>
</template>

<script setup lang="ts">
import {
  Canvas,
  Control,
  FabricImage,
  FabricObject,
  InteractiveFabricObject,
  Point,
  Rect,
  TPointerEventInfo,
  controlsUtils,
} from 'fabric'
import { useId } from 'vue'
import DELETE from '~/assets/svgs/editor/ai-delete.svg'
import FLIP from '~/assets/svgs/editor/ai-flip.svg'
import RESET from '~/assets/svgs/editor/ai-reset.svg'
import ROTATE_TIP from '~/assets/svgs/editor/ai-rotate-tip.svg'
import ROTATE from '~/assets/svgs/editor/ai-rotate.svg'
import { IAiDrawingStore, useGenerateStore } from '~/store/aiDrawingStore'
import { DrawingFabricUtils } from '.'
import { useProductStore } from '../../../store/productStore'
import { ACTIVE_TAB_NAME } from '../../../store/materialEditorStore'

/**
 * 组件属性定义
 * @typedef {Object} GrabbingBoxProps
 * @property {('Top'|'Bottom')} toolLayout - 工具栏位置，顶部或底部
 * @property {number} maxScale - 最大缩放比例，百分比
 * @property {number} minScale - 最小缩放比例，百分比
 * @property {number|'auto'} initScale - 初始缩放比例，可以是数字或自动
 * @property {number} scaleStep - 点击缩放按钮时的步长
 * @property {string} bgImageUrl - 背景图URL
 * @property {string} productImageUrl - 产品图URL
 * @property {string} characterImageUrl - 人物图URL
 * @property {Object} imagePosition - 图片位置信息
 */
type GrabbingBoxProps = {
  /** 工具位置 */
  toolLayout?: 'Top' | 'Bottom'
  /** scale最大百分比 */
  maxScale?: number
  /** scale最小百分比 */
  minScale?: number
  /** 初始化比例 */
  initScale?: number | 'auto'
  /** 点击缩放按钮时的步长 */
  scaleStep?: number
  /** 背景图 */
  bgImageUrl?: string
  /** 产品图 */
  productImageUrl?: string
  /** 人物图 */
  characterImageUrl?: string
  /** (产品 || 人物)位置 */
  imagePosition?: IAiDrawingStore['imagePosition']['value']
}

// 定义组件模型，默认值为10
const model = defineModel<number>({ default: 10 })

// 定义组件属性，并设置默认值
const props = withDefaults(defineProps<GrabbingBoxProps>(), {
  toolLayout: 'Bottom',
  maxScale: 400,
  minScale: 10,
  initScale: 'auto',
  scaleStep: 6,
})

// 定义组件事件
const emits = defineEmits(['delete', 'changePosition'])
const instance = getCurrentInstance()
const refCanvasContainerDiv = ref()
// 使用useElementVisibility hook跟踪元素可见性
const visibility = useElementVisibility(refCanvasContainerDiv)
// 生成唯一ID用于canvas元素
const id = useId()
const isInitCanvasSize = ref(true)
// 初始化绘图工具类实例
const drawingFabricUtils = new DrawingFabricUtils()

/**
 * 提示框实例对象
 * 用于显示旋转角度等信息
 */
const tooltipInstance = reactive({
  visible: false,
  content: '',
  position: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  trigger: {
    getBoundingClientRect() {
      return tooltipInstance.position as DOMRect
    },
  },
})

// Canvas相关实例变量
let container: Canvas
let bgImg: FabricImage
let productImg: FabricImage
let characterImg: FabricImage
const controlSize = 24 // 控制可点击区域大小

// 获取产品store和页面store
const productStore = useProductStore()
const { pageStore } = useGenerateStore()

/**
 * 组件状态对象
 * 包含位置、缩放、拖拽等状态信息
 */
const state = reactive({
  lastTransformData: {
    scale: 1,
    translateX: 0,
    translateY: 0,
  },
  lastPosition: {
    x: null,
    y: null,
    distance: 0, // 两指触点之间的距离
  },
  readyToDrag: false,
  scaleTranslateProportion: [0, 0],
  modelInit: 0, // 模型初始化比例
})

/**
 * 旋转控制器
 * 用于对象旋转操作的交互控件
 */
const rotateControl = (() => {
  // 创建旋转图标
  const rotateIcon = new Image()
  rotateIcon.crossOrigin = 'anonymous'
  rotateIcon.src = ROTATE

  // 创建旋转控制点
  return new Control({
    x: 0,
    y: 0.5,
    offsetY: 26,
    cursorStyle: 'pointer',
    actionHandler: controlsUtils.rotationWithSnapping, // 使用内置旋转处理器
    actionName: 'rotate',
    sizeX: controlSize,
    sizeY: controlSize,
    // 鼠标按下时的处理函数
    mouseDownHandler: function (_eventData, _transform) {
      // 隐藏其他控制点
      deleteControl.visible = false
      resetControl.visible = false
      flipControl.visible = false
      functionalBackgroundControl.visible = false
      // 切换为旋转提示图标
      rotateIcon.onload = () => container.requestRenderAll()
      rotateIcon.src = ROTATE_TIP
      // 显示角度提示
      tooltipInstance.visible = true
    },
    // 鼠标释放时的处理函数
    mouseUpHandler: function (_eventData) {
      // 恢复其他控制点可见性
      deleteControl.visible = true
      resetControl.visible = true
      flipControl.visible = true

      functionalBackgroundControl.visible = true
      // 恢复旋转图标
      rotateIcon.src = ROTATE
      // 隐藏角度提示
      tooltipInstance.visible = false
    },
    // 渲染函数
    render: function (ctx, left, top, _styleOverride, _fabricObject) {
      const size = 24 // 图标大小
      ctx.save()
      ctx.translate(left, top)
      ctx.drawImage(rotateIcon, -size / 2, -size / 2, size, size)
      ctx.restore()

      // 计算当前旋转角度并更新提示内容
      let angle = _fabricObject.angle % 360 // 确保角度在 0 到 359 之间
      if (angle > 180) {
        angle = angle - 360
      }

      tooltipInstance.content = angle.toFixed(0) + '°'
      tooltipInstance.position = DOMRect.fromRect({
        width: 0,
        height: 0,
        x: container._offset.left + left,
        y: container._offset.top + top + 10,
      })
    },
  })
})()

/**
 * 功能背景控制器
 * 用于在对象上方显示一个背景控制区域
 */
const functionalBackgroundControl = new Control({
  x: 0,
  y: -0.5,
  offsetX: -48,
  offsetY: -44,
  // 渲染白色圆角矩形背景
  render: function (ctx, left, top, _styleOverride, _fabricObject) {
    ctx.save()
    ctx.translate(left, top)
    ctx.rotate((_fabricObject.angle * Math.PI) / 180)
    ctx.fillStyle = 'rgb(255, 255, 255)'
    ctx.beginPath()
    ctx.roundRect(0, 0, 96, 32, 70)
    ctx.fill()

    ctx.restore()
  },
})

/**
 * 重置控制器
 * 用于将对象重置到初始状态
 */
const resetControl = (() => {
  // 创建重置图标
  const resetIcon = new Image()
  resetIcon.crossOrigin = 'anonymous'
  resetIcon.src = RESET
  resetIcon.style = 'padding: 10px;'

  // 创建重置控制点
  return new Control({
    x: 0,
    y: -0.5,
    offsetX: -28,
    offsetY: -28,
    cursorStyle: 'pointer',
    actionName: 'Reset',
    sizeX: controlSize,
    sizeY: controlSize,
    // 鼠标释放时的处理函数
    mouseUpHandler: function (_eventData, _transform) {
      const canvas = _transform.target.canvas
      const target: FabricObject = _transform.target
      if (!target.resetParams) return

      // 重置对象的所有变换参数
      target.rotate(0)
      target.left = target.resetParams.left
      target.top = target.resetParams.top
      target.width = target.resetParams.width
      target.height = target.resetParams.height
      target.flipX = false
      target.flipY = false
      target.scale(target.resetParams.scale)
      canvas.requestRenderAll()

      // 触发位置变更事件
      const json = drawingFabricUtils.toCustomizeJson(target)
      emits('changePosition', target.key, json, characterImg)
    },
    // 渲染函数
    render: function (ctx, left, top, _styleOverride, _fabricObject) {
      const size = 16
      ctx.save()
      ctx.translate(left, top)
      ctx.drawImage(resetIcon, -size / 2, -size / 2, size, size)
      ctx.restore()
    },
  })
})()

/**
 * 翻转控制器
 * 用于水平翻转对象
 */
const flipControl = (() => {
  // 创建翻转图标
  const flipIcon = new Image()
  flipIcon.crossOrigin = 'anonymous'
  flipIcon.src = FLIP

  // 创建翻转控制点
  return new Control({
    x: 0,
    y: -0.5,
    offsetX: 0,
    offsetY: -28,
    cursorStyle: 'pointer',
    actionHandler: controlsUtils.rotationWithSnapping,
    actionName: 'Flip',
    sizeX: controlSize,
    sizeY: controlSize,
    // 鼠标释放时的处理函数
    mouseUpHandler: function (_eventData, transform) {
      // 翻转对象
      const target: FabricObject = transform.target
      target.flipX = !target.flipX
      target.canvas.requestRenderAll()
      const json = drawingFabricUtils.toCustomizeJson(target)
      emits('changePosition', target.key, json, characterImg)
    },
    // 渲染函数
    render: function (ctx, left, top, _styleOverride, _fabricObject) {
      const size = 16

      ctx.save()
      ctx.translate(left, top)
      ctx.drawImage(flipIcon, -size / 2, -size / 2, size, size)
      ctx.restore()
    },
  })
})()

const deleteControl = (() => {
  const deleteIcon = new Image()
  deleteIcon.crossOrigin = 'anonymous'
  deleteIcon.src = DELETE

  return new Control({
    x: 0,
    y: -0.5,
    offsetX: 28,
    offsetY: -28,
    cursorStyle: 'pointer',
    actionHandler: controlsUtils.rotationWithSnapping,
    actionName: 'Delete',
    sizeX: controlSize,
    sizeY: controlSize,
    mouseUpHandler: function (_eventData, transform) {
      const canvas = transform.target.canvas
      canvas.remove(transform.target)
      canvas.requestRenderAll()
      emits('delete', transform.target.key)
    },
    render: function (ctx, left, top, _styleOverride, _fabricObject) {
      const size = 16

      ctx.save()
      ctx.translate(left, top)
      ctx.drawImage(deleteIcon, -size / 2, -size / 2, size, size)
      ctx.restore()
    },
  })
})()

const ensureScaleInRange = (scale: number) => {
  if (scale * 100 > props.maxScale) {
    scale = props.maxScale / 100
  } else if (scale * 100 < props.minScale) {
    scale = props.minScale / 100
  }
  return scale
}

const onMouseDown = function (e: TPointerEventInfo<MouseEvent>) {
  if (e.target) return

  const event = e.e
  this.selection = false
  state.readyToDrag = true
  state.lastPosition = {
    x: event.clientX,
    y: event.clientY,
    distance: 0,
  }
  console.log('onMouseDown', state.lastPosition)
}
const onMouseMove = (e: TPointerEventInfo<MouseEvent>) => {
  const event = e.e
  if (state.readyToDrag) {
    event.stopPropagation()
    event.preventDefault()
    const { clientX, clientY } = event
    const { x, y } = state.lastPosition
    const [deltaX, deltaY] = [clientX - x, clientY - y]

    move({ deltaX, deltaY })

    state.lastPosition = {
      x: clientX,
      y: clientY,
      distance: 0,
    }
  }
}
const onMouseUp = function () {
  this.selection = true
  state.readyToDrag = false
}
const move = (options: { deltaX: any; deltaY: any }) => {
  const { translateX, translateY } = state.lastTransformData
  const { deltaX, deltaY } = options
  const [x, y] = [translateX + deltaX, translateY + deltaY]
  state.lastTransformData = {
    ...state.lastTransformData,
    translateX: x,
    translateY: y,
  }
  setMatrix()
}
const setMatrix = () => {
  const { scale, translateX, translateY } = state.lastTransformData
  const safeScale = ensureScaleInRange(scale)
  container.viewportTransform = [safeScale, 0, 0, safeScale, translateX, translateY]
  container.setViewportTransform(container.viewportTransform)
  state.lastTransformData.scale = safeScale
}

const zoomIn = () => {
  const { scale } = state.lastTransformData
  const newScale = scale * 100 + props.scaleStep
  setScale(newScale)
}
const zoomOut = () => {
  const { scale } = state.lastTransformData
  const newScale = scale * 100 - props.scaleStep
  setScale(newScale)
}

const setScale = (scale: number) => {
  const newScale = scale === 0 ? state.modelInit : scale / 100
  const safeScale = ensureScaleInRange(Math.min(newScale, props.maxScale / 100))
  state.lastTransformData.scale = safeScale
  const el = instance?.proxy?.$el
  const zoomPoint = new Point(el.clientWidth / 2, el.clientHeight / 2)
  container.zoomToPoint(zoomPoint, state.lastTransformData.scale)
  const viewportTransform = container.viewportTransform
  state.lastTransformData.translateX = viewportTransform[4]
  state.lastTransformData.translateY = viewportTransform[5]
}
const onWheel = (e: TPointerEventInfo<WheelEvent>) => {
  const { ctrlKey, metaKey, wheelDelta } = e.e as WheelEvent & { wheelDelta: number }
  e.e.preventDefault()
  e.e.stopPropagation()

  if (ctrlKey || metaKey) {
    if (wheelDelta > 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }
}

const initCanvas = () => {
  if (document.querySelector(`#${id}`) === null) return

  const el = instance?.proxy?.$el
  container = new Canvas(id, {
    width: el.clientWidth || 864,
    height: el.clientHeight || 688,
    uniScaleKey: null,
  })

  const customControls = InteractiveFabricObject.createControls()
  customControls.controls.mt.visible = false
  customControls.controls.mb.visible = false
  customControls.controls.mr.visible = false
  customControls.controls.ml.visible = false
  customControls.controls.mtr = rotateControl
  // customControls.controls.bgControl = functionalBackgroundControl;
  // customControls.controls.resetControl = resetControl;
  // customControls.controls.deleteControl = deleteControl;
  // customControls.controls.flipControl = flipControl;

  InteractiveFabricObject.ownDefaults = {
    ...InteractiveFabricObject.ownDefaults,
    transparentCorners: false,
    cornerColor: '#BDDCFF',
    cornerStrokeColor: '#0F5FFF',
    borderColor: '#0F5FFF',
    borderScaleFactor: 1.5,
    cornerSize: 10,
    padding: 10,
    controls: customControls.controls,
  }

  //container.on('mouse:wheel', onWheel);
  container.on('mouse:down', onMouseDown)
  container.on('mouse:move', onMouseMove)
  container.on('mouse:up', onMouseUp)
  drawingFabricUtils.init(container)

  // drawingFabricUtils.useTooltipText();
}

const calcCanvasCenter = (isInitLoad = true) => {
  const el = container.elements.container
  const viewportWidth = el.clientWidth
  const viewportHeight = el.clientHeight
  container.width = bgImg.width
  container.height = bgImg.height
  let scale = Math.min(viewportWidth / container.width, viewportHeight / container.height)

  if (props.toolLayout === 'Bottom') {
    scale *= 0.84
  }

  const translateX = (viewportWidth - container.width * scale) / 2
  const translateY = (viewportHeight - container.height * scale) / 2 - 40

  state.modelInit = scale
  isInitCanvasSize.value = false

  if (isInitLoad) {
    state.lastTransformData.translateX = translateX
    state.lastTransformData.translateY = translateY
    state.lastTransformData.scale = scale
    container.viewportTransform = [scale, 0, 0, scale, translateX, translateY]
  }
  console.log('calcCanvasCenter', scale, translateX, translateY)

  return {
    scale,
    translateX,
    translateY,
  }
}

const initBgImage = async () => {
  console.log('initBgImage', props.bgImageUrl)
  bgImg = await FabricImage.fromURL(
    props.bgImageUrl,
    { crossOrigin: 'null' },
    {
      key: 'bgImage',
      hasControls: false,
      selectable: false,
    },
  )
  if (!container) return

  const isInitLoad = !container.backgroundImage
  container.backgroundImage = bgImg
  calcCanvasCenter(isInitLoad)

  const el = instance?.proxy?.$el
  if (el.clientWidth <= 0) {
    isInitCanvasSize.value = true
  }

  console.log('initBgImage', container.width, container.height)
  const clipPath = new Rect({
    left: 0,
    top: 0,
    width: container.width,
    height: container.height,
    absolutePositioned: true,
  })
  container.clipPath = clipPath
  drawingFabricUtils.resizeCanvas(el)
}

const refreshProductImage = async () => {
  let img: FabricObject
  let initSize
  const productImagePosition = props.imagePosition.product
  console.log('canvas refreshProductImage', productImagePosition)
  if (productImagePosition && productImagePosition !== '{}') {
    img = await drawingFabricUtils.formCustomizeJson(productImagePosition)
  } else {
    if (productStore.getSize) {
      console.log('productStore.getSize', productStore.getSize)
      const { width, height, code } = productStore.getSize
      initSize = {
        width,
        height,
        code
      }
    }
    img = await drawingFabricUtils.loaderImage({
      url: props.productImageUrl,
      key: 'product',
      calcLeft: (viewportWidth, imgWidth) => (viewportWidth - imgWidth) / 2,
      calcTop: (viewportHeight, imgHeight) => (viewportHeight - imgHeight) / 2,
      initSize
    })
  }

  container?.discardActiveObject()
  if (!productImg || drawingFabricUtils.checkIfImageDeleted(productImg)) {
    productImg = img as FabricImage
    productImg.on('mouseup', (args) => {
      if (args.isClick) return

      const json = drawingFabricUtils.toCustomizeJson(args.target)
      emits('changePosition', args.target['key'], json, args.target)
    })
    // await productImg.setSrc(props.productImageUrl, { crossOrigin: 'anonymous' });
    console.log('productImg', productImg)
    container.add(productImg)
  } else if (pageStore.activeTab === ACTIVE_TAB_NAME.FixedSceneBuild) {
    await productImg.setSrc(props.productImageUrl, { crossOrigin: 'anonymous' })
    try {
      const { left, top } = JSON.parse(productImagePosition)
      console.log(left, top)
      const tempImage = drawingFabricUtils.setResetParams(productImg, {
        calcLeft: left,
        calcTop: top,
      })
      console.log('tempImage', tempImage)

      console.log('img', img.width, img.height)
      console.log('productImg', productImg.width, productImg.height)

      const scale = img.height / productImg.height
      // const top = tempImage.resetParams.top + (img.height - productImg.height) * scale

      console.log('scale', scale)
      console.log('left', left)
      console.log('top', top)
      productImg.set({
        left: left,
        top: top,
        scale: scale,
        scaleX: scale,
        scaleY: scale,
        width: tempImage.resetParams.width,
        height: tempImage.resetParams.height,
      })
    } catch (e) {
      console.log(e)
    }
    container.add(productImg)
  } else {
    await productImg.setSrc(props.productImageUrl, { crossOrigin: 'anonymous' })
    container.add(productImg)
  }
  container.setActiveObject(productImg)
  const json = drawingFabricUtils.toCustomizeJson(productImg)
  emits('changePosition', img.key, json, productImg)
  container.renderAll()
}

const refreshCharacterImage = async () => {
  let img: FabricObject

  const characterImagePosition = props.imagePosition.character
  if (characterImagePosition && characterImagePosition !== '{}') {
    img = await drawingFabricUtils.formCustomizeJson(characterImagePosition)
  } else {
    img = await drawingFabricUtils.loaderImage({
      url: props.characterImageUrl,
      key: 'character',
      calcLeft: (viewportWidth, imgWidth) => (viewportWidth - imgWidth) / 2,
      calcTop: (viewportHeight, imgHeight) => (viewportHeight - imgHeight) / 2 + 150,
    })
  }
  container?.discardActiveObject()
  if (!characterImg || drawingFabricUtils.checkIfImageDeleted(characterImg)) {
    characterImg = img as FabricImage
    characterImg.on('mouseup', (args) => {
      if (args.isClick) return

      const json = drawingFabricUtils.toCustomizeJson(args.target)
      emits('changePosition', args.target['key'], json, args.target)
    })
    container.add(characterImg)
  } else {
    await characterImg.setSrc(props.characterImageUrl, { crossOrigin: 'anonymous' })
    const tempImage = drawingFabricUtils.setResetParams(characterImg, {
      calcLeft: (viewportWidth, imgWidth) => (viewportWidth - imgWidth) / 2,
      calcTop: (viewportHeight, imgHeight) => (viewportHeight - imgHeight) / 2 + 150,
    })
    characterImg.set('resetParams', tempImage.resetParams)
    container.setActiveObject(characterImg)
  }
  const json = drawingFabricUtils.toCustomizeJson(characterImg)
  emits('changePosition', img.key, json, characterImg)

  container.renderAll()
}

watchImmediate(
  () => props.bgImageUrl,
  async (val) => {
    console.log('canvas bgImageUrl', val)
    if (val) {
      container?.discardActiveObject() // 取消当前选中的对象
      await initBgImage()
      if (props.productImageUrl) {
        // @TODO: 强制修改位置
        await refreshProductImage()
      }
      container?.renderAll()
    }
  },
)

watchImmediate(
  () => props.productImageUrl,
  (val) => {
    console.log('canvas productImageUrl', props.productImageUrl)
    console.log('canvas props.bgImageUrl', props.bgImageUrl)

    if (!props.productImageUrl) return
    // if (!props.bgImageUrl) return;

    refreshProductImage()
  },
)

watchImmediate(
  () => props.characterImageUrl,
  () => {
    if (!props.characterImageUrl) return

    refreshCharacterImage()
  },
)

watchThrottled(
  visibility,
  () => {
    if (!visibility.value) return
    else if (!container) return
    else if (!bgImg) return

    const el = instance?.proxy?.$el
    drawingFabricUtils.resizeCanvas(el)

    if (isInitCanvasSize.value) {
      calcCanvasCenter()
    }
  },
  { throttle: 50 },
)

watch(
  () => state.lastTransformData.scale,
  () => {
    const { scale } = state.lastTransformData
    model.value = Math.round((scale * 10000) / 100)
  },
)

watch(
  () => props.imagePosition,
  async (val) => {
    console.log('props.imagePosition', val)
    container?.discardActiveObject()

    for (const key in props.imagePosition) {
      const imageObjects = container.getObjects('image') as FabricImage[]
      const image = imageObjects.find((x) => x.key === key)

      const json = props.imagePosition[key]
      if ((!json || json === '{}') && !image) continue
      else if ((!json || json === '{}') && image) {
        container.remove(image)
        container.renderAll()
        emits('delete', image.key, true)
        return
      }

      const history = await drawingFabricUtils.formCustomizeJson<FabricImage>(json)

      if (!image) {
        continue
      }

      if (history.getSrc() !== image.getSrc()) {
        await image.setSrc(history.getSrc())
      }

      image.rotate(history.angle)
      image.left = history.left
      image.top = history.top
      image.width = history.width
      image.height = history.height
      image.flipX = history.flipX
      image.flipY = history.flipY
      image.scale(history.scaleX)
      image.setXY(history.getXY())
      image.setCoords()
    }

    container.renderAll()
  },
)

onKeyStroke(['Backspace', 'Delete'], (_) => {
  const actives = container.getActiveObjects()
  actives.forEach((obj) => {
    container.remove(obj)
    if ('key' in obj) {
      emits('delete', obj.key)
    }
  })
})

onMounted(() => {
  initCanvas()

  useEventListener(window, 'resize', () => {
    const el = instance?.proxy?.$el
    drawingFabricUtils.resizeCanvas(el)
  })
})

onActivated(() => {
  if (container) return

  initCanvas()
  initBgImage()
})

defineExpose({
  zoomIn,
  zoomOut,
  setScale,
  asFile: () => drawingFabricUtils.asFile(),
})
</script>
