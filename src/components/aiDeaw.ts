import AiDrawService from '@api/backend/AiDrawService' // 导入后端AI绘图服务的API
// import FileService from '@api/ibos/FileService'; // 可能用于文件服务的导入，当前被注释
import { useMessageBox } from '@hooks/useMessage' // 导入用于显示消息框的hook
import { useRouteParams } from '@vueuse/router' // 导入用于获取路由参数的hook from VueUse
import { cloneDeep } from 'lodash-es' // 导入lodash-es库中的cloneDeep函数，用于深度复制对象
import { defineStore } from 'pinia' // 导入Pinia库的defineStore函数，用于定义store
import {
  CreateRecordParams, // 导入创建记录参数的类型定义
  DrawImageMaterial, // 导入绘图素材的类型定义
  GenImageData, // 导入生成图片数据的类型定义
  GenImageParams, // 导入生成图片参数的类型定义
  PreviewImgResp, // 导入预览图片响应的类型定义
} from '@/types/service/api/backend/AiDrawServiceTypes' // 从类型文件中导入AI绘图服务相关的类型
import { _Image } from '@/types/service/model/image' // 导入图片模型的类型定义
import { GENERATE_STATUS } from './materialEditorStore' // 导入生成状态的枚举类型
import { loopRequestGenerateResult } from '../utilities' // 导入循环请求生成结果的工具函数
import { useProductStore } from './productStore' // 导入产品store的hook
import { ref } from 'vue' // 导入Vue的ref函数，用于创建响应式引用

// 定义AI绘图store的接口
export interface IAiDrawingStore {
  // userStore: ReturnType<typeof useUserStore> // 用户store的类型定义，当前被注释
  materialId: Ref<string> // 素材ID，使用Ref包装使其具有响应性
  /** 是否显示保存场景页面 */
  showSavedScene: Ref<boolean> // 控制是否显示保存场景页面的响应式布尔值
  /** 场景图类型 */
  sceneImageType: Ref<'creativeBuild' | 'customizeBuild' | 'fixedSceneBuild'> // 场景图类型，响应式引用
  /* 线稿 */
  lineDrawImage: Ref<DrawImageMaterial> // 线稿素材，响应式引用
  /* 场景 */
  sceneStyleImage: Ref<DrawImageMaterial> // 场景风格素材，响应式引用
  /* 线稿样式提示词(仅显示) */
  linePrompt: Ref<DrawImageMaterial> // 线稿样式提示词，响应式引用 (仅用于显示)
  /* 光线 */
  lightEffect: Ref<DrawImageMaterial> // 光线效果素材，响应式引用
  /* 颜色 */
  colorEffect: Ref<DrawImageMaterial> // 颜色效果素材，响应式引用
  /** 产品 */
  product: Ref<_Image> // 产品图片，响应式引用
  /** 人物 */
  character: Ref<_Image> // 人物图片，响应式引用
  /** 画布缩放大小 */
  sceneGrabbingScale: Ref<number> // 场景画布缩放大小，响应式引用
  /** 融合图画布缩放大小 */
  combineGrabbingScale: Ref<number> // 融合图画布缩放大小，响应式引用
  /** 生成场景图状态 */
  sceneState: Ref<GENERATE_STATUS> // 生成场景图的状态，响应式引用
  /** 生成融合图状态 */
  combineState: Ref<GENERATE_STATUS> // 生成融合图的状态，响应式引用
  /** 记录copyId */
  recordCopyId: Ref<number> // 记录复制ID，响应式引用
  hasClickStart: Ref<boolean> // 是否点击了开始生成按钮，响应式引用
  sceneImageData: Ref<GenImageData[]> // 生成的场景图数据数组，响应式引用
  combineImageData: Ref<GenImageData[]> // 生成的融合图数据数组，响应式引用
  combineImageId: Ref<number> // 融合图ID，响应式引用

  /** 使用的场景图 */
  useSceneImage: Ref<GenImageData> // 当前使用的场景图，响应式引用

