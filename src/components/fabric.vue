<template>
  <div class="fabric-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <!-- 绘制工具 -->
      <div class="tool-group">
        <div class="tool-btn" :class="{ active: drawMode === 'rect' }" @click="enableRectMode">矩形</div>
        <div class="tool-btn" :class="{ active: drawMode === 'brush' }" @click="enableBrushMode">笔刷</div>
        <div class="tool-btn" @click="clearCanvas">清除</div>
      </div>
      
      <!-- 笔刷设置 -->
      <div class="tool-group" v-show="drawMode === 'brush'">
        <span>笔刷粗细:</span>
        <input type="range" min="1" max="50" v-model="brushSize" @change="changeBrushSize" />
        <span>{{ brushSize }}</span>
      </div>
      
      <!-- 缩放工具 -->
      <div class="tool-group">
        <div class="tool-btn" @click="zoomIn">放大</div>
        <div class="tool-btn" @click="zoomOut">缩小</div>
        <span>缩放: {{ Math.round(zoomLevel * 100) }}%</span>
      </div>

      <!-- 背景工具 -->
      <div class="tool-group">
        <div class="tool-btn" @click="reloadBackground">纯色背景</div>
        <div class="tool-btn" @click="loadImageBackground">图像背景</div>
      </div>
    </div>
    
    <!-- 画布容器 -->
    <div class="canvas-wrapper">
      <canvas ref="canvasRef" id="fabricCanvas" width="800" height="600"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import {
  Canvas,
  Rect,
  PencilBrush,
  Image as FabricImage,
  Control,
  controlsUtils
} from 'fabric';

// 画布相关引用
const canvasRef = ref(null);
let fabricCanvas = null;

// 绘制状态
const drawMode = ref('none'); // 'none', 'rect', 'brush'
const brushSize = ref(20);
const zoomLevel = ref(1);

// 矩形绘制状态
let isDrawingRect = false;
let startPoint = null;
let currentRect = null;

// 背景图URL - 使用更可靠的图片源
const backgroundImageUrl = ref('https://placehold.co/800x600');

/**
 * 初始化Fabric画布
 */
const initFabricCanvas = () => {
  // 确保Canvas元素存在
  if (!canvasRef.value) {
    console.error('Canvas元素不存在!');
    // 延迟重试初始化
    setTimeout(initFabricCanvas, 100);
    return;
  }
  
  console.log('开始初始化Fabric画布');
  
  try {
    // 创建fabric画布实例
    fabricCanvas = new Canvas(canvasRef.value, {
      width: 800,
      height: 600,
      selection: true, // 允许多选功能
      backgroundColor: '#f5f5f5'
    });
    
    console.log('Fabric画布已创建:', fabricCanvas);
    
    // 设置背景图片
    setBackgroundImage();
    
    // 扩展矩形对象，添加中点控制点
    extendRectWithMidControls();

  } catch (error) {
    console.error('初始化Fabric画布时发生错误:', error);
  }
};

/**
 * 扩展矩形对象，添加中点控制点
 */
