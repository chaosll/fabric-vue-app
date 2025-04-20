<template>
  <div ref="refCanvasContainerDiv" class="h-full w-full">
    <div class="draw flex">
      <div class="draw-type flex">
        <div class="rect p-2 cursor-pointer" @click="()=>{
          // 点击矩形按钮，激活矩形绘制模式
          isDrawingRect = true,
          // 为画布实例绑定鼠标事件监听器，用于捕获绘制过程中的鼠标动作
          // 这里重新绑定是为了确保当前模式下能正确处理这些事件
          container.on('mouse:down',onMouseDown)
          container.on('mouse:move',onMouseMove)
          container.on('mouse:up',onMouseUp)
        }">矩形</div>
        <div class="brush p-2 cursor-pointer bg-blue-500" @click="activePath">笔刷</div>
      </div>
      <div>
      </div>
      <div :v-show="true" class="p-2 cursor-pointer">调整笔刷</div>
      <div class="p-2 cursor-pointer">clear</div>
    </div>
    <canvas :id="id"></canvas>
    <md-tooltip :visible="tooltipInstance.visible" :content="tooltipInstance.content" placement="bottom" trigger="click"
      virtual-triggering popper-class="customize-tooltip" :virtualRef="tooltipInstance.trigger" />
  </div>
</template>

<script setup lang="ts">
// 导入 Fabric.js 相关的类和工具
import {
  Canvas, // 画布类
  Color, // 颜色类
  Control, // 对象控制点类
  FabricImage, // 图片对象类
  FabricObject, // 基础对象类
  InteractiveFabricObject, // 可交互对象类
  Point, // 点类
  Rect, // 矩形类
  TPointerEventInfo, // 鼠标事件信息类型
  controlsUtils, // Fabric.js 内置的控制点工具函数
  Path // 路径类，用于笔刷绘制
} from 'fabric';
// 导入 Vue 相关的 Composition API
import { useId, ref, reactive, getCurrentInstance, watchImmediate, watchThrottled, watch, onMounted, onActivated, defineModel, defineProps, withDefaults, defineEmits, defineExpose, nextTick } from 'vue';
// 导入 VueUse 相关的工具函数
import { useEventListener, useElementVisibility, onKeyStroke } from '@vueuse/core';
// 导入 SVG 图标，用于自定义控制点
import DELETE from '~/assets/svgs/editor/ai-delete.svg';
import FLIP from '~/assets/svgs/editor/ai-flip.svg';
import RESET from '~/assets/svgs/editor/ai-reset.svg';
import ROTATE_TIP from '~/assets/svgs/editor/ai-rotate-tip.svg'; // 旋转时的提示图标
import ROTATE from '~/assets/svgs/editor/ai-rotate.svg'; // 默认旋转图标
// 导入 Store 类型和实例
import { IAiDrawingStore } from '~/store/aiDrawingStore';
import { DrawingFabricUtils } from '.'; // 自定义的 Fabric.js 工具类
import { useProductStore } from '../../../store/productStore'
// import { create } from 'domain'; // 这行导入是多余的，可以删除

// 定义组件的 Props 类型
type GrabbingBoxProps = {
  /** 工具栏位置，目前代码中主要影响画布计算 */
  toolLayout?: 'Top' | 'Bottom';
  /** scale最大百分比 */
  maxScale?: number;
  /** scale最小百分比 */
  minScale?: number;
  /** 初始化比例 */
  initScale?: number | 'auto';
  /** 点击缩放按钮时的步长 */
  scaleStep?: number;
  /** 背景图 URL */
  bgImageUrl?: string;
  /** 产品图 URL */
  productImageUrl?: string;
  /** 人物图 URL */
  characterImageUrl?: string;
  /** (产品 || 人物) 图片的位置信息，通常是 Fabric 对象toJSON后的字符串 */
  imagePosition?: IAiDrawingStore['imagePosition']['value'];
};

// 定义一个双向绑定的 model，用于同步缩放比例（百分比）
const model = defineModel<number>({ default: 10 });
// 定义组件的 Props，并设置默认值
const props = withDefaults(defineProps<GrabbingBoxProps>(), {
  toolLayout: 'Bottom',
  maxScale: 400,
  minScale: 10,
  initScale: 'auto',
  scaleStep: 6,
});
// 定义组件的 Emits
const emits = defineEmits(['delete', 'changePosition']);

// 获取当前组件实例，用于访问 DOM 元素等
const instance = getCurrentInstance();
// 获取画布容器 div 的引用
const refCanvasContainerDiv = ref<HTMLElement>();
// 监测画布容器 div 的可见性
const visibility = useElementVisibility(refCanvasContainerDiv);
// 生成唯一的 canvas id
const id = useId();
// 标记画布尺寸是否需要初始化计算
const isInitCanvasSize = ref(true);
// 创建自定义的 Fabric.js 工具类实例
const drawingFabricUtils = new DrawingFabricUtils();