  /** 画图物品摆放位置 */
  imagePosition: Ref<{
    // 画图物品（产品、人物）的摆放位置，响应式引用
    product: string // 产品的摆放位置信息 (可能是JSON字符串)
    character: string // 人物的摆放位置信息 (可能是JSON字符串)
  }>
  /** 画图物品摆放位置历史记录 */
  // imagePositionHistory: ReturnType<typeof useRefHistory> // 摆放位置历史记录，当前被注释，需要导入useRefHistory
  // aiParamsHistory: Map<keyof typeof this.imagePosition, any[]> // AI参数历史记录 Map，当前被注释

  requestController: AbortController // 请求控制器，用于取消API请求，当前被注释
  aiDrawingEventConfirm: Ref<(data: any) => void> // AI绘图事件确认函数，响应式引用
  useDelete?: Ref<boolean> // 是否使用删除功能，响应式引用 (可选属性)

  confirmReplaceImage: (imgUrl: string) => void // 确认替换图片的方法
  cancelRequest: () => void // 取消请求的方法
  reset: () => void // 重置store状态的方法
}

// 实现AI绘图store的基类
class AiDrawingStore implements IAiDrawingStore {
  // userStore = useUserStore(); // 用户store实例，当前被注释
  materialId = useRouteParams<string>('materialId') // 从路由参数获取materialId，并创建响应式引用
  showSavedScene = ref(false) // 初始化showSavedScene为false
  sceneImageType = ref<'creativeBuild' | 'customizeBuild' | 'fixedSceneBuild'>(
    'creativeBuild'
  ) // 初始化场景图类型为'creativeBuild'
  lineDrawImage = ref<DrawImageMaterial>({
    // 初始化线稿素材
    category_id: 0,
    change_date: '',
    create_date: '',
    file_path: '',
    id: 0,
    is_deleted: 0,
    last_change_by: '',
    name: '',
    owner: '',
    thumbnail: '',
  })
  sceneStyleImage = ref<DrawImageMaterial>({
    // 初始化场景风格素材
    category_id: 0,
    change_date: '',
    create_date: '',
    file_path: '',
    id: 0,
    is_deleted: 0,
    last_change_by: '',
    name: '',
    owner: '',
    thumbnail: '',
  })
  linePrompt = ref<DrawImageMaterial>({
    // 初始化线稿样式提示词素材
    category_id: 0,
    change_date: '',
    create_date: '',
    file_path: '',
    id: 0,
    is_deleted: 0,
    last_change_by: '',
    name: '',
    owner: '',
    thumbnail: '',
  })
  lightEffect = ref<DrawImageMaterial>({
    // 初始化光线效果素材
    category_id: 0,
    change_date: '',
    create_date: '',
    file_path: '',
    id: 0,
    is_deleted: 0,
    last_change_by: '',
    name: '',
    owner: '',
    thumbnail: '',
  })
  colorEffect = ref<DrawImageMaterial>({
    // 初始化颜色效果素材
    category_id: 0,
    change_date: '',
    create_date: '',
    file_path: '',
    id: 0,
    is_deleted: 0,
    last_change_by: '',
    name: '',
    owner: '',
    thumbnail: '',
  })
  product = ref<_Image>({
    // 初始化产品图片
    file_path: '',
    file_url: '',
    id: 0,
    is_delete: 0,
  })
  character = ref<_Image>({
    // 初始化人物图片
    file_path: '',
    file_url: '',
    id: 0,
    is_delete: 0,
  })
  sceneGrabbingScale = ref(100) // 初始化场景画布缩放大小为100
  combineGrabbingScale = ref(100) // 初始化融合图画布缩放大小为100
  useSceneImage = ref<GenImageData>() // 初始化当前使用的场景图

  imagePosition = ref({
    // 初始化画图物品的摆放位置
    product: '', // 产品位置信息为空字符串
    character: '', // 人物位置信息为空字符串
  })
  // imagePositionHistory = useRefHistory(this.imagePosition, { // 实例化摆放位置历史记录，当前被注释
  //   deep: true,
  //   capacity: 50,
  // })
  aiParamsHistory = new Map() // 初始化AI参数历史记录 Map