const extendRectWithMidControls = () => {
  // 引用基础控制点逻辑用于继承
  const { controls } = Rect.prototype;

  // 完全重新定义所有控制点
  Rect.prototype.controls = {
    // 保留原有的四个角控制点
    tl: controls.tl,
    tr: controls.tr,
    bl: controls.bl,
    br: controls.br,
    
    // 自定义左中点
    ml: new Control({
      x: -0.5,
      y: 0,
      cursorStyle: 'move',
      render: function(ctx, left, top, styleOverride, fabricObject) {
        drawControl(ctx, left, top, styleOverride, fabricObject);
      },
      actionHandler: function(eventData, transform, x, y) {
        const target = transform.target;
        const mouseLocalPosition = target.toLocalPoint({x, y}, 'center', 'center');
        
        let newWidth = Math.abs(mouseLocalPosition.x * 2);
        let newLeft = target.left + (target.width - newWidth) / 2;
        let newHeight = Math.abs(mouseLocalPosition.y * 2);
        let newTop = target.top + (target.height - newHeight) / 2;

        // 在一次set调用中更新所有属性
        target.set({
          width: newWidth,
          left: newLeft,
          height: newHeight,
          top: newTop
        });
        
        return true;
      },
      actionName: 'scaling' // 使用'scaling'作为actionName
    }),
    
    // 自定义顶部中点
    mt: new Control({
      x: 0,
      y: -0.5,
      cursorStyle: 'move',
      render: function(ctx, left, top, styleOverride, fabricObject) {
        drawControl(ctx, left, top, styleOverride, fabricObject);
      },
      actionHandler: function(eventData, transform, x, y) {
        const target = transform.target;
        const mouseLocalPosition = target.toLocalPoint({x, y}, 'center', 'center');
        
        let newWidth = Math.abs(mouseLocalPosition.x * 2);
        let newLeft = target.left + (target.width - newWidth) / 2;
        let newHeight = Math.abs(mouseLocalPosition.y * 2);
        let newTop = target.top + (target.height - newHeight) / 2;

        // 在一次set调用中更新所有属性
        target.set({
          width: newWidth,
          left: newLeft,
          height: newHeight,
          top: newTop
        });
        
        return true;
      },
      actionName: 'scaling' // 使用'scaling'作为actionName
    }),
    
    // 自定义右侧中点
    mr: new Control({
      x: 0.5,
      y: 0,
      cursorStyle: 'move',
      render: function(ctx, left, top, styleOverride, fabricObject) {
        drawControl(ctx, left, top, styleOverride, fabricObject);
      },
      actionHandler: function(eventData, transform, x, y) {
        const target = transform.target;
        const mouseLocalPosition = target.toLocalPoint({x, y}, 'center', 'center');
        
        let newWidth = Math.abs(mouseLocalPosition.x * 2);
        let newLeft = target.left + (target.width - newWidth) / 2;
        let newHeight = Math.abs(mouseLocalPosition.y * 2);
        let newTop = target.top + (target.height - newHeight) / 2;

        // 在一次set调用中更新所有属性
        target.set({
          width: newWidth,
          left: newLeft,
          height: newHeight,
          top: newTop
        });
        
        return true;
      },
      actionName: 'scaling' // 使用'scaling'作为actionName
    }),
    
    // 自定义底部中点
    mb: new Control({
      x: 0,
      y: 0.5,
      cursorStyle: 'move',
      render: function(ctx, left, top, styleOverride, fabricObject) {
        drawControl(ctx, left, top, styleOverride, fabricObject);
      },
      actionHandler: function(eventData, transform, x, y) {
        const target = transform.target;
        const mouseLocalPosition = target.toLocalPoint({x, y}, 'center', 'center');
        
        let newWidth = Math.abs(mouseLocalPosition.x * 2);
        let newLeft = target.left + (target.width - newWidth) / 2;
        let newHeight = Math.abs(mouseLocalPosition.y * 2);
        let newTop = target.top + (target.height - newHeight) / 2;

        // 在一次set调用中更新所有属性
        target.set({
          width: newWidth,
          left: newLeft,
          height: newHeight,
          top: newTop
        });
        
        return true;
      },
      actionName: 'scaling' // 使用'scaling'作为actionName
    })
  };
};

/**
 * 辅助函数：绘制控制点
 */
