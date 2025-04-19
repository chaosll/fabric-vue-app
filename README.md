# Fabric.js Vue 示例

这是一个使用 Fabric.js v6 在 Vue 3 中实现的简单绘图应用示例。

## 功能

- 设置背景图片
- 矩形绘制工具
- 自由笔刷绘制
- 缩放背景图片

## 使用方法

### 安装依赖

```bash
npm install
npm run dev
```

### 使用组件

组件位于 `src/components/fabric.vue`，可以直接在其他Vue组件中引入使用：

```javascript
import Fabric from './components/fabric.vue'
```

### 功能说明

1. **矩形工具**: 点击"矩形"按钮，然后在画布上拖动鼠标创建矩形。
2. **笔刷工具**: 点击"笔刷"按钮，然后在画布上拖动鼠标进行自由绘制。可以通过滑块调整笔刷粗细。
3. **缩放功能**: 使用"放大"和"缩小"按钮调整画布的缩放级别。
4. **清除**: 点击"清除"按钮移除所有绘制的对象，保留背景图片。

## 实现细节

该组件使用了 Fabric.js v6 的 ESM 导入方式：

```javascript
import {
  Canvas,
  Rect,
  PencilBrush,
  Image as FabricImage
} from 'fabric';
```

所有的交互操作都使用Fabric提供的事件系统实现：

```javascript
fabricCanvas.on('mouse:down', onMouseDown);
fabricCanvas.on('mouse:move', onMouseMove);
fabricCanvas.on('mouse:up', onMouseUp);
```

这符合原始需求中"通过container.on('mouse:xx',onMousexx)事件绑定功能"的要求。