  sceneState = ref(GENERATE_STATUS.Incomplete) // 初始化生成场景图状态为未完成
  combineState = ref(GENERATE_STATUS.Incomplete) // 初始化生成融合图状态为未完成
  generateText = ref('图片生成中...') // 初始化生成过程中的提示文本
  recordCopyId = ref(0) // 初始化记录复制ID为0

  hasClickStart = ref(false) // 初始化是否点击了开始生成按钮为false
  sceneImageData = ref<GenImageData[]>([]) // 初始化生成的场景图数据数组为空
  combineImageData = ref<GenImageData[]>([]) // 初始化生成的融合图数据数组为空
  combineImageId = ref<number>() // 初始化融合图ID

  requestController: AbortController // 声明请求控制器，当前未实例化
  aiDrawingEventConfirm = ref<(data: any) => void>() // 声明AI绘图事件确认函数

  // 记录场景生成参数
  requesParamsCache = ref<Record<string, any>>({}) // 请求参数缓存
  taskId: number // 任务ID
  recordSceneGenParams = ref<CreateRecordParams['param_info']>({}) // 记录场景生成参数

  // 取消请求的方法
  cancelRequest = async () => {
    // 调用后端API取消任务
    const result = await AiDrawService.cancelTask({
      task_id: this.taskId, // 要取消的任务ID
    }).catch((error) => {
      // if (error.name === 'CanceledError') return; // 如果是取消错误则忽略
      console.error(error) // 打印错误信息
    })
    console.log(result) // 打印取消请求的结果
    // 如果取消成功且返回码为0
    if (result && result.errcode === 0) {
      this.combineState.value = GENERATE_STATUS.Incomplete // 将融合图生成状态设置为未完成
    } else {
      console.log('取消失败') // 打印取消失败信息
    }
  }

  // 重置store状态的方法
  reset = () => {
    // 定义素材的默认值
    const defaultValue = {
      category_id: 0,
      change_date: '',
      create_date: '',
      file_path: '',
      id: 0,
      is_deleted: 0,
      last_change_by: '',
      name: '',
      owner: '',
      thumbnail: '',
    }

    // 将素材相关的响应式引用重置为默认值
    Object.assign(this.lineDrawImage.value, defaultValue)
    Object.assign(this.sceneStyleImage.value, defaultValue)
    Object.assign(this.lightEffect.value, defaultValue)
    Object.assign(this.colorEffect.value, defaultValue)

    // 重置产品和人物图片的信息
    this.product.value.material_name = ''
    this.product.value.file_url = null
    this.character.value.material_name = ''
    this.character.value.file_url = null

    // 重置画布缩放大小、生成状态和生成的图片数据数组
    this.sceneGrabbingScale.value = 31 // 这里的默认值似乎是31，而不是100
    this.sceneState.value = GENERATE_STATUS.Incomplete
    this.combineState.value = GENERATE_STATUS.Incomplete
    this.sceneImageData.value = []
    this.combineImageData.value = []
  }

  // 确认替换图片的方法
  confirmReplaceImage = (imgUrl: string) => {
    this.aiDrawingEventConfirm.value(imgUrl) // 调用AI绘图事件确认函数并传入图片URL
  }

  // 重置状态的方法 (可能与reset方法有重叠或不同用途)
  resetState = async () => {
    // 如果当前融合图正在生成中
    if (this.combineState.value === GENERATE_STATUS.Generating) {
      await this.cancelRequest() // 取消当前请求
    } else {
      this.combineState.value = GENERATE_STATUS.Incomplete // 否则将融合图生成状态设置为未完成
    }
  }