const drawControl = (ctx, left, top, styleOverride, fabricObject) => {
  styleOverride = styleOverride || {};
  const size = styleOverride.cornerSize || fabricObject.cornerSize || 13;
  const stroke = styleOverride.cornerStrokeColor || fabricObject.cornerStrokeColor || '#51B9F9';
  const fill = styleOverride.cornerColor || fabricObject.cornerColor || '#51B9F9';
  
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(left, top, size / 2, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

/**
 * 设置矩形的控制点样式和行为
 */
const setupRectControls = (rect) => {
  rect.set({
    transparentCorners: false,
    borderColor: '#51B9F9',
    cornerColor: '#51B9F9',
    cornerSize: 8,
    cornerStyle: 'circle',
    hasControls: true,
    hasBorders: true,
  });
};

/**
 * 设置背景图片
 */
const setBackgroundImage = () => {
  if (!fabricCanvas) {
    console.error('Canvas尚未初始化，无法设置背景图');
    return;
  }

  console.log('设置纯色背景');
  
  try {
    // 使用纯色背景作为替代 - 在v6中使用正确的方法
    fabricCanvas.backgroundColor = '#e0f7fa';
    fabricCanvas.renderAll();
    
    // 在画布中央绘制一个标记，确认canvas能正常工作
    const centerRect = new Rect({
      left: fabricCanvas.width / 2 - 50,
      top: fabricCanvas.height / 2 - 50,
      width: 100,
      height: 100,
      fill: '#80deea',
      stroke: '#00acc1',
      strokeWidth: 2,
    });
    
    // 设置控制点样式
    setupRectControls(centerRect);
    
    fabricCanvas.add(centerRect);
    fabricCanvas.renderAll();
    
    console.log('背景和中心矩形已设置');
  } catch (error) {
    console.error('设置背景时发生错误:', error);
  }
};

/**
 * 启用矩形绘制模式
 */
const enableRectMode = () => {
  // 取消之前绑定的事件处理程序
  fabricCanvas.off('mouse:down');
  fabricCanvas.off('mouse:move');
  fabricCanvas.off('mouse:up');
  
  // 切换到矩形模式
  drawMode.value = 'rect';
  fabricCanvas.isDrawingMode = false;
  
  // 绑定鼠标事件 - 保持原代码中container.on的事件绑定方式
  fabricCanvas.on('mouse:down', onMouseDown);
  fabricCanvas.on('mouse:move', onMouseMove);
  fabricCanvas.on('mouse:up', onMouseUp);
};

/**
 * 矩形绘制 - 鼠标按下事件处理
 */
const onMouseDown = (options) => {
  if (drawMode.value !== 'rect') return;
  
  // 检查是否点击了已有对象，如果是，则不开始绘制新矩形
  if (options.target && options.target !== fabricCanvas) {
    isDrawingRect = false;
    return;
  }
  
  // 开始绘制矩形
  isDrawingRect = true;
  
  // 获取鼠标指针位置
  const pointer = fabricCanvas.getPointer(options.e);
  startPoint = { x: pointer.x, y: pointer.y };
  
  // 创建新矩形
  currentRect = new Rect({
    left: startPoint.x,
    top: startPoint.y,
    width: 0,
    height: 0,
    fill: 'rgba(0, 0, 0, 0.5)',
    stroke: '#000',
    strokeWidth: 1,
    selectable: true,
  });
  
  // 设置控制点样式
  setupRectControls(currentRect);
  
  // 添加到画布
  fabricCanvas.add(currentRect);
};

/**
 * 矩形绘制 - 鼠标移动事件处理
 */
const onMouseMove = (options) => {
  if (!isDrawingRect || drawMode.value !== 'rect') return;
  
  // 获取当前鼠标指针位置
  const pointer = fabricCanvas.getPointer(options.e);
  
  // 计算矩形宽高
  let width = Math.abs(pointer.x - startPoint.x);
  let height = Math.abs(pointer.y - startPoint.y);
  
  // 根据绘制方向调整矩形位置
  if (pointer.x < startPoint.x) {
    currentRect.set({ left: pointer.x });
  }
  if (pointer.y < startPoint.y) {
    currentRect.set({ top: pointer.y });
  }
  
  // 更新矩形大小
  currentRect.set({
    width: width,
    height: height
  });
  
  // 重新渲染画布
  fabricCanvas.renderAll();
};

/**
 * 矩形绘制 - 鼠标松开事件处理
 */
const onMouseUp = () => {
  if (drawMode.value !== 'rect') return;
  
  // 结束绘制矩形
  isDrawingRect = false;
  
  // 如果矩形太小，可以考虑移除它
  if (currentRect && (currentRect.width < 5 || currentRect.height < 5)) {
    fabricCanvas.remove(currentRect);
  } else if (currentRect) {
    // 确保绘制完成后该对象是可选择和编辑的
    currentRect.setCoords(); // 更新控制点位置
    fabricCanvas.setActiveObject(currentRect); // 将当前矩形设置为活动对象
  }
  
  // 重置当前绘制的矩形引用
  currentRect = null;
  fabricCanvas.renderAll();
};

/**
 * 启用自由绘制模式（笔刷）
 */
const enableBrushMode = () => {
  // 取消之前绑定的事件处理程序
  fabricCanvas.off('mouse:down');
  fabricCanvas.off('mouse:move');
  fabricCanvas.off('mouse:up');
  
  // 切换到笔刷模式
  drawMode.value = 'brush';
  
  // 设置笔刷属性
  fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
  fabricCanvas.freeDrawingBrush.width = brushSize.value;
  fabricCanvas.freeDrawingBrush.color = 'rgba(0, 0, 0, 0.5)';
  
  // 启用自由绘制模式
  fabricCanvas.isDrawingMode = true;
};

/**
 * 更改笔刷大小
 */
const changeBrushSize = () => {
  if (fabricCanvas && fabricCanvas.freeDrawingBrush) {
    fabricCanvas.freeDrawingBrush.width = parseInt(brushSize.value, 10);
  }
};

/**
 * 放大画布
 */
const zoomIn = () => {
  zoomLevel.value *= 1.1;
  applyZoom();
};

/**
 * 缩小画布
 */
const zoomOut = () => {
  zoomLevel.value *= 0.9;
  applyZoom();
};

/**
 * 应用缩放级别到画布
 */
const applyZoom = () => {
  fabricCanvas.setZoom(zoomLevel.value);
  fabricCanvas.renderAll();
};

/**
 * 清除画布上的所有对象
 */
const clearCanvas = () => {
  // 保留背景图片，清除其他所有对象
  fabricCanvas.getObjects().forEach(obj => {
    fabricCanvas.remove(obj);
  });
  fabricCanvas.renderAll();
};

/**
 * 重新加载背景图
 */
const reloadBackground = () => {
  try {
    // 清除画布上的所有对象
    fabricCanvas.getObjects().forEach(obj => {
      fabricCanvas.remove(obj);
    });
    fabricCanvas.renderAll();
    
    // 重新设置背景图片
    setBackgroundImage();
    
    console.log('背景已重新加载');
  } catch (error) {
    console.error('重新加载背景时发生错误:', error);
  }
};

/**
 * 尝试加载图像作为背景
 */
const loadImageBackground = () => {
  if (!fabricCanvas) {
    console.error('Canvas尚未初始化，无法设置背景图');
    return;
  }
  
  try {
    console.log('尝试加载图像作为背景:', backgroundImageUrl.value);
    
    // 使用FabricImage加载图像
    FabricImage.fromURL(backgroundImageUrl.value, (img) => {
      if (!img) {
        console.error('无法加载背景图片');
        return;
      }
      
      // 调整图片大小以适应画布
      const canvasWidth = fabricCanvas.width;
      const canvasHeight = fabricCanvas.height;
      
      console.log('图片尺寸:', img.width, 'x', img.height);
      console.log('画布尺寸:', canvasWidth, 'x', canvasHeight);
      
      // 计算缩放比例，确保图片适合画布
      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;
      const scale = Math.min(scaleX, scaleY);
      
      // 设置图片属性
      img.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        selectable: false // 背景不可选中
      });
      
      // 设置为背景图片
      fabricCanvas.backgroundImage = img;
      fabricCanvas.renderAll();
      
      console.log('背景图片已设置');
    }, { crossOrigin: 'anonymous' });
  } catch (error) {
    console.error('加载图像背景时出错:', error);
  }
};