// 用于管理 tooltip 的响应式状态
const tooltipInstance = reactive({
  visible: false, // tooltip 是否可见
  content: '', // tooltip 显示的内容
  position: { // tooltip 位置的 DOMRect 格式数据
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  // 虚拟触发元素，用于将 tooltip 定位到指定位置
  trigger: {
    getBoundingClientRect() {
      return tooltipInstance.position as DOMRect;
    },
  },
});

// Fabric.js 相关的实例变量
let container: Canvas; // Fabric.js 画布实例
let bgImg: FabricImage; // 背景图 Fabric 对象
let productImg: FabricImage; // 产品图 Fabric 对象
let characterImg: FabricImage; // 人物图 Fabric 对象

const controlSize = 24; // 控制可点击区域大小，用于自定义控制点

// 获取产品 Store 实例
const productStore = useProductStore()

// 管理画布视图状态（缩放、平移）和绘制状态
const state = reactive({
  lastTransformData: { // 上一次的视图变换数据
    scale: 1, // 缩放比例
    translateX: 0, // X轴平移量
    translateY: 0, // Y轴平移量
  },
  lastPosition: { // 上一次鼠标或触摸点位置
    x: null as number | null,
    y: null as number | null,
    distance: 0, // 两指触点之间的距离 (多点触控用，当前代码主要处理单点)
  },
  readyToDrag: false, // 是否准备好拖动画布
  scaleTranslateProportion: [0, 0], // 缩放和平移的比例 (未使用)
  modelInit: 0, // 模型初始化比例 (用于同步到外部 model)
});

// --- 自定义 Fabric.js 控制点定义 ---

// 旋转控制点
const rotateControl = (() => {
  // 加载旋转图标
  const rotateIcon = new Image();
  rotateIcon.crossOrigin = 'anonymous'; // 允许跨域加载图片
  rotateIcon.src = ROTATE;

  // 创建新的 Control 实例
  return new Control({
    x: 0, // 控制点相对于对象边界框中心的X坐标 (0表示中心)
    y: 0.5, // 控制点相对于对象边界框中心的Y坐标 (0.5表示底部中心)
    offsetY: 26, // Y轴偏移量，将控制点向下移动
    cursorStyle: 'pointer', // 鼠标悬停时的光标样式
    actionHandler: controlsUtils.rotationWithSnapping, // 控制点的行为：使用内置的带吸附旋转功能
    actionName: 'rotate', // 行为名称
    sizeX: controlSize, // 控制点可点击区域宽度
    sizeY: controlSize, // 控制点可点击区域高度
    // 鼠标按下时的处理函数
    mouseDownHandler: function (_eventData, _transform) {
      // 鼠标按下旋转控制点时，隐藏其他控制点
      deleteControl.visible = false;
      resetControl.visible = false;
      flipControl.visible = false;
      functionalBackgroundControl.visible = false;
      // 更换旋转图标为提示图标
      rotateIcon.onload = () => container.requestRenderAll(); // 确保图片加载完成后重新渲染
      rotateIcon.src = ROTATE_TIP;
      // 显示 tooltip
      tooltipInstance.visible = true;
    },
    // 鼠标释放时的处理函数
    mouseUpHandler: function (_eventData) {
      // 鼠标释放后，恢复显示其他控制点
      deleteControl.visible = true;
      resetControl.visible = true;
      flipControl.visible = true;
      functionalBackgroundControl.visible = true;
      // 恢复默认旋转图标
      rotateIcon.src = ROTATE;
      // 隐藏 tooltip
      tooltipInstance.visible = false;
    },
    // 控制点渲染函数，定义控制点的外观
    render: function (ctx, left, top, _styleOverride, _fabricObject) {
      const size = 24; // 图标大小
      ctx.save(); // 保存当前canvas状态
      ctx.translate(left, top); // 移动到控制点位置
      // 绘制旋转图标
      ctx.drawImage(rotateIcon, -size / 2, -size / 2, size, size);
      ctx.restore(); // 恢复之前保存的canvas状态

      // 计算并更新 tooltip 显示的角度
      let angle = _fabricObject.angle % 360; // 确保角度在 0 到 359 之间
      if (angle > 180) {
        angle = angle - 360;
      }
      tooltipInstance.content = angle.toFixed(0) + '°';
      // 计算 tooltip 的位置，使其跟随旋转控制点
      tooltipInstance.position = DOMRect.fromRect({
        width: 0,
        height: 0,
        x: container._offset.left + left, // canvas相对于页面左上角的偏移 + 控制点在canvas内的left坐标
        y: container._offset.top + top + 10, // canvas相对于页面左上角的偏移 + 控制点在canvas内的top坐标 + 额外的偏移量
      });
    },
  });
})();

// 功能控制点背景，用于包裹删除、重置、翻转图标，给它们提供一个视觉背景
const functionalBackgroundControl = new Control({
  x: 0,
  y: -0.5,
  offsetX: -48, // X轴偏移量
  offsetY: -44, // Y轴偏移量
  // 渲染函数，绘制背景矩形
  render: function (ctx, left, top, _styleOverride, _fabricObject) {
    ctx.save();
    ctx.translate(left, top);
    // 根据对象角度旋转背景，使其始终与对象对齐
    ctx.rotate((_fabricObject.angle * Math.PI) / 180);
    ctx.fillStyle = 'rgba(255, 255, 255)'; // 背景颜色
    ctx.beginPath();
    ctx.roundRect(0, 0, 96, 32, 70); // 绘制圆角矩形
    ctx.fill();
    ctx.restore();
  },
});

// 重置控制点
const resetControl = (() => {
  // 加载重置图标
  const resetIcon = new Image();
  resetIcon.crossOrigin = 'anonymous';
  resetIcon.src = RESET;
  // resetIcon.style = 'padding: 10px;'; // 这行代码在canvas渲染中无效

  // 创建新的 Control 实例
  return new Control({
    x: 0,
    y: -0.5,
    offsetX: -28, // X轴偏移量，相对于 functionalBackgroundControl 的中心
    offsetY: -28, // Y轴偏移量，相对于 functionalBackgroundControl 的顶部中心
    cursorStyle: 'pointer',
    // actionHandler: controlsUtils.rotationWithSnapping, // 重置不是旋转，此处应移除或改为其他handler
    actionName: 'Reset', // 行为名称
    sizeX: controlSize,
    sizeY: controlSize,
    // 鼠标释放时的处理函数
    mouseUpHandler: function (_eventData, _transform) {
      const canvas = _transform.target.canvas; // 获取当前对象所在的画布
      const target: FabricObject = _transform.target; // 获取当前操作的目标对象
      if (!target.resetParams) return; // 如果对象没有 resetParams 属性，则不执行重置

      // 重置对象的各种属性到 resetParams 中存储的初始值
      target.rotate(0);
      target.left = target.resetParams.left;
      target.top = target.resetParams.top;
      target.width = target.resetParams.width;
      target.height = target.resetParams.height;
      target.flipX = false;
      target.flipY = false;
      target.scale(target.resetParams.scale);
      // 请求画布重新渲染以更新显示
      canvas.requestRenderAll();

      // 将重置后的对象状态转换为 JSON 格式，并触发 changePosition 事件通知父组件
      const json = drawingFabricUtils.toCustomizeJson(target);
      emits('changePosition', target.key, json, characterImg); // 注意这里的 characterImg 参数似乎是错误的，应该是 target
    },
    // 渲染函数，绘制重置图标
    render: function (ctx, left, top, _styleOverride, _fabricObject) {
      const size = 16; // 图标大小
      ctx.save();
      ctx.translate(left, top);
      ctx.drawImage(resetIcon, -size / 2, -size / 2, size, size);
      ctx.restore();
    },
  });
})();

// 翻转控制点
const flipControl = (() => {
  // 加载翻转图标
  const flipIcon = new Image();
  flipIcon.crossOrigin = 'anonymous';
  flipIcon.src = FLIP;

  // 创建新的 Control 实例
  return new Control({
    x: 0,
    y: -0.5,
    offsetX: 0, // X轴偏移量，相对于 functionalBackgroundControl 的中心
    offsetY: -28, // Y轴偏移量，相对于 functionalBackgroundControl 的顶部中心
    cursorStyle: 'pointer',
    // actionHandler: controlsUtils.rotationWithSnapping, // 翻转不是旋转，此处应移除或改为其他handler
    actionName: 'Flip', // 行为名称
    sizeX: controlSize,
    sizeY: controlSize,
    // 鼠标释放时的处理函数
    mouseUpHandler: function (_eventData, transform) {
      const target: FabricObject = transform.target; // 获取当前操作的目标对象
      target.flipX = !target.flipX; // 切换对象的水平翻转状态
      target.canvas.requestRenderAll(); // 请求画布重新渲染

      // 将翻转后的对象状态转换为 JSON 格式，并触发 changePosition 事件通知父组件
      const json = drawingFabricUtils.toCustomizeJson(target);
      emits('changePosition', target.key, json, characterImg); // 注意这里的 characterImg 参数似乎是错误的，应该是 target
    },
    // 渲染函数，绘制翻转图标
    render: function (ctx, left, top, _styleOverride, _fabricObject) {
      const size = 16; // 图标大小
      ctx.save();
      ctx.translate(left, top);
      ctx.drawImage(flipIcon, -size / 2, -size / 2, size, size);
      ctx.restore();
    },
  });
})();

// 删除控制点
const deleteControl = (() => {
  // 加载删除图标
  const deleteIcon = new Image();
  deleteIcon.crossOrigin = 'anonymous';
  deleteIcon.src = DELETE;

  // 创建新的 Control 实例
  return new Control({
    x: 0,
    y: -0.5,
    offsetX: 28, // X轴偏移量，相对于 functionalBackgroundControl 的中心
    offsetY: -28, // Y轴偏移量，相对于 functionalBackgroundControl 的顶部中心
    cursorStyle: 'pointer',
    // actionHandler: controlsUtils.rotationWithSnapping, // 删除不是旋转，此处应移除或改为其他handler
    actionName: 'Delete', // 行为名称
    sizeX: controlSize,
    sizeY: controlSize,
    // 鼠标释放时的处理函数
    mouseUpHandler: function (_eventData, transform) {
      const canvas = transform.target.canvas; // 获取当前对象所在的画布
      // 从画布中移除目标对象
      canvas.remove(transform.target);
      // 请求画布重新渲染
      canvas.requestRenderAll();
      // 触发 delete 事件通知父组件，并传递被删除对象的 key
      emits('delete', transform.target.key); // 假设对象有 key 属性
    },
    // 渲染函数，绘制删除图标
    render: function (ctx, left, top, _styleOverride, _fabricObject) {
      const size = 16; // 图标大小
      ctx.save();
      ctx.translate(left, top);
      ctx.drawImage(deleteIcon, -size / 2, -size / 2, size, size);
      ctx.restore();
    },
  });
})();

// --- 视图变换 (缩放和平移) 逻辑 ---

// 确保缩放比例在允许的范围内
const ensureScaleInRange = (scale: number) => {
  if (scale * 100 > props.maxScale) {
    scale = props.maxScale / 100;
  } else if (scale * 100 < props.minScale) {
    scale = props.minScale / 100;
  }
  return scale;
};

// --- 绘制逻辑 (矩形和笔刷) ---

let isDrawingRect: Boolean = false // 是否正在绘制矩形
const startPoint: any = {} // 绘制起始点坐标
let drawType: 'rect' | 'brush' = "rect" // 当前绘制类型
let rect: Rect | null // 正在绘制的矩形对象

// 鼠标按下事件处理函数，用于处理画布平移或开始绘制
const onMouseDown = function (e: TPointerEventInfo<MouseEvent>) {
  // 如果点击到了 Fabric 对象，则不处理画布平移或绘制逻辑
  if (e.target) return;

  // 如果是笔刷绘制模式
  if (drawType === 'brush') {
    isPathDrawing = true // 标记正在绘制路径
    const startX = e.scenePoint.x // 获取起始点在场景坐标系中的 X 坐标
    const startY = e.scenePoint.y // 获取起始点在场景坐标系中的 Y 坐标
    currentPath.push(`M ${startX} ${startY}`) // 将起始点添加到路径命令数组中 (SVG path format)
  }

  // 判断是绘制还是移动画布 (平移逻辑)
  if (!isDrawingRect) {
    const event = e.e; // 获取原始鼠标事件
    // this.selection = false; // 在 mouse:down 时禁用选择，以便拖动画布
    state.readyToDrag = true; // 标记准备拖动画布
    state.lastPosition = { // 记录当前鼠标位置
      x: event.clientX,
      y: event.clientY,
      distance: 0,
    };
    // console.log('onMouseDown', state.lastPosition)
  } else {
    // 绘制矩形逻辑
    // console.log("e---------------------------",e)
    // console.log("isDrawingRect???????",isDrawingRect)
    // const {x:left, y:top} = e.scenePoint; // 获取点击位置在场景坐标系中的坐标

    // console.log("创建矩形")
    startPoint.x = e.scenePoint.x; // 记录矩形绘制的起始点 X 坐标
    startPoint.y = e.scenePoint.y // 记录矩形绘制的起始点 Y 坐标
    rect = new Rect({ // 创建一个新的矩形对象
      left: startPoint.x,
      top: startPoint.y,
      width: 0, // 初始宽度为 0
      height: 0, // 初始高度为 0
      fill: 'rgba(0,0,0,.5)', // 填充颜色
      stroke: 'rgba(0,0,0,.5)', // 描边颜色
      strokeWidth: 1, // 描边宽度
      selectable: true, // 允许选中
      hasControls: true, // 显示控制点（默认值）
      hasBorders: false, // 不显示边框
      hasRotatingPoint: false // 不显示旋转控制点
    });
    container.add(rect) // 将矩形添加到画布中
    container.renderAll() // 请求画布重新渲染
  }
};

// 鼠标移动事件处理函数，用于处理画布平移或绘制过程
const onMouseMove = (e: TPointerEventInfo<MouseEvent>) => {
  const event = e.e; // 获取原始鼠标事件

  // 画布平移逻辑
  if (state.readyToDrag) {
    event.stopPropagation();
    event.preventDefault(); // 阻止默认事件，避免拖动页面
    const { clientX, clientY } = event; // 获取当前鼠标位置
    const { x, y } = state.lastPosition; // 获取上一次鼠标位置
    const [deltaX, deltaY] = [clientX - x, clientY - y]; // 计算鼠标位移

    move({ deltaX, deltaY }); // 调用 move 函数更新画布平移

    state.lastPosition = { // 更新上一次鼠标位置
      x: clientX,
      y: clientY,
      distance: 0,
    };
  }

  // 笔刷绘制逻辑 (如果当前是笔刷模式)
  if (drawType === 'brush') {
    const pointer = e.scenePoint // 获取当前鼠标位置在场景坐标系中的坐标
    currentPath.push(`L ${pointer.x} ${pointer.y}`); // 将当前点添加到路径命令数组中 (使用 L 命令连接)

    // 实时更新路径对象
    if (pathObject) {
      container.remove(pathObject); // 如果存在之前的路径对象，先移除
    }

    pathObject = new Path(currentPath.join(' '), { // 根据路径命令数组创建新的 Path 对象
      stroke: '#000', // 描边颜色
      strokeWidth: 50, // 描边宽度
      fill: null, // 不填充
      strokeLineCap: 'round', // 线条端点样式为圆角
      strokeLineJoin: 'round' // 线条连接处样式为圆角
    });

    container.add(pathObject); // 将新的路径对象添加到画布中
    return // 笔刷绘制模式下，不执行后续的矩形绘制逻辑
  }

  // 矩形绘制逻辑 (如果当前是矩形模式且正在绘制)
  if (!isDrawingRect || !rect) return // 如果不是矩形绘制模式或矩形对象不存在，则返回

  // 更新正在绘制的矩形的尺寸和位置
  const width = e.scenePoint.x - startPoint.x // 计算当前鼠标位置与起始点之间的水平距离
  const height = e.scenePoint.y - startPoint.y // 计算当前鼠标位置与起始点之间的垂直距离
  rect.set({
    width: Math.abs(width), // 矩形宽度取绝对值
    height: Math.abs(height), // 矩形高度取绝对值
    // 计算矩形左上角位置，确保绘制方向无论如何都能正确显示
    left: width > 0 ? startPoint.x : startPoint.x + width,
    top: height > 0 ? startPoint.y : startPoint.y + height
  })
  container.renderAll() // 请求画布重新渲染以显示更新后的矩形
  // TODO
};

// 鼠标释放事件处理函数，用于结束画布平移或绘制
const onMouseUp = function () {
  // this.selection = true; // 鼠标释放后恢复选择功能
  state.readyToDrag = false; // 标记结束拖动画布

  // 矩形绘制结束逻辑
  if (!isDrawingRect) return // 如果不是矩形绘制模式，则返回
  // console.log("mouseUp 停止------------------",isDrawingRect)
  isDrawingRect = false; // 标记结束矩形绘制
  rect = null // 清空矩形对象引用
  startPoint.x = null // 清空起始点坐标
  startPoint.y = null

  // 笔刷绘制结束逻辑
  isPathDrawing = false; // 标记结束路径绘制
  pathObject = null; // 清空路径对象引用
};

// --- 笔刷绘制逻辑 (Alternative using Path) ---
// const brushColor = ref<string>('rgba(0,0,0,.8)'); // 笔刷颜色 (未使用)

// function activeBrush() { // 激活 Fabric 内置的自由绘制模式 (当前代码未使用此函数)
//   // if(!container) return
//   // // container.off('mouse:down',onMouseDown) // 可以在这里移除自定义事件监听
//   // // container.off('mouse:move',onMouseMove)
//   // // container.off('mouse:up',onMouseUp)

//   // isDrawingRect = false // 禁用矩形绘制
//   // container.isDrawingMode = true // 启用 Fabric 内置的自由绘制模式
//   // if (container.freeDrawingBrush){ // 设置笔刷属性
//   //  container.freeDrawingBrush.color = "f0f0f0"
//   //  container.freeDrawingBrush.width = 5
//   //  console.log('freeDrawingBrush------------',container.freeDrawingBrush)
//   // }
// }

// 使用 Path 实现自由绘制的状态和函数
let isPathDrawing: Boolean = false // 是否正在绘制路径 (与 isDrawingRect 类似)
let currentPath: any = []; // 存储路径命令的数组 (SVG path format)
let pathObject: any = null; // 当前正在绘制的 Path 对象
// 激活 Path 绘制模式
function activePath() {
  drawType = 'brush' // 设置绘制类型为 'brush'
  // 注意：这里没有移除矩形绘制的事件监听，可能导致冲突，需要在切换模式时处理
}

// --- 画布视图平移逻辑 ---

// 根据位移量更新画布平移
const move = (options: { deltaX: any; deltaY: any }) => {
  const { translateX, translateY } = state.lastTransformData; // 获取当前平移量
  const { deltaX, deltaY } = options; // 获取计算出的位移量
  const [x, y] = [translateX + deltaX, translateY + deltaY]; // 计算新的平移量
  state.lastTransformData = { // 更新平移状态
    ...state.lastTransformData,
    translateX: x,
    translateY: y,
  };
  setMatrix(); // 应用新的视图变换矩阵
};

// 应用当前的视图变换矩阵 (缩放和平移) 到画布
const setMatrix = () => {
  const { scale, translateX, translateY } = state.lastTransformData; // 获取当前缩放和平移状态
  const safeScale = ensureScaleInRange(scale); // 确保缩放比例在范围内
  // 设置画布的 viewportTransform 矩阵 [scaleX, skewX, skewY, scaleY, translateX, translateY]
  container.viewportTransform = [safeScale, 0, 0, safeScale, translateX, translateY];
  container.setViewportTransform(container.viewportTransform); // 应用视图变换
  state.lastTransformData.scale = safeScale; // 更新状态中的实际缩放比例
};

// --- 画布视图缩放逻辑 ---

// 放大画布
const zoomIn = () => {
  const { scale } = state.lastTransformData; // 获取当前缩放比例
  const newScale = scale * 100 + props.scaleStep; // 计算新的缩放百分比
  setScale(newScale); // 应用新的缩放
};

// 缩小画布
const zoomOut = () => {
  const { scale } = state.lastTransformData; // 获取当前缩放比例
  const newScale = scale * 100 - props.scaleStep; // 计算新的缩放百分比
  setScale(newScale); // 应用新的缩放
};

// 设置画布的缩放比例
const setScale = (scale: number) => {
  // 将百分比缩放转换为比例，并确保不小于初始化比例 (如果 scale === 0 表示回到初始比例)
  const newScale = scale === 0 ? state.modelInit : scale / 100;
  // 确保缩放比例在范围内 (同时考虑 props.maxScale)
  const safeScale = ensureScaleInRange(Math.min(newScale, props.maxScale / 100));
  state.lastTransformData.scale = safeScale; // 更新缩放状态
  const el = instance?.proxy?.$el; // 获取组件根 DOM 元素
  // 创建缩放中心点 (容器中心)
  const zoomPoint = new Point(el.clientWidth / 2, el.clientHeight / 2);
  // 以指定点为中心进行缩放
  container.zoomToPoint(zoomPoint, state.lastTransformData.scale);
  // 缩放后，平移量会改变，需要更新状态
  const viewportTransform = container.viewportTransform;
  state.lastTransformData.translateX = viewportTransform[4];
  state.lastTransformData.translateY = viewportTransform[5];
};

// 画布滚轮事件处理函数，用于滚轮缩放
const onWheel = (e: TPointerEventInfo<WheelEvent>) => {
  const { ctrlKey, metaKey, wheelDelta } = e.e as WheelEvent & { wheelDelta: number }; // 获取滚轮事件信息
  e.e.preventDefault(); // 阻止默认滚轮行为 (如滚动页面)
  e.e.stopPropagation(); // 阻止事件冒泡

  // 如果按下 Ctrl 键或 Meta 键 (Mac上的 Command 键)，则进行缩放
  if (ctrlKey || metaKey) {
    if (wheelDelta > 0) { // 滚轮向上滚动
      zoomIn();
    } else { // 滚轮向下滚动
      zoomOut();
    }
  }
};

// --- 画布和图像初始化 ---

// 初始化 Fabric.js 画布
const initCanvas = () => {
  // 检查 canvas 元素是否存在
  if (document.querySelector(`#${id}`) === null) return;

  const el = instance?.proxy?.$el; // 获取组件根 DOM 元素
  // 创建 Fabric.js Canvas 实例
  container = new Canvas(id, {
    width: el.clientWidth || 864, // 设置画布宽度，如果容器没有宽度，使用默认值
    height: el.clientHeight || 688, // 设置画布高度，如果容器没有高度，使用默认值
    uniScaleKey: null, // 禁用按 Shift 键等比例缩放
  });

  // 定义自定义控制点集合
  const customControls = InteractiveFabricObject.createControls(); // 获取默认控制点
  // 隐藏默认的中间控制点
  customControls.controls.mt.visible = false; // Middle Top
  customControls.controls.mb.visible = false; // Middle Bottom
  customControls.controls.mr.visible = false; // Middle Right
  customControls.controls.ml.visible = false; // Middle Left
  // 将自定义的旋转控制点替换默认的 mtr (Middle Top Right)
  customControls.controls.mtr = rotateControl;
  // TODO: 将自定义的背景、重置、删除、翻转控制点添加到控制点集合
  // customControls.controls.bgControl = functionalBackgroundControl;
  // customControls.controls.resetControl = resetControl;
  // customControls.controls.deleteControl = deleteControl;
  // customControls.controls.flipControl = flipControl;

  // 修改 Fabric.js 可交互对象的默认属性
  InteractiveFabricObject.ownDefaults = {
    ...InteractiveFabricObject.ownDefaults, // 保留其他默认属性
    transparentCorners: false, // 控制点背景是否透明
    cornerColor: '#BDDCFF', // 控制点颜色
    cornerStrokeColor: '#0F5FFF', // 控制点描边颜色
    borderColor: '#0F5FFF', // 边界框颜色
    borderScaleFactor: 1.5, // 边界框缩放因子
    cornerSize: 10, // 控制点大小
    padding: 10, // 边界框与对象之间的间距
    controls: customControls.controls, // 应用自定义控制点
  };

  // 绑定画布事件监听器
  // container.on('mouse:wheel', onWheel); // 滚轮事件，当前通过 VueUse 的 useEventListener 监听 window
  // 注意：这里的鼠标事件监听器会在每次调用 initCanvas 时重复绑定，可能导致问题。
  // 更好的做法是在 onMounted 绑定一次，在 onBeforeUnmount 移除。
  // 而且这里的 onMouseDown, onMouseMove, onMouseUp 已经被用于处理绘制和拖动画布，
  // 绑定到 container 上会捕获所有鼠标事件，需要内部逻辑区分。
  container.on('mouse:down', onMouseDown);
  container.on('mouse:move', onMouseMove);
  container.on('mouse:up', onMouseUp);

  // 初始化自定义 Fabric 工具类，传入画布实例
  drawingFabricUtils.init(container);
};

// 计算画布中心位置和合适的缩放比例
const calcCanvasCenter = (isInitLoad = true) => {
  const el = container.elements.container; // 获取 canvas 容器 DOM 元素
  const viewportWidth = el.clientWidth; // 获取容器宽度
  const viewportHeight = el.clientHeight; // 获取容器高度
  container.width = bgImg.width; // 将画布尺寸设置为背景图尺寸
  container.height = bgImg.height;
  // 计算使背景图完全可见并居中的缩放比例
  let scale = Math.min(viewportWidth / container.width, viewportHeight / container.height);

  // 如果工具栏在底部，调整缩放比例，为工具栏留出空间
  if (props.toolLayout === 'Bottom') {
    scale *= 0.84;
  }

  // 计算使背景图在容器中居中的平移量
  const translateX = (viewportWidth - container.width * scale) / 2;
  const translateY = (viewportHeight - container.height * scale) / 2;

  state.modelInit = scale; // 记录初始化比例
  isInitCanvasSize.value = false; // 标记画布尺寸已初始化

  // 如果是首次加载，应用计算出的缩放和平移
  if (isInitLoad) {
    state.lastTransformData.translateX = translateX;
    state.lastTransformData.translateY = translateY;
    state.lastTransformData.scale = scale;
    container.viewportTransform = [scale, 0, 0, scale, translateX, translateY]; // 设置视图变换矩阵
  }
  // console.log('calcCanvasCenter', scale, translateX, translateY)

  return { // 返回计算出的缩放和平移值
    scale,
    translateX,
    translateY,
  };
};

// 初始化背景图
const initBgImage = async () => {
  // console.log('initBgImage', props.bgImageUrl)
  // 从 URL 加载背景图
  bgImg = await FabricImage.fromURL(
    props.bgImageUrl,
    { crossOrigin: 'null' }, // 设置 crossOrigin 属性以避免跨域问题
    { // Fabric 对象属性
      key: 'bgImage', // 自定义属性，用于标识对象
      hasControls: false, // 不显示控制点
      selectable: false, // 不可选中
    },
  );
  if (!container) return; // 如果画布未初始化，则返回

  const isInitLoad = !container.backgroundImage; // 判断是否是首次加载背景图
  container.backgroundImage = bgImg; // 将加载的图片设置为画布的背景图
  calcCanvasCenter(isInitLoad); // 计算并应用画布中心位置和缩放

  const el = instance?.proxy?.$el; // 获取组件根 DOM 元素
  // 如果容器宽度小于等于 0，可能是因为容器还未渲染或隐藏，标记需要重新初始化尺寸
  if (el.clientWidth <= 0) {
    isInitCanvasSize.value = true;
  }

  // console.log('initBgImage', container.width, container.height)
  // 创建一个裁剪路径，用于将画布内容限制在背景图范围内
  const clipPath = new Rect({
    left: 0,
    top: 0,
    width: container.width,
    height: container.height,
    absolutePositioned: true, // 使裁剪路径相对于画布左上角定位
  });
  container.clipPath = clipPath; // 设置画布的裁剪路径
  drawingFabricUtils.resizeCanvas(el); // 根据容器尺寸调整画布大小
};

// 刷新或加载产品图
const refreshProductImage = async () => {
  let img: FabricObject; // 临时变量用于存储加载或解析的对象

  const productImagePosition = props.imagePosition.product; // 获取产品图的位置信息
  // console.log('canvas refreshProductImage', productImagePosition)

  // 如果存在位置信息 (且不是空字符串或 '{}')
  if (productImagePosition && productImagePosition !== '{}') {
    // 从 JSON 字符串解析 Fabric 对象
    img = await drawingFabricUtils.formCustomizeJson(productImagePosition);
  } else {
    // 如果没有位置信息，则首次加载图片并计算初始位置
    try {
      // 尝试解析位置信息，虽然上面已经判断，这里可能是为了兼容某种格式
      const { left, top } = JSON.parse(productImagePosition)

      img = await drawingFabricUtils.loaderImage({ // 使用自定义工具类加载图片并计算位置
        url: props.productImageUrl,
        key: 'product',
        calcLeft: left, // 使用解析出的 left
        calcTop: top, // 使用解析出的 top
      });
    } catch (e) {
      // 如果解析失败或其他原因，使用默认居中位置计算
      img = await drawingFabricUtils.loaderImage({
        url: props.productImageUrl,
        key: 'product',
        // 居中计算
        calcLeft: (viewportWidth, imgWidth) => (viewportWidth - imgWidth) / 2,
        calcTop: (viewportHeight, imgHeight) => (viewportHeight - imgHeight) / 2,
      });
      // console.log('getSize', productStore.getSize)
      // 如果产品 store 中有尺寸信息，根据尺寸调整图片大小
      if (productStore.getSize && productStore.getSize.width) {
        const width = productStore.getSize.width
        const scale = width / img.width // 计算缩放比例
        img.set({ // 设置图片宽度和按比例计算的高度
          width: width,
          height: img.height * scale
        })
      }
    }
  }

  container?.discardActiveObject(); // 取消当前选中的对象

  // 如果产品图对象不存在或已被删除
  if (!productImg || drawingFabricUtils.checkIfImageDeleted(productImg)) {
    productImg = img as FabricImage; // 将加载的对象赋值给 productImg
    // 为产品图对象绑定 mouseup 事件，用于在拖动/变换结束后更新位置信息
    productImg.on('mouseup', args => {
      if (args.isClick) return; // 如果是点击事件，忽略

      const json = drawingFabricUtils.toCustomizeJson(args.target); // 将当前状态转为 JSON
      emits('changePosition', args.target['key'], json, args.target); // 触发 changePosition 事件
    });
    // console.log('productImg', productImg)
    container.add(productImg); // 将产品图添加到画布
  } else {
    // 如果产品图对象已存在，则更新其图片源和状态
    await productImg.setSrc(props.productImageUrl, { crossOrigin: 'anonymous' }); // 更新图片源
    try {
      // 尝试使用解析出的位置信息更新产品图
      const { left, top } = JSON.parse(productImagePosition)
      // console.log(left, top)
      // 使用 setResetParams 计算重置参数 (虽然这里直接设置位置，但函数名可能误导)
      const tempImage = drawingFabricUtils.setResetParams(productImg, {
        calcLeft: left,
        calcTop: top,
      });
      // console.log('tempImage', tempImage);

      // console.log('img', img.width, img.height) // img 是新加载的图像，可能尺寸不同
      // console.log('productImg', productImg.width, productImg.height) // productImg 是画布上的旧对象

      // TODO: 这里的缩放计算和应用逻辑可能需要根据实际需求调整
      const scale = img.height / productImg.height // 根据高度计算缩放比例
      // const top = tempImage.resetParams.top + (img.height - productImg.height) * scale // 重新计算 top (此行被注释掉)

      // console.log('scale', scale)
      // console.log('left', left)
      // console.log('top', top)
      productImg.set({ // 设置产品图的位置、尺寸和缩放
        left: left,
        top: top,
        scale: scale,
        scaleX: scale,
        scaleY: scale,
        width: tempImage.resetParams.width, // 这里使用了 tempImage 的 resetParams.width，可能不是期望的行为
        height: tempImage.resetParams.height // 这里使用了 tempImage 的 resetParams.height，可能不是期望的行为
      })
    } catch (e) {
      // 如果解析位置信息失败，重新计算并设置 resetParams
      console.log(e)
      const tempImage = await drawingFabricUtils.recalculateResetParams(productImg, {
        calcLeft: (viewportWidth, imgWidth) => (viewportWidth - imgWidth) / 2,
        calcTop: (viewportHeight, imgHeight) => (viewportHeight - imgHeight) / 2,
      });
      productImg.set('resetParams', tempImage.resetParams); // 更新 resetParams
      // console.log('getSize', productStore.getSize)
      // 如果产品 store 中有尺寸信息，根据尺寸调整图片大小 (基于 resetParams 的尺寸)
      if (productStore.getSize) {
        const width = productStore.getSize.width
        const scale = width / tempImage.resetParams.width
        productImg.set({
          width: width,
          height: tempImage.resetParams.height * scale
        })
      }
    }
    container.add(productImg); // 重新将更新后的产品图添加到画布 (或者确保它已经在画布上)
  }
  // 将最终的产品图状态转换为 JSON 格式，并触发 changePosition 事件通知父组件
  const json = drawingFabricUtils.toCustomizeJson(productImg);
  emits('changePosition', img.key, json, productImg); // 注意这里的 img.key，应该是 productImg.key

  container.renderAll(); // 请求画布重新渲染
};

// 刷新或加载人物图 (逻辑与 refreshProductImage 类似)
const refreshCharacterImage = async () => {
  let img: FabricObject;

  const characterImagePosition = props.imagePosition.character;
  if (characterImagePosition && characterImagePosition !== '{}') {
    img = await drawingFabricUtils.formCustomizeJson(characterImagePosition);
  } else {
    img = await drawingFabricUtils.loaderImage({
      url: props.characterImageUrl,
      key: 'character',
      calcLeft: (viewportWidth, imgWidth) => (viewportWidth - imgWidth) / 2,
      calcTop: (viewportHeight, imgHeight) => (viewportHeight - imgHeight) / 2 + 150, // 人物图初始位置在中心偏下
    });
  }
  container?.discardActiveObject();
  if (!characterImg || drawingFabricUtils.checkIfImageDeleted(characterImg)) {
    characterImg = img as FabricImage;
    characterImg.on('mouseup', args => {
      if (args.isClick) return;

      const json = drawingFabricUtils.toCustomizeJson(args.target);
      emits('changePosition', args.target['key'], json, args.target);
    });
    container.add(characterImg);
  } else {
    await characterImg.setSrc(props.characterImageUrl, { crossOrigin: 'anonymous' });
    const tempImage = drawingFabricUtils.setResetParams(characterImg, {
      calcLeft: (viewportWidth, imgWidth) => (viewportWidth - imgWidth) / 2,
      calcTop: (viewportHeight, imgHeight) => (viewportHeight - imgHeight) / 2 + 150,
    });
    characterImg.set('resetParams', tempImage.resetParams);
    container.setActiveObject(characterImg); // 默认选中人物图
  }
  const json = drawingFabricUtils.toCustomizeJson(characterImg);
  emits('changePosition', img.key, json, characterImg); // 注意这里的 img.key，应该是 characterImg.key

  container.renderAll();
};

// --- Watchers ---

// 监听背景图 URL 变化，并初始化或更新背景图、产品图
watchImmediate( // 立即执行一次监听器
  () => props.bgImageUrl,
  async (val) => {
    // console.log('canvas bgImageUrl', val)
    if (val) {
      container?.discardActiveObject(); // 取消当前选中的对象
      await initBgImage(); // 初始化或更新背景图
      if (props.productImageUrl) {
        // @TODO: 强制修改位置 (这个注释可能意味着这里的逻辑需要调整)
        await refreshProductImage() // 更新产品图
      }
      container?.renderAll(); // 请求画布重新渲染
    }
  },
);

// 监听产品图 URL 变化，并刷新产品图
watchImmediate( // 立即执行一次监听器
  () => props.productImageUrl,
  (val) => {
    // console.log('canvas productImageUrl', val)

    if (!props.productImageUrl) return; // 如果产品图 URL 为空，则返回
    if (!props.bgImageUrl) return; // 如果背景图 URL 为空，则返回 (产品图依赖于背景图尺寸)

    refreshProductImage(); // 刷新产品图
  },
);

// 监听人物图 URL 变化，并刷新人物图
watchImmediate( // 立即执行一次监听器
  () => props.characterImageUrl,
  () => {
    if (!props.characterImageUrl) return; // 如果人物图 URL 为空，则返回

    refreshCharacterImage(); // 刷新人物图
  },
);

// 节流监听容器可见性，在可见且画布需要初始化尺寸时调整画布大小和位置
watchThrottled( // 使用节流，避免频繁触发
  visibility,
  () => {
    if (!visibility.value) return; // 如果容器不可见，则返回
    else if (!container) return; // 如果画布未初始化，则返回
    else if (!bgImg) return; // 如果背景图未加载，则返回 (画布尺寸依赖背景图)

    const el = instance?.proxy?.$el; // 获取组件根 DOM 元素
    drawingFabricUtils.resizeCanvas(el); // 根据容器尺寸调整画布大小

    if (isInitCanvasSize.value) { // 如果画布尺寸需要初始化计算
      calcCanvasCenter(); // 计算并应用画布中心位置和缩放
    }
  },
  { throttle: 50 }, // 节流延迟 50ms
);

// 监听画布缩放状态变化，并同步到外部 model
watch(
  () => state.lastTransformData.scale,
  () => {
    const { scale } = state.lastTransformData;
    // 将缩放比例转换为百分比 (保留两位小数) 并同步到 model
    model.value = Math.round((scale * 10000) / 100);
  },
);

// 监听外部传入的 imagePosition 变化，更新画布上的图片状态
watch(
  () => props.imagePosition,
  async (val) => {
    // console.log('props.imagePosition', val)
    container?.discardActiveObject(); // 取消当前选中的对象

    // 遍历 imagePosition 中的每个图片 (产品、人物等)
    for (const key in props.imagePosition) {
      // 查找画布中对应的图片对象
      const imageObjects = container.getObjects('image') as FabricImage[];
      const image = imageObjects.find(x => x.key === key);

      const json = props.imagePosition[key]; // 获取该图片的 JSON 位置信息
      // 如果位置信息为空且画布中没有该图片，则跳过
      if ((!json || json === '{}') && !image) continue;
      // 如果位置信息为空但画布中有该图片，则移除该图片并触发删除事件
      else if ((!json || json === '{}') && image) {
        container.remove(image);
        container.renderAll();
        emits('delete', image.key, true); // 触发删除事件 (第二个参数 true 可能表示静默删除?)
        return; // 返回，因为移除了对象，后面的逻辑可能不再适用
      }

      // 如果存在位置信息，从 JSON 解析出历史状态对象
      const history = await drawingFabricUtils.formCustomizeJson<FabricImage>(json);

      // 如果画布中没有对应的图片对象，则跳过 (理论上在前面的 refresh 函数中应该已经添加了)
      if (!image) {
        continue;
      }

      // 如果历史状态中的图片源与当前画布上的图片源不同，则更新图片源
      if (history.getSrc() !== image.getSrc()) {
        await image.setSrc(history.getSrc());
      }

      // 根据历史状态更新画布上图片对象的属性
      image.rotate(history.angle);
      image.left = history.left;
      image.top = history.top;
      image.width = history.width; // 直接设置 width/height 可能会影响比例，通常用 scaleX/scaleY 或 scale 方法
      image.height = history.height;
      image.flipX = history.flipX;
      image.flipY = history.flipY;
      image.scale(history.scaleX); // 使用 scale 方法同时设置 scaleX 和 scaleY
      // image.setXY(history.getXY()); // setXY 方法是 Fabric V6 的新方法，用于同时设置 left 和 top
      image.setCoords(); // 更新对象的控制点和边界框坐标
    }

    container.renderAll(); // 请求画布重新渲染以显示更新后的图片状态
  },
);

// --- 键盘事件处理 ---

// 监听 Backspace 和 Delete 键，删除当前选中的对象
onKeyStroke(['Backspace', 'Delete'], _ => {
  // 获取当前选中的所有对象
  const actives = container.getActiveObjects();
  // 遍历并移除选中的对象
  actives.forEach(obj => {
    container.remove(obj);
    // 如果对象有 key 属性，触发 delete 事件
    if ('key' in obj) {
      emits('delete', (obj as any).key); // 这里的类型断言是为了访问自定义的 key 属性
    }
  });
});

// --- 生命周期钩子 ---

// 组件挂载后执行
onMounted(() => {
  initCanvas(); // 初始化画布

  // 监听窗口 resize 事件，并调整画布尺寸
  useEventListener(window, 'resize', () => {
    const el = instance?.proxy?.$el;
    drawingFabricUtils.resizeCanvas(el);
  });
});

// 组件被 keep-alive 激活时执行
onActivated(() => {
  if (container) return; // 如果画布已经存在，则返回

  // 如果画布不存在 (可能是首次激活或从非活跃状态切换过来)，重新初始化画布和背景图
  initCanvas();
  initBgImage();
});

// --- 暴露给父组件的方法 ---

// 通过 defineExpose 暴露一些方法，供父组件调用
defineExpose({
  zoomIn, // 放大
  zoomOut, // 缩小
  setScale, // 设置缩放比例
  asFile: () => drawingFabricUtils.asFile(), // 将画布内容导出为文件 (使用自定义工具类)
});
</script>

<style scoped>
/* scoped 样式，仅作用于当前组件 */
.draw {
  position: absolute;
  /* 将绘制工具区绝对定位到画布上方或下方，具体位置需要根据 toolLayout prop 调整 */
  top: 0;
  left: 0;
  z-index: 10; /* 确保工具区在画布之上 */
  background-color: white; /* 添加背景色以便看到工具区 */
  padding: 10px;
  gap: 10px; /* 添加间距 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 添加阴影 */
}

.draw-type {
  gap: 10px; /* 绘制类型按钮之间的间距 */
}
</style>