  // 查询任务结果的方法 (用于融合图生成)
  queryTaskResult = (taskId) => {
    // 循环请求生成结果
    loopRequestGenerateResult(taskId, (loopResultResp) => {
      // 如果返回数据中有等待数量
      if (loopResultResp.data && loopResultResp.data.waiting_count) {
        const waitSecs = loopResultResp.data.waiting_secs // 获取等待秒数
        // const waitTime = waitSecs < 60 ? // 计算等待时间 (分钟或秒)，当前被注释
        // `${waitSecs}秒` : `${Math.round(waitSecs / 60)}分钟`
        // 更新生成过程中的提示文本，显示排队人数
        this.generateText.value = `系统正在生成图片，当前排队${loopResultResp.data.waiting_count}位` //，预计等待${waitTime}
      } else {
        this.generateText.value = '图片生成中...' // 否则显示图片生成中
      }
      console.log('loopResultResp', loopResultResp) // 打印循环请求结果
    })
      .then((resultResp) => {
        console.log('当前生成场景图', resultResp.data.result.images) // 打印当前生成的场景图 (这里似乎是融合图的结果，命名有误)
        console.log('当前已有融合图', this.combineImageData.value) // 打印当前已有的融合图
        // 将新的融合图结果添加到combineImageData数组的开头
        this.combineImageData.value.unshift(
          ...(resultResp.data.result.images || [])
        )
        console.log('所有融合图', this.combineImageData.value) // 打印所有的融合图
        this.combineState.value = GENERATE_STATUS.Completed // 将融合图生成状态设置为已完成
      })
      .catch((error) => {
        console.error('Error:', error) // 打印错误信息
        // 如果错误码不是5 (可能是取消操作的错误码)
        if (error.errcode !== 5) {
          useMessageBox({
            // 显示错误消息框
            message: `${error.errmsg || '系统繁忙，请稍后再试'}`, // 错误消息
            showCancelButton: false, // 不显示取消按钮
            confirmButtonText: 'OK', // 确认按钮文本
          })
        }
        this.combineState.value = GENERATE_STATUS.Incomplete // 将融合图生成状态设置为未完成
      })
  }
}

// 定义用于管理图像生成面板页面状态的store
export const useImageGeneratePanelPageStore = () =>
  defineStore(`ImageGeneratePanelPageStore`, () => {
    const activeTab = ref<
      'creativeBuild' | 'customizeBuild' | 'fixedSceneBuild'
    >('creativeBuild') // 当前激活的tab，默认为'creativeBuild'

    return {
      activeTab, // 返回激活的tab状态
    }
  })()

/* AI 创意生图 */
// 创意生图store，继承自AiDrawingStore
class ImageGenerateStore extends AiDrawingStore {
  useDelete = ref(false) // 在创意生图模式下不使用删除功能

  // 生成场景图的方法
  genSceneImage = async (data) => {
    this.sceneState.value = GENERATE_STATUS.Generating // 将场景图生成状态设置为生成中
    try {
      // 调用后端API生成场景图
      const result = await AiDrawService.genSceneImage(data).catch((error) => {
        // if (error.name === 'CanceledError') return; // 如果是取消错误则忽略

        console.error(error) // 打印错误信息
      })
      console.log(result) // 打印生成场景图的结果
      // 如果生成成功且返回码为0
      if (result && result.errcode === 0) {
        this.taskId = result.data.task_id // 记录任务ID
        this.querySceneTaskResult(this.taskId) // 查询场景图任务结果
      } else {
        useMessageBox({
          // 显示错误消息框
          message: `${result.errmsg || '系统繁忙，请稍后再试'}`, // 错误消息
          showCancelButton: false, // 不显示取消按钮
          confirmButtonText: 'OK', // 确认按钮文本
        })
        this.sceneState.value = GENERATE_STATUS.Incomplete // 将场景图生成状态设置为未完成
      }
    } catch (e) {
      // 捕获异常
      useMessageBox({
        // 显示错误消息框
        message: '网络繁忙，请稍后再试', // 错误消息
        showCancelButton: false, // 不显示取消按钮
        confirmButtonText: 'OK', // 确认按钮文本
      })
      this.sceneState.value = GENERATE_STATUS.Incomplete // 将场景图生成状态设置为未完成
    }
  }

  // 生成融合图的方法 (创意生图模式)
  genCombineImage = async (data) => {
    this.combineState.value = GENERATE_STATUS.Generating // 将融合图生成状态设置为生成中

    console.log(this.imagePosition.value.product) // 打印产品的摆放位置信息
    // 解析产品的摆放位置信息 (JSON字符串)
    const { top, left, width, height, scaleX, scaleY } = JSON.parse(
      this.imagePosition.value.product || {}
    )
    console.log(top, left, width, height, scaleX, scaleY) // 打印解析后的位置和缩放信息
    // 如果位置或缩放信息不完整
    if (!top || !left || !width || !height || !scaleX || !scaleY) {
      // 延迟2秒后再次调用genImage方法 (可能是在等待位置信息更新)
      setTimeout(() => {
        this.genImage(data, JSON.parse(this.imagePosition.value.product))
      }, 2000)
    } else {
      // 否则直接调用genImage方法生成图片
      this.genImage(data, { top, left, width, height, scaleX, scaleY })
    }
  }