// 组件挂载时初始化
onMounted(() => {
  console.log('组件已挂载');
  // 使用nextTick确保DOM已渲染
  nextTick(() => {
    console.log('DOM已更新，开始初始化canvas');
    initFabricCanvas();
    // 确保 fabricCanvas 实例存在后再启用模式
    if (fabricCanvas) {
      drawMode.value = 'rect'
      enableRectMode(); // 在初始化后启用矩形模式
      console.log('矩形模式已在初始化后启用');
    } else {
      console.error('FabricCanvas 初始化失败，无法启用矩形模式');
    }
  });
});

// 监听画布大小变化
watch(() => brushSize.value, (newSize) => {
  changeBrushSize();
});
</script>

<style>
.fabric-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
}

.toolbar {
  display: flex;
  padding: 10px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ddd;
}

.tool-group {
  display: flex;
  align-items: center;
  margin-right: 20px;
}

.tool-btn {
  margin-right: 5px;
  padding: 5px 10px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 3px;
  cursor: pointer;
}

.tool-btn:hover {
  background-color: #f5f5f5;
}

.tool-btn.active {
  background-color: #007bff;
  color: white;
  border-color: #0069d9;
}

.canvas-wrapper {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #e9e9e9;
  padding: 20px;
  height: calc(100vh - 80px); /* 减去工具栏高度 */
}

canvas {
  border: 1px solid #ccc;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
}
</style> 