  // 生成图片的方法 (创意生图模式，实际调用后端API)
  genImage = async (data, { top, left, width, height, scaleX, scaleY }) => {
    try {
      // 调用后端API生成创意融合图
      const result = await AiDrawService.genCreativeBuildImage({
        product: data.product, // 产品信息
        product_url: data.product_url, // 产品图片URL
        material_id: data.material_id, // 素材ID
        scene_url: this.useSceneImage.value, // 使用的场景图URL
        output_size: data.output_size, // 输出尺寸
        product_x: left, // 产品X坐标
        product_y: top, // 产品Y坐标
        product_w: width * (scaleX || 1), // 产品宽度 (考虑缩放)
        product_h: height * (scaleY || 1), // 产品高度 (考虑缩放)
      }).catch((error) => {
        // if (error.name === 'CanceledError') return; // 如果是取消错误则忽略

        console.error(error) // 打印错误信息
      })
      console.log(result) // 打印生成融合图的结果
      // 如果生成成功且返回码为0
      if (result && result.errcode === 0) {
        this.taskId = result.data.task_id // 记录任务ID
        this.queryTaskResult(this.taskId) // 查询融合图任务结果
      } else {
        useMessageBox({
          // 显示错误消息框
          message: `${result.errmsg || '系统繁忙，请稍后再试'}`, // 错误消息
          showCancelButton: false, // 不显示取消按钮
          confirmButtonText: 'OK', // 确认按钮文本
        })
        this.combineState.value = GENERATE_STATUS.Incomplete // 将融合图生成状态设置为未完成
      }
    } catch (e) {
      // 捕获异常
      console.log(e) // 打印异常信息
      useMessageBox({
        // 显示错误消息框
        message: '网络繁忙，请稍后再试', // 错误消息
        showCancelButton: false, // 不显示取消按钮
        confirmButtonText: 'OK', // 确认按钮文本
      })
      this.combineState.value = GENERATE_STATUS.Incomplete // 将融合图生成状态设置为未完成
    }
  }

  // 查询场景图任务结果的方法
  querySceneTaskResult = (taskId) => {
    // 循环请求生成结果
    loopRequestGenerateResult(taskId, (loopResultResp) => {
      // 如果返回数据中有等待数量
      if (loopResultResp.data && loopResultResp.data.waiting_count) {
        const waitSecs = loopResultResp.data.waiting_secs // 获取等待秒数
        // 更新生成过程中的提示文本，显示排队人数
        this.generateText.value = `系统正在生成场景图，当前排队${loopResultResp.data.waiting_count}位` //，预计等待${waitTime}
      } else {
        this.generateText.value = '场景图生成中...' // 否则显示场景图生成中
      }
      console.log('loopResultResp', loopResultResp) // 打印循环请求结果
    })
      .then(
        (
          resultResp // 任务完成后的处理
        ) => {
          console.log('当前生成场景图', resultResp.data.result.images) // 打印当前生成的场景图结果
          console.log('当前已有场景图', this.sceneImageData.value) // 打印当前已有的场景图
          // 处理图片URL，去除本地开发环境的地址前缀
          const images = resultResp.data.result.images.map((item) => ({
            ...item,
            thumb_url: item.thumb_url.replace('http://10.133.145.127:9982', ''),
            url: item.url.replace('http://10.133.145.127:9982', ''),
          }))
          // 
          //  记录结果 // 待办事项：记录生成结果

          this.sceneImageData.value.unshift(
            ...(images || // 将新的场景图结果添加到sceneImageData数组的开头
              [])
          )
          console.log('所有场景图', this.sceneImageData.value) // 打印所有的场景图
          this.sceneState.value = GENERATE_STATUS.Completed // 将场景图生成状态设置为已完成
        }
      )
      .catch((error) => {
        // 捕获错误
        console.error('Error:', error) // 打印错误信息
        // 如果错误码不是5
        if (error.errcode !== 5) {
          useMessageBox({
            // 显示错误消息框
            message: `${error.errmsg || '系统繁忙，请稍后再试'}`, // 错误消息
            showCancelButton: false, // 不显示取消按钮
            confirmButtonText: 'OK', // 确认按钮文本
          })
        }
        this.sceneState.value = GENERATE_STATUS.Incomplete // 将场景图生成状态设置为未完成
      })
  }
}

/* AI 固定场景生图 */
// 固定场景生图store，继承自AiDrawingStore
class FixedImageGenerateStore extends AiDrawingStore {
  useDelete = ref(true) // 在固定场景生图模式下使用删除功能
  sceneImageType = ref('fixedSceneBuild') // 设置场景图类型为'fixedSceneBuild'

  // 重置场景图的方法 (用于固定场景)
  resetSceneImage = (item) => {
    this.sceneState.value = GENERATE_STATUS.Completed // 将场景图状态设置为已完成 (这里似乎直接设置为完成，而不是生成中)
    // 解构出场景图和产品位置信息
    const { url, material_id, product_x, product_y, product_w, product_h } =
      item

    const productStore = useProductStore() // 获取产品store实例
    //const productImageUrl = productStore.currentProductImage.imageUrl // 获取产品图片URL，当前被注释
    console.log('接口返回的场景图里的产品的坐标', {
      // 打印接口返回的产品坐标信息
      product_x,
      product_y,
      product_w,
      product_h,
    })
    // 获取产品图片的实际尺寸
    const productImageWidth = productStore.currentProductImage.mattingWidth
    const productImageHeight = productStore.currentProductImage.mattingHeight
    // 创建图片对象并加载图片以获取实际尺寸 // 注释
    console.log('productImageWidth', productImageWidth, productImageHeight) // 打印产品图片尺寸

    const originalWidth = productImageWidth // 产品的原始宽度
    const originalHeight = productImageHeight // 产品的原始高度
    console.log('originalWidth', originalWidth) // 打印原始宽度
    console.log('originalHeight', originalHeight) // 打印原始高度

    // 计算目标区域的中心点
    const targetCenterX = product_x + product_w / 2
    const targetCenterY = product_y + product_h / 2

    let newWidth, newHeight // 计算新的产品尺寸

    // 计算目标区域和原始图片的宽高比
    const imageRatio = productImageWidth / productImageHeight

    // 始终以宽度为基准进行计算
    newWidth = product_w
    newHeight = newWidth / imageRatio

    // 如果计算出的高度超过了目标区域高度，则需要重新以高度为基准计算
    if (newHeight > product_h) {
      newHeight = product_h
      newWidth = newHeight * imageRatio
    }

    // 计算新的左上角坐标，使中心点对齐
    const newX = targetCenterX - newWidth / 2
    const newY = targetCenterY - newHeight / 2
    console.log(' 经过计算好的坐标大小', {
      // 打印计算后的坐标和大小
      newX,
      newY,
      newWidth,
      newHeight,
    })
    // console.log('newX', newX) // 注释
    // console.log('newY', newY) // 注释
    // console.log('newWidth', newWidth) // 注释
    // console.log('newHeight', newHeight) // 注释

    this.combineImageId.value = material_id // 记录融合图ID
    this.useSceneImage.value = url // 记录使用的场景图URL

    // 更新位置信息
    this.imagePosition.value.product = JSON.stringify({
      // 将产品的最新位置信息保存为JSON字符串
      type: 'image', // 类型为image
      left: product_x, // 左边距
      top: product_y, // 上边距
      width: product_w, // 宽度
      height: product_h, // 高度
      // 注意：这里保存的是接口返回的产品在场景图中的位置和大小，而不是调整后的新位置和大小
    })

    console.log('resetSceneImage', this.imagePosition.value.product) // 打印更新后的产品位置信息
  }

  // 生成融合图的方法 (固定场景模式)
  genCombineImage = () => {
    try {
      this.combineState.value = GENERATE_STATUS.Generating // 将融合图生成状态设置为生成中

      // 解析产品的摆放位置信息 (JSON字符串)
      const { top, left, width, height, scaleX, scaleY } = JSON.parse(
        this.imagePosition.value.product || {}
      )
      console.log(top, left, width, height, scaleX, scaleY) // 打印解析后的位置和缩放信息
      // 如果位置或缩放信息不完整
      if (!top || !left || !width || !height || !scaleX || !scaleY) {
        // 延迟2秒后再次调用genFixedSceneImage方法
        setTimeout(() => {
          this.genFixedSceneImage(JSON.parse(this.imagePosition.value.product))
        }, 2000)
      } else {
        // 否则直接调用genFixedSceneImage方法生成图片
        this.genFixedSceneImage({ top, left, width, height, scaleX, scaleY })
      }
    } catch (
      e // 捕获异常
    ) {
      this.combineState.value = GENERATE_STATUS.Incomplete // 将融合图生成状态设置为未完成
      useMessageBox({
        // 显示错误消息框
        message: '生图失败，请稍后再试', // 错误消息
        showCancelButton: false, // 不显示取消按钮
        confirmButtonText: 'OK', // 确认按钮文本
      })
    }
  }

  // 生成固定场景融合图的方法 (实际调用后端API)
  genFixedSceneImage = async ({ top, left, width, height, scaleX, scaleY }) => {
    try {
      const productStore = useProductStore() // 获取产品store实例
      // 调用后端API生成固定场景融合图
      const result = await AiDrawService.genFixedSceneImage({
        // 产品信息，这里直接使用了productStore.productInfo
        product: productStore.productInfo,
        material_id: this.combineImageId.value, // 使用记录的融合图ID (场景图ID)
        product_url: productStore.fixedCurrentProductImage.imageUrl, // 使用固定场景模式下的产品图片URL
        product_x: left, // 产品X坐标
        product_y: top, // 产品Y坐标
        product_w:
          width *
          (scaleX || // 产品宽度 (考虑缩放)
            1),
        product_h: height * (scaleY || 1), // 产品高度 (考虑缩放)
      }).catch((error) => {
        // if (error.name === 'CanceledError') return; // 如果是取消错误则忽略

        console.error(error) // 打印错误信息
      })
      console.log(result) // 打印生成固定场景融合图的结果
      // 如果生成成功且返回码为0
      if (result && result.errcode === 0) {
        this.taskId = result.data.task_id // 记录任务ID
        this.queryTaskResult(this.taskId) // 查询融合图任务结果
      } else {
        useMessageBox({
          // 显示错误消息框
          message: `${result.errmsg || '系统繁忙，请稍后再试'}`, // 错误消息
          showCancelButton: false, // 不显示取消按钮
          confirmButtonText: 'OK', // 确认按钮文本
        })
        this.combineState.value = GENERATE_STATUS.Incomplete // 将融合图生成状态设置为未完成
      }
    } catch (e) {
      // 捕获异常
      console.log(e) // 打印异常信息
      useMessageBox({
        // 显示错误消息框
        message: '网络繁忙，请稍后再试', // 错误消息
        showCancelButton: false, // 不显示取消按钮
        confirmButtonText: 'OK', // 确认按钮文本
      })
      this.combineState.value = GENERATE_STATUS.Incomplete // 将融合图生成状态设置为未完成
    }
  }
}

// 导出用于获取AI绘图相关store的hook
export const useGenerateStore = () => {
  // 定义并获取创意生图store实例
  const imageGenerateStore = defineStore(
    `imageGenerateStore`,
    () => new ImageGenerateStore()
  )()
  // 定义并获取固定场景生图store实例
  const fixedImageGenerateStore = defineStore(
    `fixedImageGenerateStore`,
    () => new FixedImageGenerateStore()
  )()
  // 获取页面状态store实例
  const pageStore = useImageGeneratePanelPageStore()

  return {
    pageStore, // 返回页面状态store
    imageGenerateStore, // 返回创意生图store
    fixedImageGenerateStore, // 返回固定场景生图store
  }
}
