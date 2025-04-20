<template>
    <div>
        <AiPicTopNav index="13"></AiPicTopNav>
        <div class="ai-pic-container">
            <el-row :gutter="20">
                <el-col :span="12">
                    <div class="ai-pic-mod-box">
                        <div class="ai-pic-mod-box__hd">
                            <div class="ai-pic-mod-box__hd__title">选择产品</div>
                        </div>
                        <div class="ai-pic-mod-box__bd" v-loading="viewRecognitionLoading" element-loading-text="正在识别产品角度，请稍候">
                            <el-radio-group class="product-upload-type" v-model="productUploadType" @change="onChangeProductUploadType">
                                <el-radio-button label="1" > 搜索产品 </el-radio-button>
                                <el-radio-button label="2"> 上传产品白底图 </el-radio-button>
                            </el-radio-group>
                            
                            <div v-show="productUploadType == '1'">
                                <el-form-item>
                                    <el-input
                                        class="ai-pic-custom-input"
                                        v-model="productSearchObj.productSearchFieldContent"
                                        :placeholder="`请输入${productSearchObj.productSearchField === 'model' ? '型号' : '产品编码'},点击右侧搜索按钮，或敲击回车键检索`"
                                        @keyup.enter="onSearch"
                                    >
                                        <template #prepend>
                                            <el-select
                                                v-model="productSearchObj.productSearchField"
                                                @change="resetSearchFieldContent"
                                                placeholder="Select"
                                                style="width: 115px"
                                            >
                                                <el-option label="产品型号" value="model" />
                                                <el-option label="产品编码" value="itemCode" />
                                            </el-select>
                                        </template>
                                        <template #suffix>
                                            <div
                                                class="search-result-wrap"
                                                ref="searchProductResultDiv"
                                                tabindex="0"
                                                v-if="isShowProductSearchPopup"
                                                @clickoutside="hideOverlay"
                                                @keyup.enter="onSelectProduct(productListActiveIndex)"
                                                @keydown.arrow-up.prevent="onMoveProductUp"
                                                @keydown.arrow-down.prevent="onMoveProductDown"
                                            >
                                                <ul class="search-result-list">
                                                    <template v-if="productList.length">
                                                        <li
                                                            :class="
                                                                'search-result-item ' +
                                                                (index == productListActiveIndex
                                                                    ? 'search-result-item--active'
                                                                    : '')
                                                            "
                                                            v-for="(item, index) in productList"
                                                            @click="onSelectProduct(index)"
                                                        >
                                                            <div class="search-result-item__product-img">
                                                                <img :src="item.mainPic" alt="" />
                                                            </div>
                                                            <div class="search-result-item__product-info">
                                                                <el-tooltip
                                                                    effect="dark"
                                                                    placement="top-start"
                                                                    :content="item.title"
                                                                >
                                                                    <p class="search-result-item__product-title">
                                                                        {{ item.title }}
                                                                    </p>
                                                                </el-tooltip>
                                                                <p class="search-result-item__product-model">
                                                                    型号：{{ item.model }}
                                                                </p>
                                                                <p class="search-result-item__product-code">
                                                                    产品编码{{ item.itemCode }}
                                                                </p>
                                                            </div>
                                                        </li>
                                                    </template>
                                                    <template v-else>
                                                        <li class="search-result-item search-result-item--empty">
                                                            没有找到产品信息
                                                        </li>
                                                    </template>
                                                </ul>
                                            </div>
                                        </template>
                                        <template #append>
                                            <el-button
                                                :disabled="productSearchDisabled"
                                                @click="onSearch('btn')"
                                                :icon="Search"
                                            />
                                        </template>
                                    </el-input>
                                </el-form-item>
                                <div style="margin-bottom: 10px;">
                                    <span>试一试：</span>
                                    <span
                                        class="ai-pic-product-type"
                                        v-for="item of prodectType"
                                        :key="item"
                                        @click="clickTry(item)"
                                    >
                                        {{ item }}
                                    </span>
                                </div>
                                <p style="margin-bottom: 10px;"  v-if="mainPicList.length && !showSearchProductLoading" >请选择产品图：</p>
                                <div v-if="mainPicList.length && !showSearchProductLoading" class="create-img-outer-box face-style-box" >

                                    <div class="create-img-inner-box" v-for="(item, index) in mainPicList" :key="index"  @click="onSelectProductMainPic(index)">
                                        <div class="create-img-box"  :class="{ 'create-img-box--selected': item.selected }"  title="">
                                            <el-image class="create-img-box__img" :src="item.image_url" fit="contain" />
                                            <el-icon class="create-img-box___img-selected-icon"><Select /></el-icon>
                                        </div>
                                        <p  v-show="item.perspective && item.perspective !=='unknown'" class="create-img-box__text">{{ productPerspectiveMap[item.perspective] }}</p>
                                    </div>
                                </div>

                                <div class="custom-loading" v-if="showSearchProductLoading" >
                                    <img width="150" src="https://pic.mdcdn.cn/pc/img/ai/loading.gif" />
                                </div>
                                <div  v-if="(mainPicList.length && !currentCategoryIsInWhtieList) || detectProductPerspectiveFail" class="select-view">
                                    {{detectProductPerspectiveFail ? '识别产品角度失败，请手动标注：':'因当前品类的产品图视角暂不支持AI识别，请在选择产品图之后手动标注：'}}
                                    <el-radio-group class="product-view-type" size="small" v-model="currentView" @change="onSelectProductViewType">
                                        <el-radio-button label="front" > 正视图 </el-radio-button>
                                        <el-radio-button label="left"> 左视图 </el-radio-button>
                                        <el-radio-button label="right"> 右视图 </el-radio-button>
                                    </el-radio-group>
                                </div>
                            </div>
                            <div v-show="productUploadType == '2'">
                                <el-upload
                                        v-if="!customUploadProductPic"
                                        :show-file-list="false"
                                        :on-success="onUploadProductPicSuccess"
                                        class="upload-box"
                                        drag
                                        action="/appdata/ecm_aigc/drawer/upload_image"
                                        multiple
                                    >
                                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                                        <div class="el-upload__text">点击或拖动文件到这里上传图片</div>
                                        <template #tip>
                                            <div class="sketch-upload-tips">
                                                <el-text class="mx-1" type="danger">1、请上传产品白底图</el-text>
                                            </div>
                                            <div class="sketch-upload-tips">
                                                <el-text class="mx-1" type="">2、可上传不超过10MB的JPG、PNG、JPEG的图片</el-text>
                                            </div>
                                        </template>
                                    </el-upload>
                                    <template v-else>
                                        <div class="custom-upload-product-pic">
                                            <el-image :src="customUploadProductPic" fit="contain" />
                                        </div>
                                        <el-upload
                                                v-if="productUploadType == '2' && customUploadProductPic"
                                                :disabled="generateProcessState == 1"
                                                class="custom-product-reupload"
                                                action="/appdata/ecm_aigc/drawer/upload_image"
                                                :show-file-list="false"
                                                :on-success="onUploadProductPicSuccess"
                                            >
                                                <el-button plain :disabled="false">重新上传</el-button>
                                            </el-upload>
                                            <div   class="select-view">
                                                <span class="select-view-txt">{{'手动上传的产品白底图暂不支持AI识别产品视角，请手动标注你上传的产品图视角是：'}}</span>
                                                <el-radio-group class="product-view-type" size="small" v-model="currentView" @change="onSelectProductViewType">
                                                    <el-radio-button label="front" > 正视图 </el-radio-button>
                                                    <el-radio-button label="left"> 左视图 </el-radio-button>
                                                    <el-radio-button label="right"> 右视图 </el-radio-button>
                                                </el-radio-group>
                                            </div>
                                    </template>
                                </div>
                        </div>
                    </div>
                    <div class="ai-pic-mod-box">
                        <div class="ai-pic-mod-box__hd">
                            <div class="ai-pic-mod-box__hd__title">选择场景</div>
                        </div>
                        <div class="ai-pic-mod-box__bd">
                            <el-radio-group class="scene-opt-type" v-model="sceneType" @change="onChangeSceneType">
                                <el-radio-button label="1" > 预置场景 </el-radio-button>
                                <el-radio-button label="2"> 上传场景图 </el-radio-button>
                            </el-radio-group>
                            <el-upload
                                v-if="sceneType == '2' && (backgroundImage.url || uploadPicUrl)"
                                :disabled="generateProcessState == 1"
                                class="custom-reupload"
                                action="/appdata/ecm_aigc/drawer/upload_image"
                                :show-file-list="false"
                                :on-success="onUploadSuccess"
                                :before-upload="onUploadBefore"
                            >
                                <el-button plain :disabled="false">重新上传</el-button>
                            </el-upload>
                            <el-button v-show="sceneType == '2'" class="import-from-btn" plain :disabled="generateProcessState == 1" @click="showGalleryDialog(1)">
                                从[社区/我的]导入
                            </el-button>
                            <div v-show="sceneType == '1'">
                                <div v-if="sceneFirstShowTips" class="opt-tips ">
                                    <p>以下是部分预置场景预览，请先在上方选择产品，系统会根据品类为你输出最合适的预置场景图</p>
                                </div>
                                <div class="ai-pic-waterfall-box" v-if="list.length">


                                    <Waterfall
                                        :list="list"
                                        :gutter="10"
                                        :width="200"
                                        :breakpoints="pageConfig.breakpoints"
                                        :hasAroundGutter="false"
                                    >
                                        <template #item="{ item, index }">
                                            <div
                                                :class="currentSelect === index ? 'custom-waterfall' : ''"
                                                @click="selectPicture(index)"
                                            >
                                                <LazyImg :url="item.thumb_url" @dblclick="showPicture(index)" />
                                                <el-icon v-show="currentSelect === index" class="selected-icon">
                                                    <Select />
                                                </el-icon>
                                            </div>
                                        </template>
                                    </Waterfall>
                                    </div>
                                <el-empty
                                    v-show="list.length === 0"
                                    :image-size="100"
                                    description="此品类或产品视角暂无预置场景图，敬请期待，如有添加需求，请联系（wulq3）沟通。您可以手动上传场景图"
                                />
                            </div>
                            <div v-show="sceneType == '2'">
                                <div v-show="backgroundImage.url !== '' && currentView == 'front'">

                                    <div class="opt-tips ">
                                        <p>请将产品缩放移动到希望替换或放置的位置，越精准效果越好</p>
                                    </div>
                                    <div class="opt-row" v-if="uploadPicUrl || backgroundImage.url">
                                        <el-radio-group v-if="genSceneRepaintResultImgURL" class="repaint-result-switch-mode" size="small" v-model="repaintResultSwitchMode" @change="onChangRepaintResultSwitchMode">
                                            <el-radio-button label="1" title="对比"> <el-icon><Reading /></el-icon> </el-radio-button>
                                            <el-radio-button label="2" title="涂抹编辑"> <el-icon><EditPen /></el-icon> </el-radio-button>
                                        </el-radio-group>
                                        <el-button v-if="genSceneRepaintResultImgURL"  class="repaint-undo-btn" size="small" plain @click="onUndoRepaint">还原</el-button>
                                        <el-button  class="repaint-btn" type="primary" size="small" plain @click="onRepaint" :disabled="genSceneRepaintProcessState == 1">洗图</el-button>
                                        <el-tooltip content="规避原图侵权风险，对原图进行重绘" placement="top">
                                            <el-icon size="18"  class="repaint-btn-info"><QuestionFilled /></el-icon>
                                        </el-tooltip>
                                    </div>
                                    <div style="position: relative;">
                                        <div v-show="genSceneRepaintProcessState !== 1" class="custom-image" ref="container">
                                            <img
                                                ref="backgroundImageDiv"
                                                :src="backgroundImage.url"
                                                alt="Background"
                                                style="display: block; width: 100%"
                                            />
                                            <Vue3DraggableResizable
                                                v-if="state.imageLoaded"
                                                :initW="state.width"
                                                :initH="state.height"
                                                :min-width="50"
                                                :min-height="50"
                                                :max-width="state.maxWidth"
                                                :max-height="state.maxHeight"
                                                v-model:x="state.posX"
                                                v-model:y="state.posY"
                                                v-model:w="state.width"
                                                v-model:h="state.height"
                                                v-model:active="state.active"
                                                :draggable="true"
                                                :resizable="true"
                                                :lockAspectRatio="true"
                                                @dragover="handleDragOver"
                                                :style="`background: url(${overImage.url}) 0% 0% / 100% no-repeat; opacity: 0.6`"
                                                class="vdr-draggable"
                                            ></Vue3DraggableResizable>
                                        </div>
                                        <div style="position: absolute;width: 100%;top: 0;" v-show="repaintResultSwitchMode == '1'">
                                            <AiPicCompareImage :bottomImg="genSceneRepaintCacheImgURL" :upperImg="genSceneRepaintResultImgURL"></AiPicCompareImage>
                                        </div>
                                    </div>

                                    <div v-if="genSceneRepaintProcessState == 1" class="repainting">
                                        <img src="https://pic.mdcdn.cn/pc/img/ai/loading.gif"/>
                                        <p>{{genSceneRepaintProcessText}}</p>
                                    </div>

                                </div>
                                <div v-show="currentView !== 'front'">
                                    <div v-if="uploadPicUrl" class="opt-tips ">
                                        <p>请在场景图上涂抹要换上产品的位置，越精准效果越好</p>
                                    </div>
                                    <div class="opt-row" v-if="uploadPicUrl">
                                        <el-button v-show="repaintResultSwitchMode == '2'" class="clear-brush" plain size="small" @click="clearBrush" :disabled="generateSceneProcessState == 2 ">重新涂抹</el-button>
                                        <el-radio-group class="brush-opt-type" v-show="repaintResultSwitchMode == '2'" size="small" v-model="brushType" @change="onChangBrushType">
                                            <el-radio-button label="1" > <el-icon><Crop /></el-icon> </el-radio-button>
                                            <el-radio-button label="2"> <el-icon><Brush /></el-icon> </el-radio-button>
                                        </el-radio-group>


                                        <div v-show="repaintResultSwitchMode == '2'" v-if="brushType == '2'" class="change-brush-num"><span class="change-brush-num-title">画笔粗细：</span><el-slider :disabled="generateSceneProcessState == 2 " class="brush-num-slider" style="width:150px" v-model="brushNum" @change="changeBrushNum" /></div>

                                        <el-radio-group v-if="genSceneRepaintResultImgURL" class="repaint-result-switch-mode" size="small" v-model="repaintResultSwitchMode" @change="onChangRepaintResultSwitchMode">
                                            <el-radio-button label="1" title="对比"> <el-icon><Reading /></el-icon> </el-radio-button>
                                            <el-radio-button label="2" title="涂抹编辑"> <el-icon><EditPen /></el-icon> </el-icon> </el-radio-button>
                                        </el-radio-group>
                                        <el-button v-if="genSceneRepaintResultImgURL"  class="repaint-undo-btn" size="small"  @click="onUndoRepaint">还原</el-button>
                                        <el-button  class="repaint-btn" type="primary" size="small" plain @click="onRepaint">洗图</el-button>
                                        <el-tooltip content="规避原图侵权风险，对原图进行重绘" placement="top">
                                            <el-icon size="18"  class="repaint-btn-info"><QuestionFilled /></el-icon>
                                        </el-tooltip>
                                    </div>
                                    <div style="position: relative;" v-show="uploadPicUrl && genSceneRepaintProcessState !== 1">
                                        <div id="canvasBox" class="canvas-box" >
                                            <div class="generating-mask" v-if="generateSceneProcessState == 2" :style="{width:canvasWidthRef + 'px',height:canvasHeightRef + 'px'}"></div>
                                            <canvas id="canvas" ></canvas>
                                        </div>
                                        <div v-show="repaintResultSwitchMode == '1'" style="position: absolute;width: 100%;top: 0;">
                                            <AiPicCompareImage :bottomImg="genSceneRepaintCacheImgURL" :upperImg="genSceneRepaintResultImgURL"></AiPicCompareImage>
                                        </div>

                                    </div>

                                    <canvas style="display: none;" id="resizedCanvas"></canvas>
                                    <div style="display:none"><canvas id="backgroundCanvas"></canvas></div>
                                    <div style="display:none"><canvas id="brushCanvas"></canvas></div>

                                    <div v-if="genSceneRepaintProcessState == 1" class="repainting">
                                        <img src="https://pic.mdcdn.cn/pc/img/ai/loading.gif"/>
                                        <p>{{genSceneRepaintProcessText}}</p>
                                    </div>
                                </div>
                                <div v-if="!backgroundImage.url  && !uploadPicUrl">
                                    <el-upload
                                        :show-file-list="false"
                                        :on-success="onUploadSuccess"
                                        class="upload-box"
                                        drag
                                        action="/appdata/ecm_aigc/drawer/upload_image"
                                        multiple
                                    >
                                        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                                        <div class="el-upload__text">点击或拖动文件到这里上传图片</div>
                                        <template #tip>
                                            <div class="sketch-upload-tips">
                                                <el-text class="mx-1" type="danger">1、为了更好的效果，请尽量上传与产品图角度匹配的参考图</el-text>
                                            </div>
                                            <div class="sketch-upload-tips">
                                                <el-text class="mx-1" type="">2、可上传不超过10MB的JPG、PNG、JPEG的图片</el-text>
                                            </div>
                                        </template>
                                    </el-upload>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="create-action-box">
                        <el-button
                            type="primary"
                            @click="onGenerate"
                            :disabled="generateSceneProcessState == 2"
                        >
                            立即生成
                        </el-button>
                    </div>
                </el-col>
                <el-col :span="12">
                    <div class="ai-pic-mod-box ai-pic-mod-box--generate-result">
                        <div class="ai-pic-mod-box__hd">
                            <div class="ai-pic-mod-box__hd__title">生成结果</div>
                        </div>
                        <div class="ai-pic-mod-box__bd">
                            <template v-if="sceneType == '1'">
                                <template v-if=" currentSelect > -1">
                                    <div v-if="generateSceneProcessState === 3">
                                        <AiPicCompareImage :bottomImg="bottomImg" :upperImg="upperImg"></AiPicCompareImage>
                                        <div class="create-action-download" v-if="generateSceneProcessState === 3">
                                            <el-button plain :disabled="generateProcessState == 1" @click="onDownLoad" type="primary">
                                                下载
                                            </el-button>
                                            <el-button plain :disabled="generateProcessState == 1" @click="onSave">
                                                保存到我的
                                            </el-button>
                                        </div>
                                    </div>
                                    <div v-else-if="generateSceneProcessState === 0">
                                        <img :src="currentSelectBg" alt="" class="custom-img-box" />
                                    </div>

                                    <div class="recognizing" v-else-if="generateSceneProcessState === 5">
                                        <el-alert :title="generateFailMsg" type="error" :closable="false" show-icon />
                                    </div>
                                    <div class="recognizing" v-else>
                                        <img src="https://pic.mdcdn.cn/pc/img/ai/loading.gif" />
                                        <div>{{ generateProcessText }}</div>
                                    </div>
                                </template>
                                <template v-else>
                                    <div>请先完成左侧配置，选择产品图及场景图</div>
                                </template>
                            </template>

                            <template v-if="sceneType == '2'">
                                <template v-if="uploadPicUrl || backgroundImage.url">
                                    <div v-if="generateSceneProcessState === 3">
                                        <AiPicCompareImage :bottomImg="bottomImg" :upperImg="upperImg"></AiPicCompareImage>
                                        <div class="create-action-download" v-if="generateSceneProcessState === 3">
                                            <el-button plain :disabled="generateProcessState == 1" @click="onDownLoad" type="primary">
                                                下载
                                            </el-button>
                                            <el-button plain :disabled="generateProcessState == 1" @click="onSave">
                                                保存到我的
                                            </el-button>
                                        </div>
                                    </div>
                                    <div v-else-if="generateSceneProcessState === 0">
                                        <div>完成配置后请点击立即生成</div>
                                    </div>

                                    <div class="recognizing" v-else-if="generateSceneProcessState === 5">
                                        <el-alert :title="generateFailMsg" type="error" :closable="false" show-icon />
                                    </div>
                                    <div class="recognizing"  v-else-if="generateSceneProcessState === 2">
                                        <img src="https://pic.mdcdn.cn/pc/img/ai/loading.gif" />
                                        <div>{{ generateProcessText }}</div>
                                    </div>
                                </template>
                                <template v-else>
                                    <div>请先完成左侧配置，选择产品图及场景图</div>
                                </template>

                            </template >


                        </div>


                    </div>
                </el-col>
            </el-row>
        </div>
        <AiPicViewer
            v-model:visible="picViewer.visible"
            :list="currentPicViewList"
            :index="picViewer.index"
        ></AiPicViewer>
        <el-dialog v-model="dialogVisible" title="提示" width="30%">
            <span>您已经合成了图片，是否确认切换场景，切换后合成图将会被清空，请及时保存</span>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="onConfirmChange">确认</el-button>
                </span>
            </template>
        </el-dialog>

        <AIPicListDialog v-if="galleryDialogConfig.visible" :imgType="galleryDialogConfig.imgType" @close="closeOrConfirmDialog" @confirm="closeOrConfirmDialog"></AIPicListDialog>
    </div>
</template>

<script lang="ts" setup>
import { reactive, ref, watch, onMounted, Ref, nextTick } from 'vue'
import AiPicTopNav from '../components/AiPicTopNav.vue' // 导入顶部导航组件
import { Search } from '@element-plus/icons-vue' // 导入 Element Plus 图标
// 从自定义的 fabric.js 版本中导入 fabric
import { fabric } from 'fabric-with-erasing';
import AiPicCompareImage from '../components/AiPicCompareImage.vue' // 导入图片对比组件
import { ElMessage,ElLoading, ElMessageBox } from 'element-plus' // 导入 Element Plus 组件
import type { UploadProps } from 'element-plus' // 导入 Element Plus 上传组件类型
import { AiPicUrlApi, ProductSellingWritingApi } from '../api/api.js' // 导入 API 请求方法
import { downloadImage } from '../utils/util.js' // 导入下载图片工具函数
import { LazyImg, Waterfall } from 'vue-waterfall-plugin-next' // 导入瀑布流组件和懒加载图片组件
import { loadImage,loopRequestGenerateResult } from '../utils/util.js' // 导入加载图片和轮询生成结果工具函数
import AIPicListDialog from "../components/AIPicListDialog.vue" // 导入社区/我的图片列表弹窗组件

// 产品图上传方式：1-选择 2-上传
const productUploadType : Ref<string> = ref('1');
// 场景图上传方式：1-选择预置场景 2-手动上传
const sceneType: Ref<string> = ref('1');
// 当前产品的视角：front-正视图 left-左视图 right-右视图 unknown-无法识别
const currentView : Ref<string> = ref('');
// 笔刷类型：1:矩形 2:画笔
const brushType : Ref<string> = ref('1');
// 是否首次展示场景图区域的提示信息
const sceneFirstShowTips : Ref<boolean> = ref(true);
// 产品视角映射表，用于显示中文名称
const productPerspectiveMap = {
    'front': '正视图',
    'left': '左视图',
    'right': '右视图',
    'unknown':'无法识别'
}

// 是否识别产品角度失败
const detectProductPerspectiveFail: Ref<boolean> = ref(false)
// 当前SKU信息
const currentSkuInfo : Ref<any> = ref({});
// 当前产品品类ID，默认为30 (空调套机)
const currentCategory: Ref<number> = ref(30);
// 当前选择的产品图URL
const currentProductImageURL :Ref<string> = ref('');
// 当前选择的产品图抠图后的URL
const currentProductImageMattingURL :Ref<string> = ref('');
// 支持AI识别产品图视角的品类白名单
const categoryWhiteList = [{ id: 60, name: '洗衣机' }, { id: 30, name: '空调套机' },{ id: 105, name: '空调内机' }]
// 产品主图列表
const mainPicList: Ref<MainPicItem[]> = ref([]);
// 选中的产品（目前未直接使用）
const selectProduct: Ref<string> = ref('30')
// 手动上传的产品图URL
const customUploadProductPic :Ref<string> = ref('');
// 试一试推荐型号列表
const prodectType: Ref<string[]> = ref([])
// 当前来源，默认为8
const currentSource: Ref<number> = ref(8)
// 当前选中的预置场景图索引
const currentSelect: Ref<number> = ref(-1)
// 当前选中的预置场景图预览URL
const currentSelectBg: Ref<string> = ref('')
// 生成失败时的错误信息
const generateFailMsg: Ref<string> = ref('')
// 当前品类是否在白名单中，用于判断是否支持AI识别视角
const currentCategoryIsInWhtieList : Ref<boolean> = ref(true);
// 产品搜索加载状态
const showSearchProductLoading: Ref<boolean> = ref(false)
// 产品视角识别加载状态
const viewRecognitionLoading: Ref<boolean> = ref(false)
// 重绘结果切换模式：1-对比 2-涂抹编辑
const repaintResultSwitchMode : Ref<string> = ref('2');
// 场景图重绘过程状态：0-未开始 1-进行中 2-成功 3-失败
const genSceneRepaintProcessState : Ref<number> = ref(0);
// 场景图重绘过程文本提示
const genSceneRepaintProcessText : Ref<string> = ref('');
// 场景图重绘结果URL
const genSceneRepaintResultImgURL : Ref<string> = ref('');
// 场景图重绘前的缓存URL，用于还原
const genSceneRepaintCacheImgURL : Ref<string> = ref('');
// 可拖拽产品图的容器DOM引用
const container = ref(null)
// 背景图DOM引用
const backgroundImageDiv = ref(null)
// 视角识别加载状态标记
let perspectiveLoading = false;
// 社区/我的图片列表弹窗配置
const galleryDialogConfig = reactive({
    visible: false, // 是否可见
    imgType: 1 // 图片类型，1为场景图
})

// 上传场景图信息
const backgroundImage = reactive({
    url: '', // 图片URL
    visible: false, // 是否可见 (目前未直接使用控制显示)
    renderWidth: 300, // 渲染宽度
    renderHeight: 300, // 渲染高度
    naturalWidth: 300, // 自然宽度
    naturalHeight: 300 // 自然高度
})
// 预置场景列表分页配置
const pageConfig = reactive({
    index: 1, // 当前页码
    size: 50, // 每页数量
    total: 0, // 总数
    loading: false, // 加载状态
    tips: '加载更多', // 加载提示文本
    breakpoints: { // 瀑布流布局断点
        1000: { rowPerView: 5 },
        800: { rowPerView: 4 }
    }
})


// 选中产品图后，可拖拽图片属性的状态
const state = reactive({
    imageLoaded: false, // 图片是否加载完成
    active: false, // 是否激活拖拽
    posX: 0, // X轴位置
    posY: 0, // Y轴位置
    width: 100, // 宽度
    height: 100, // 高度
    scale: 0.5, // 缩放比例
    maxWidth: 300, // 最大宽度
    maxHeight: 300 // 最大高度
})

// 放置在背景图上方的可拖拽产品图信息
const overImage = reactive({
    url: '', // 图片URL
    visible: false, // 是否可见 (目前未直接使用控制显示)
    renderWidth: 300, // 渲染宽度
    renderHeight: 300, // 渲染高度
    naturalWidth: 300, // 自然宽度
    naturalHeight: 300 // 自然高度
})

// 预置场景图片列表
const list: Ref<ImageItem[]> = ref([])
// 预置场景图片项接口定义
interface ImageItem {
    code: string | null // 场景代码
    image_url: string // 图片URL
    preview_url: string // 预览图URL
    thumb_url: string | null // 缩略图URL
}

// 产品主图项接口定义
interface MainPicItem {
    selected: boolean // 是否选中
    image_url: string // 图片URL
    perspective : string | null // 视角
}


// 侧视图场景画布相关变量
const uploadPicUrl : Ref<string | null> = ref('');// 手动上传的场景图URL
const uploadPicMaskUrl : Ref<string | null> = ref(''); // 生成的蒙版图片URL
const finalUploadPicUrl : Ref<string | null> = ref('');// 最终用于生成的场景图URL
const canvasWidthRef : Ref<number> = ref(800); // 画布渲染宽度
const canvasHeightRef : Ref<number> = ref(600); // 画布渲染高度
const uploadImageWidth : Ref<number> = ref(0); // 上传图片原始宽度
const uploadImageHeight : Ref<number> = ref(0); // 上传图片原始高度
const finalImageWidth : Ref<number> = ref(0); // 最终用于生成的图片宽度
const finalImageHeight : Ref<number> = ref(0); // 最终用于生成的图片高度
// 用于跟踪 fabric.Canvas 实例
let canvasRef: fabric.Canvas | null = null;
// 画笔颜色
const brushColor = ref('rgba(0,0,0,.8)');
// 画笔粗细滑块显示/隐藏 (目前未直接使用)
const paintBrush = ref(false);
// 画笔粗细值
const brushNum = ref(60);
// 当前 Fabric.js 状态是否为绘图模式 (目前未直接使用)
const fabricStatus = ref(false);
// 监听 uploadPicUrl 变化，用于初始化 Fabric.js 画布
watch(() => uploadPicUrl.value, (newValue, oldValue) => {
    // bottomImg.value = newValue; // 目前不在这里设置 bottomImg
    // generateBtnDisable.value = false; // 目前不在这里控制按钮禁用
    const img = new Image();
    img.src = newValue as string; // 断言为string，避免类型错误

    img.onload = function () {
    // 动态初始化画布并添加图片
        uploadImageWidth.value = img.width;
        uploadImageHeight.value = img.height;

        const originalWidth = img.width;
        const originalHeight = img.height;

        // 获取用于缩放的隐藏canvas
        const resizedCanvas = document.getElementById('resizedCanvas') as HTMLCanvasElement;
        const resizedCanvasCtx = resizedCanvas.getContext('2d');

        // 计算缩放比例，将最长边缩放到1024
        const maxDimension = 1024;
        const scaleFactor = maxDimension / Math.max(originalWidth, originalHeight);

        // 计算新的尺寸
        const newWidth = originalWidth * scaleFactor;
        const newHeight = originalHeight * scaleFactor;

        // 调整隐藏canvas尺寸
        resizedCanvas.width = newWidth;
        resizedCanvas.height = newHeight;
        // 在隐藏canvas上绘制缩放后的图片
        resizedCanvasCtx?.clearRect(0, 0, resizedCanvas.width, resizedCanvas.height); // 使用可选链
        resizedCanvasCtx?.drawImage(img, 0, 0, newWidth, newHeight); // 使用可选链

        // 初始化主canvas并加载图片
        initializeCanvas(img);

        // 计算最终用于生成的图片尺寸（保持宽高比，最长边1024）
        if(img.width > img.height){
            finalImageWidth.value = 1024;
            finalImageHeight.value = 1024 * img.height / img.width;
        }else{
            finalImageHeight.value = 1024;
            finalImageWidth.value = img.width * 1024 / img.height;
        }

        console.log(`finalImageWidth:${finalImageWidth.value},finalImageHeight:${finalImageHeight.value}`)

    };
})

// 处理拖拽事件，阻止默认行为
const handleDragOver = (event: Event) => {
  event.preventDefault()
}


// 组件挂载后执行
onMounted(() => {
    // 添加点击事件监听器，用于点击非搜索结果区域时隐藏搜索弹窗
    document.addEventListener('click', hideOverlay)
    queryPresetSceneList('first') // 默认场景加载，'first'表示首次加载
})

// 监听 currentView 变化，根据视角切换场景图处理方式
watch(() => currentView.value, (newValue, oldValue) => {
    console.log(newValue);
    if(newValue !== 'unknown'){
        // 如果从侧视图切换到正视图，且有上传的场景图，则将uploadPicUrl赋值给backgroundImage.url并清空uploadPicUrl
        if(newValue == 'front' && uploadPicUrl.value){
            backgroundImage.url = uploadPicUrl.value;
            uploadPicUrl.value = '';
            dealMattingImg(); // 处理抠图产品图
        }
        // 如果从正视图切换到侧视图，且有背景图，则将backgroundImage.url赋值给uploadPicUrl并清空backgroundImage.url
        else if(newValue !== 'front' && backgroundImage.url){
            uploadPicUrl.value = backgroundImage.url;
            backgroundImage.url = '';
        }
    }
})

/**
 * 查询预置场景列表
 * @param type 加载类型，'first'表示首次加载，其他值表示非首次
 */
const queryPresetSceneList = async (type) => {
    perspectiveLoading = true; // 设置视角加载状态为true
    pageConfig.loading = true; // 设置分页加载状态为true
    if(!type){
        sceneFirstShowTips.value = false; // 非首次加载时隐藏提示
    }

    list.value = [] // 清空当前预置场景列表
    // 调用API获取预置场景列表
    const res: any = await AiPicUrlApi.getReplaceProductConfig({
        page: pageConfig.index,
        page_size: pageConfig.size,
        category_id: currentCategory.value // 根据当前品类查询
    })
    if (res.errcode === 0) {
        perspectiveLoading = false; // 设置视角加载状态为false
        prodectType.value = res.data.try_models // 更新试一试推荐型号列表
        const images: ImageItem[] =res.data.scene_images;// [];//res.data.scene_images
        if(images.length > 0){
            list.value = list.value.concat(images) // 将获取到的场景图添加到列表中
            pageConfig.total = list.value.length // 更新总数
            // 如果是首次加载且有场景图，默认选中第一个
            if (list.value.length > 0 && type == 'first') {
                console.log('slkdjfklsjdf')
                currentSelect.value = 0
                currentSelectBg.value = list.value[0].preview_url // 设置预览图
                bottomImg.value = list.value[0].image_url // 设置底图
            }
            // 如果不是首次加载，清空选中状态和图片
            else if(!type){
                currentSelect.value = -1
                currentSelectBg.value = ''
                bottomImg.value = ''
            }
            setTimeout(() => {
                pageConfig.loading = false // 取消分页加载状态
                // 如果返回的场景图数量小于每页数量，表示没有更多数据
                if (images.length === 0 || images.length < pageConfig.size) {
                    pageConfig.tips = '暂无更多数据'
                }
            }, 1000)

        }else{
            // 如果没有场景图，清空列表和选中状态
            list.value = []
            currentSelect.value = -1
            currentSelectBg.value = ''
            bottomImg.value = ''
        }

    } else {
        // 如果API请求失败，清空列表和选中状态，并提示错误信息
        list.value = []
        currentSelect.value = -1
        currentSelectBg.value = ''
        bottomImg.value = ''
        pageConfig.total = 0
        ElMessage.error(`[${res.errcode}]${res.errmsg}`)
    }
}

// 测试使用的对比图URL
const bottomImg = ref('') // 底图URL
const upperImg = ref('') // 上层图URL
// 生成场景图过程状态：0-未开始 1-进行中 2-成功 3-失败 4-取消 5-错误
const generateSceneProcessState = ref(0)
// 切换场景确认弹窗是否可见
const dialogVisible = ref(false)
// 临时保存的选中索引
const tempIndex = ref(0)
// 临时保存的试一试型号代码
const tempTryCode = ref('')
// 弹窗标记，用于区分是切换背景图、切换产品还是点击试一试
const dialogVisibleFlag = ref('')

// 选中其中一个预置场景图片
const selectPicture = (index: number) => {
    // 如果已经生成了图片且状态为成功，弹出确认弹窗
    if (upperImg && generateSceneProcessState.value === 3) {
        dialogVisible.value = true
        tempIndex.value = index // 保存当前选中的索引
        dialogVisibleFlag.value = 'bg' // 标记为切换背景图
    } else {
        // 否则直接选中
        currentSelect.value = index
        currentSelectBg.value = list.value[index].preview_url // 更新预览图
        bottomImg.value = list.value[index].image_url // 更新底图
        upperImg.value = '' // 清空上层图
    }
}



// 查看大图相关的变量和方法
const currentPicViewList: Ref<any[]> = ref([]) // 查看大图列表
import AiPicViewer from '../components/AiPicViewer.vue' // 导入图片查看器组件
const picViewer = reactive({
    visible: false, // 是否可见
    index: 0 // 当前查看的图片索引
})
// 显示大图
const showPicture = (index: number) => {
    picViewer.visible = true // 设置可见
    picViewer.index = index // 设置索引
    currentPicViewList.value = [{ ...list.value[index], url: list.value[index].image_url }] // 构建图片列表
}

// 产品搜索内容相关的变量和接口定义
interface SearchObj {
    productSearchField: string // 搜索字段
    productSearchFieldContent: string | null // 搜索内容
}
// 产品搜索对象
const productSearchObj = reactive<SearchObj>({
    productSearchField: 'model', // 默认按型号搜索
    productSearchFieldContent: '' // 搜索内容
})
// 生成过程状态 (目前未直接使用控制按钮禁用)
const generateProcessState: Ref<number> = ref(3)
// 产品搜索按钮是否禁用
const productSearchDisabled = ref<Boolean>(false)
// 是否显示产品搜索结果弹窗
const isShowProductSearchPopup = ref<Boolean>(false)
// 是否正在输入产品 (目前未直接使用)
const isInputProduct = ref<Boolean>(false)
// 产品搜索结果弹窗DOM引用
const searchProductResultDiv = ref(null)
// 产品搜索结果列表中当前激活的索引
const productListActiveIndex: Ref<number> = ref(0)
// 产品信息接口定义
interface ProductInfo {
    skuId: number | null
    entName: string | null
    brandName: string | null
    model: string | null
    itemCode: string | null
    title: string | null
    sellingPoint: string | null
    mainPic: string // 主图URL
    categoryId: number | null // 品类ID
}

// 产品搜索结果列表
const productList = reactive<ProductInfo[]>([])
// 当前选中的产品信息
const currentProduct = reactive<ProductInfo>({
    skuId: null,
    entName: null,
    brandName: null,
    model: null,
    itemCode: null,
    title: null,
    sellingPoint: null,
    mainPic: '',
    categoryId: null
})
// 主要产品列表 (目前未直接使用)
const mainProductList = ref<string[]>([])
// 所有产品列表 (目前未直接使用)
const allProductList = ref<string[]>([])
// 生成次数计数
const generateNum: Ref<number> = ref(0)


// 产品上传方式变化时的处理函数
const onChangeProductUploadType = ()=>{

}

// 场景类型变化时的处理函数
const onChangeSceneType = ()=>{
    // 如果切换到手动上传场景图，但没有选择产品图，则阻止切换并提示用户
    if (sceneType.value == '2' && !currentProductImageURL.value) {
        sceneType.value = '1' // 恢复为预置场景
        ElMessage({
            message: `请先选择或上传产品图片噢`,
            type: 'warning'
        })
        return false; // 阻止默认行为
    }

    // 如果切换到手动上传场景图，清空预置场景选中状态和图片
    if(sceneType.value == '2'){
        currentSelect.value = -1
        currentSelectBg.value = ''
        bottomImg.value = ''
    }

}

// 选择产品视角类型时的处理函数 (目前未实现具体逻辑)
const onSelectProductViewType = ()=>{

}


/**
 * 检索商品信息
 * @param type 触发类型，'btn'表示点击按钮触发，'try'表示点击试一试触发
 */
const onSearch = async (type: string) => {

    mainPicList.value = []; // 清空产品主图列表
    showSearchProductLoading.value = true; // 显示加载状态
    productSearchDisabled.value = true // 禁用搜索按钮
    // 调用API根据搜索条件查询产品信息
    const productInfoResp: any = await ProductSellingWritingApi.queryProductInfo({
        productSearchField: productSearchObj.productSearchField,
        productSearchFieldContent: productSearchObj.productSearchFieldContent
    })

    if (productInfoResp.errcode == 0) {

        showSearchProductLoading.value = false; // 隐藏加载状态
        productSearchDisabled.value = false // 启用搜索按钮

        if (productInfoResp.data.length) {
            let productInfoList = productInfoResp.data;
            Object.assign(productList, productInfoList) // 将查询结果赋值给产品列表
            // 如果只查到一个产品或者是由试一试触发，则直接选中该产品并处理图片
            if(productInfoResp.data.length == 1 || type == 'try'){
                Object.assign(currentProduct, productInfoList[0]) // 将产品信息赋值给当前选中产品

                dealImage() // 处理产品图片显示


            }else{
                isShowProductSearchPopup.value = true // 显示搜索结果弹窗
                 // 切换焦点到搜索结果弹窗
                await nextTick()
                if (searchProductResultDiv.value) {
                    (searchProductResultDiv.value as HTMLElement).focus()
                }
            }


        } else {
            // 如果查无数据，提示用户并清空产品主图列表
            ElMessage.error(`此型号查无数据`)
            mainPicList.value = [];
            mainProductList.value = []
        }
    } else {
      // 如果API请求失败，提示错误信息
      ElMessage.error(`[${productInfoResp.errcode}]${productInfoResp.errmsg}`)
    }

}
/**
 * 模糊搜索列表选择产品
 * @param index 选中的产品索引
 */
const onSelectProduct = (index?: number) => {
    productListActiveIndex.value = index as number // 更新激活索引
    Object.assign(currentProduct, productList[index as number]) // 将选中产品信息赋值给当前选中产品
    // 更新搜索框内容为选中产品的型号或产品编码
    if (productSearchObj.productSearchField === 'model') {
        productSearchObj.productSearchFieldContent = productList[productListActiveIndex.value].model
    } else {
        productSearchObj.productSearchFieldContent = productList[productListActiveIndex.value].itemCode
    }
    isShowProductSearchPopup.value = false // 隐藏搜索结果弹窗
    dealImage() // 处理产品图片显示
}
/**
 * 模糊搜索列表上移
 * @param index 当前索引 (参数未实际使用)
 */
const onMoveProductUp = (index) => {
    if (productListActiveIndex.value > 0) {
        productListActiveIndex.value-- // 索引减一
    }
}
/**
 * 模糊搜索列表下移
 * @param index 当前索引 (参数未实际使用)
 */
const onMoveProductDown = (index) => {
    if (productListActiveIndex.value < productList.length - 1) {
        productListActiveIndex.value++ // 索引加一
    }
}

/**
 * 重置产品搜索字段内容
 * @param e 事件对象 (参数未实际使用)
 */
const resetSearchFieldContent = (e?: Event) => {
    productSearchObj.productSearchFieldContent = null // 清空搜索内容
}
/**
 * 处理产品图片显示
 */
const dealImage = () => {
    let tempObj: any = currentProduct;
    currentCategory.value = tempObj.categoryId; // 更新当前品类ID
    // 检查当前品类是否在白名单中
    if(!checkCategoryIdIsInWhiteList(currentCategory.value)){
        currentCategoryIsInWhtieList.value = false; // 不在白名单中
        list.value = []; // 清空预置场景列表
    }else{
        currentCategoryIsInWhtieList.value = true; // 在白名单中

    }
    let _mainPicList = tempObj?.mainPicList;
    if(_mainPicList){
        mainPicList.value = []; // 清空产品主图列表
        // 遍历主图列表，构建新的产品主图列表项
        _mainPicList.forEach((item: string) => {

            mainPicList.value.push({
                selected: false, // 默认为未选中
                image_url: item, // 图片URL
                perspective: null, // 视角默认为null
            })
        })
    }else{
        // 如果没有主图数据，提示用户
        ElMessage({
            message: '你选择的型号没有主图数据',
            type: 'warning'
        })
    }

}
/**
 * 选择产品图片
 * 根据选择的产品图的视角走不同的工作流
 * @param index 选中的产品图索引
 */
const onSelectProductMainPic = async(index: number)=>{
    // 如果正在识别视角，则不允许操作
    if(perspectiveLoading){
        return;
    }
    // 将所有产品图设置为未选中，然后选中当前点击的图片
    mainPicList.value.forEach(item => {
        item.selected = false;
    });
    mainPicList.value[index].selected = true;
    currentProductImageURL.value = mainPicList.value[index].image_url; // 更新当前选择的产品图URL

    // 如果当前品类不在白名单中，清空预置场景列表
    if(!currentCategoryIsInWhtieList.value){
        list.value = [];
    }

    // 如果当前产品图还没有识别出视角
    if(!mainPicList.value[index].perspective){
        viewRecognitionLoading.value = true; // 显示视角识别加载状态
        // 调用API识别产品视角
        const detecProductPerspectiveResp: any = await AiPicUrlApi.detecProductPerspective({
            category : currentCategory.value,
            image_url : currentProductImageURL.value,
            gen_seq : 0, // 生成序列号，默认为0
        });
        if(detecProductPerspectiveResp.errcode == 0){
            viewRecognitionLoading.value = false; // 隐藏视角识别加载状态
            let perspective = detecProductPerspectiveResp.data.perspective; // 获取识别到的视角
            currentView.value = perspective; // 更新当前视角
            mainPicList.value[index].perspective = currentView.value; // 将视角保存到产品图项中
            // 如果视角为unknown，显示识别失败提示并切换到手动上传场景图
            if(perspective == 'unknown'){
                detectProductPerspectiveFail.value = true;
                sceneType.value = '2';
                list.value = []; // 清空预置场景
                currentSelect.value = -1;
                currentSelectBg.value = '';
            }else{
                detectProductPerspectiveFail.value = false;
            }

            // 如果视角为front，查询预置场景列表
            if(perspective == 'front'){
                queryPresetSceneList();
            }
            // 如果视角不是front，清空预置场景列表并切换到手动上传场景图
            else{
                list.value = [];
                currentSelect.value = -1;
                currentSelectBg.value = '';
                sceneType.value = '2';
            }
        }else{
            // 如果API请求失败，隐藏加载状态，显示识别失败提示并切换到手动上传场景图
            viewRecognitionLoading.value = false;
            detectProductPerspectiveFail.value = true;
            sceneType.value = '2';
        }
    }
    // 如果当前产品图已经识别出视角
    else{
        currentView.value = mainPicList.value[index].perspective; // 更新当前视角
        // 如果视角为front，查询预置场景列表
        if(mainPicList.value[index].perspective == 'front'){
            queryPresetSceneList();
        }
        // 如果视角不是front，清空预置场景列表并切换到手动上传场景图
        else{
            list.value = [];
            currentSelect.value = -1;
            currentSelectBg.value = '';
            sceneType.value = '2';
        }
    }
}

// 合成图片后的二次点击确认切换场景或产品
const onConfirmChange = () => {
    dialogVisible.value = false // 隐藏弹窗
    generateSceneProcessState.value = 0 // 重置生成状态为未开始
    // 根据弹窗标记执行相应的操作
    if (dialogVisibleFlag.value === 'bg') {
        // 切换背景图
        currentSelect.value = tempIndex.value
        currentSelectBg.value = list.value[currentSelect.value].preview_url
        bottomImg.value = list.value[currentSelect.value].image_url
    } else if (dialogVisibleFlag.value === 'changeProduct') {
        // 切换产品 (目前未实现)
        mainProductList.value = allProductList.value
    } else {
        // 点击试一试
        productSearchObj.productSearchFieldContent = tempTryCode.value
        productSearchObj.productSearchField = 'model' // 按型号搜索
        onSearch('try') // 触发搜索
    }
}

// 隐藏产品搜索结果弹窗
const hideOverlay = (event: MouseEvent) => {
    // 如果点击的不是搜索结果弹窗或搜索框，则隐藏弹窗并清空列表
    if (searchProductResultDiv.value && !(searchProductResultDiv.value as HTMLElement).contains(event.target as Node)) {
        isShowProductSearchPopup.value = false
        productList.splice(0, productList.length)
        productListActiveIndex.value = 0
    }
}


// 点击试一试推荐型号
const clickTry = (code: string) => {
    // 如果已经生成了图片且状态为成功，弹出确认弹窗
    if (upperImg && generateSceneProcessState.value === 3) {
        dialogVisible.value = true
        dialogVisibleFlag.value = 'try' // 标记为点击试一试
        tempTryCode.value = code // 保存试一试型号代码
    } else {
        // 否则直接更新搜索框内容并触发搜索
        productSearchObj.productSearchFieldContent = code
        productSearchObj.productSearchField = 'model'
        showSearchProductLoading.value = true
        onSearch('try')
    }
}


// 切换重绘结果显示模式时的处理函数 (目前未实现具体逻辑)
const onChangRepaintResultSwitchMode = async()=>{

}

// 点击洗图按钮触发重绘
const onRepaint = async()=>{

    // await genImage(); // 生成画布图片 (目前不在这里生成)
    // await genMaskImage(); // 生成蒙版图片 (目前不在这里生成)
    let query = {
        image_url: uploadPicUrl.value, // 默认使用uploadPicUrl作为重绘图片
        strength: 2, // 重绘强度，默认为2
        gen_seq: generateNum.value // 生成序列号
    };
    // 如果有uploadPicUrl，使用genSceneRepaintCacheImgURL或uploadPicUrl作为重绘图片
    if(uploadPicUrl.value){
        query.image_url = genSceneRepaintCacheImgURL.value || uploadPicUrl.value;
    }
    // 如果有backgroundImage.url，使用genSceneRepaintCacheImgURL或backgroundImage.url作为重绘图片
    if(backgroundImage.url){
        query.image_url = genSceneRepaintCacheImgURL.value || backgroundImage.url;
    }
    // 调用API进行场景图重绘
    const genSceneRepaintResp: any = await AiPicUrlApi.genSceneRepaint(query);
    if(genSceneRepaintResp.errcode == 0){
        let genSceneRepaintTaskId = genSceneRepaintResp.data.task_id; // 获取任务ID
        genSceneRepaintProcessState.value = 1; // 设置重绘状态为进行中
        // 轮询查询重绘结果
        loopRequestGenerateResult(genSceneRepaintTaskId,(loopResultResp: any)=>{
            // 根据轮询结果更新重绘过程文本提示
            if(loopResultResp.data.waiting_count){
                genSceneRepaintProcessText.value = `排队中，前面还有${loopResultResp.data.waiting_count}个任务，请耐心等待...`;
            }else{
                genSceneRepaintProcessText.value = `图片正在努力重绘中，请耐心等待...`;
            }
        })
		.then((resultResp: any) => {
            genSceneRepaintProcessState.value = 2; // 设置重绘状态为成功

            // 如果结果成功且状态为3
    
            if(resultResp.errcode == 0){
                genSceneRepaintResultImgURL.value = resultResp.data.result.images[0].url; // 获取重绘结果图片URL
                repaintResultSwitchMode.value = '1'; // 切换到对比模式
                // 如果是侧视图场景，更新uploadPicUrl并清空画布
                if(uploadPicUrl.value){
                    
                    genSceneRepaintCacheImgURL.value = uploadPicUrl.value; // 缓存原图URL
                    uploadPicUrl.value = resultResp.data.result.images[0].url; // 更新场景图URL
                    clearBrush(); // 清空画布涂抹区域
                }
                // 如果是正视图场景，更新backgroundImage.url
                if(backgroundImage.url){
                    genSceneRepaintCacheImgURL.value = backgroundImage.url; // 缓存原图URL
                    backgroundImage.url = resultResp.data.result.images[0].url; // 更新背景图URL
                }
            }
		})
		.catch(error => {
            // 如果重绘失败
			genSceneRepaintProcessState.value = 3; // 设置重绘状态为失败
			console.error('Error:', error);
			// let {errcode,errmsg} = error;
			// generateFailMsg.value = `[${errcode}]${errmsg}`; // 可以设置失败信息
		});
    }else{
        // 如果API请求失败，提示错误信息
        ElMessage({
            message: `[${genSceneRepaintResp.errcode}]${genSceneRepaintResp.errmsg}`,
            type: 'error'
        })

    }
}

// 点击还原按钮，恢复重绘前的场景图
const onUndoRepaint = ()=>{
    // 如果是侧视图场景，恢复uploadPicUrl
    if(uploadPicUrl.value){
        uploadPicUrl.value = genSceneRepaintCacheImgURL.value;
    }
    // 如果是正视图场景，恢复backgroundImage.url
    if(backgroundImage.url){
        backgroundImage.url = genSceneRepaintCacheImgURL.value;
    }
    genSceneRepaintResultImgURL.value = ''; // 清空重绘结果URL
    repaintResultSwitchMode.value = '2'; // 切换回涂抹编辑模式
}

// 获取抠图产品图的任务ID
const currentGetObjectMattingTaskId: Ref<number> = ref(0)
// 下载图片ID
const downImageId: Ref<string> = ref('')
// 生成过程文本提示
const generateProcessText: Ref<string> = ref('')
/**
 * 选择的是预置场景，则调用getReplaceProduct接口进行生成
 */
const generatePresetScene = async()=>{
    // 检查是否选择了产品图
    if(!currentProductImageURL.value){
        ElMessage({
            message: `请先选择产品图`,
            type: 'warning'
        })
        return;
    }

    // 检查是否选择了预置场景图
    if(!currentSelectBg.value){
        ElMessage({
            message: `请选择预置场景图`,
            type: 'warning'
        })
        return;
    }
    generateSceneProcessState.value = 2 // 设置生成状态为进行中

    // 调用API进行预置场景产品替换生成
    const getObjectMattingResp: any = await AiPicUrlApi.getReplaceProduct({
        scene_code: list.value[currentSelect.value].code, // 预置场景代码
        product_url: currentProductImageURL.value, // 产品图URL
        gen_seq: generateNum.value // 生成序列号
    })
    if (getObjectMattingResp.errcode == 0) {
        currentGetObjectMattingTaskId.value = getObjectMattingResp.data.task_id // 获取任务ID
        generateNum.value += 1 // 生成次数加一
        // 轮询查询生成结果
        loopRequestGenerateResult(currentGetObjectMattingTaskId.value, (loopResultResp: any) => {
            // 根据轮询结果更新生成过程文本提示
           
            if (loopResultResp.data.waiting_count) {
                generateProcessText.value = `排队中，前面还有${loopResultResp.data.waiting_count}个任务，请耐心等待...`
            } else {
                generateProcessText.value = `图片正在努力生成中，请耐心等待...`
            }
        })
            .then((resultResp: any) => {
             
                generateSceneProcessState.value = resultResp.data.state // 更新生成状态
                // 如果生成成功且状态为3
                if (resultResp.errcode == 0 && resultResp.data.state === 3) {
                    let maskListResp = resultResp.data.result.images[0].url // 获取生成结果图片URL
                    upperImg.value = maskListResp // 将生成结果设置为上层图
                    downImageId.value = resultResp.data.result.images[0].id // 保存下载图片ID
                }
                // 如果生成失败且状态为4
                else if (resultResp.errcode == 0 && resultResp.data.state === 4) {
                  generateSceneProcessState.value = 5 // 设置生成状态为错误
                  generateFailMsg.value  = '生成失败，请重试' // 设置失败信息
                }
            })
         
            .catch((error) => {
                // 如果请求或生成过程中发生错误
                generateSceneProcessState.value = 5 // 设置生成状态为错误
                console.error('Error:', error)
                generateFailMsg.value  = error.errmsg // 设置失败信息
            })
    } else {
        // 如果API请求失败，设置生成状态为错误并显示错误信息
        generateSceneProcessState.value = 5
        generateFailMsg.value  = `${getObjectMattingResp.errmsg}`
  
    }
}


/**
 * 点击立即生成按钮，根据场景类型，调用不同的生成接口
 * 如果是预置场景，则走generatePresetScene
 * 如果是自定义场景，则走generateCustomScene
 */
const onGenerate = async () => {
    // 如果是预置场景，调用generatePresetScene
    if(sceneType.value == '1'){
        generatePresetScene();
    }

    // 如果是自定义场景，调用generateCustomScene
    if(sceneType.value == '2'){
        generateCustomScene();
    }
}
/**
 * 上传自定义场景的生成分支
 * 如果选择的产品图是正视图，则调用genReplaceProductCustomFront
 * 如果选择的产品图是侧视图，则调用genReplaceProductCustomSide
 */
const generateCustomScene = async()=>{
    // 检查是否选择了产品图
    if(!currentProductImageURL.value){
        ElMessage({
            message: `请先选择或上传产品图`,
            type: 'warning'
        })
        return;
    }
    // 如果产品图是正视图
    if(currentView.value == 'front'){
        // 检查是否上传了场景图
        if(!backgroundImage.url){
            ElMessage({
                message: `请先上传场景图`,
                type: 'warning'
            })
            return;
        }
        generateSceneProcessState.value = 2 // 设置生成状态为进行中

        bottomImg.value = backgroundImage.url; // 设置底图为背景图
        let params = {
            scene_url: backgroundImage.url, // 场景图URL
            product_url: overImage.url, // 抠图产品图URL
            product_rect: getModelRect(), // 产品图在场景图上的位置和尺寸
            gen_seq: generateNum.value // 生成序列号
        }
        // 调用API进行自定义正视图场景产品替换生成
        const genReplaceProductCustomFrontResp:any = await AiPicUrlApi.genReplaceProductCustomFront(params);
        if (genReplaceProductCustomFrontResp.errcode == 0) {
            let taskId = genReplaceProductCustomFrontResp.data.task_id // 获取任务ID
            generateNum.value += 1 // 生成次数加一
            // 轮询查询生成结果
            loopRequestGenerateResult(taskId, (loopResultResp: any) => {
                // 根据轮询结果更新生成过程文本提示
                if (loopResultResp.data.waiting_count) {
                    generateProcessText.value = `排队中，前面还有${loopResultResp.data.waiting_count}个任务，请耐心等待...`
                } else {
                    generateProcessText.value = `图片正在努力生成中，请耐心等待...`
                }
            })
            .then((resultResp: any) => {
                generateSceneProcessState.value = resultResp.data.state // 更新生成状态
                // 如果生成成功且状态为3
            
                if (resultResp.errcode == 0 && resultResp.data.state === 3) {
                    let maskListResp = resultResp.data.result.images[0].url // 获取生成结果图片URL
                    upperImg.value = maskListResp // 将生成结果设置为上层图
                    downImageId.value = resultResp.data.result.images[0].id // 保存下载图片ID
                }
                // 如果生成失败且状态为4
                else if (resultResp.errcode == 0 && resultResp.data.state === 4) {
                    generateSceneProcessState.value = 5 // 设置生成状态为错误
                    generateFailMsg.value  = '生成失败，请重试' // 设置失败信息
                }
            })
            .catch((error) => {
        
                // 如果请求或生成过程中发生错误
                generateSceneProcessState.value = 5 // 设置生成状态为错误
                console.error('Error:', error)
                generateFailMsg.value  = error.errmsg // 设置失败信息
            })
        } else {
            // 如果API请求失败，设置生成状态为错误并显示错误信息
            generateSceneProcessState.value = 5
            generateFailMsg.value  = `${genReplaceProductCustomFrontResp.errmsg}`
   
        }
    }
    // 如果产品图是侧视图
    else if(currentView.value !== 'front'){
        // 检查是否上传了场景图
        if(!uploadPicUrl.value){
            ElMessage({
                message: `请先上传场景图`,
                type: 'warning'
            })
            return;
        }
        generateSceneProcessState.value = 2 // 设置生成状态为进行中
        bottomImg.value = uploadPicUrl.value; // 设置底图为上传的场景图
        await genImage(); // 生成画布图片
        await genMaskImage(); // 生成蒙版图片
        let params = {
            scene_url: finalUploadPicUrl.value, // 最终用于生成的场景图URL
            mask_url: uploadPicMaskUrl.value, // 蒙版图片URL
            product_url: currentProductImageURL.value, // 产品图URL
            gen_seq: generateNum.value // 生成序列号
        }
        // 调用API进行自定义侧视图场景产品替换生成
        const genReplaceProductCustomSideResp:any = await AiPicUrlApi.genReplaceProductCustomSide(params);
        if (genReplaceProductCustomSideResp.errcode == 0) {
            let taskId = genReplaceProductCustomSideResp.data.task_id // 获取任务ID
            generateNum.value += 1 // 生成次数加一
            // 轮询查询生成结果
            loopRequestGenerateResult(taskId, (loopResultResp: any) => {
                // 根据轮询结果更新生成过程文本提示
                if (loopResultResp.data.waiting_count) {
                    generateProcessText.value = `排队中，前面还有${loopResultResp.data.waiting_count}个任务，请耐心等待...`
                } else {
                    generateProcessText.value = `图片正在努力生成中，请耐心等待...`
                }
            })
            .then((resultResp: any) => {
                generateSceneProcessState.value = resultResp.data.state // 更新生成状态
                // 如果生成成功且状态为3
            
                if (resultResp.errcode == 0 && resultResp.data.state === 3) {
                    let maskListResp = resultResp.data.result.images[0].url // 获取生成结果图片URL
                    upperImg.value = maskListResp // 将生成结果设置为上层图
                    downImageId.value = resultResp.data.result.images[0].id // 保存下载图片ID
                }
                // 如果生成失败且状态为4
                else if (resultResp.errcode == 0 && resultResp.data.state === 4) {
                    generateSceneProcessState.value = 5 // 设置生成状态为错误
                    generateFailMsg.value  = '生成失败，请重试' // 设置失败信息
                }
            })
            .catch((error) => {
        
                // 如果请求或生成过程中发生错误
                generateSceneProcessState.value = 5 // 设置生成状态为错误
                console.error('Error:', error)
                generateFailMsg.value  = error.errmsg // 设置失败信息
            })
        } else {
            // 如果API请求失败，设置生成状态为错误并显示错误信息
            generateSceneProcessState.value = 5
            generateFailMsg.value  = `${genReplaceProductCustomSideResp.errmsg}`
   
        }
    }
}




/* Start - 选择社区/我的图片 - Start */

// 显示社区/我的图片列表弹窗
const showGalleryDialog = (type: number) => {
    // 如果类型为2 (产品图)，且没有背景图，则提示用户先选择场景图
    if (type === 2 && !backgroundImage.visible) {
        ElMessage({
            message: '请先选择场景图',
            type: 'error'
        })
        return
    }
    galleryDialogConfig.imgType = type // 设置图片类型
    galleryDialogConfig.visible = true // 设置弹窗可见
}

// 关闭或确认社区/我的图片列表弹窗
const closeOrConfirmDialog = (imgURL: string | false) => {
    // 如果返回了图片URL
    if (imgURL) {
        // 如果图片类型为1 (场景图)
        if (galleryDialogConfig.imgType === 1) {
            genSceneRepaintCacheImgURL.value = ''; // 清空重绘缓存URL
            // 检查是否确定了产品图视角
            if(!currentView.value || currentView.value == 'unknown'){
                ElMessage({
                    message: `请先确定产品图视角`,
                    type: 'error'
                })
                return false;
            }
            // 如果产品图是正视图，将URL赋值给backgroundImage.url
            if(currentView.value == 'front'){
                backgroundImage.url = imgURL;
                dealMattingImg(); // 处理抠图产品图
            }
            // 如果产品图是侧视图，将URL赋值给uploadPicUrl
            else{
                uploadPicUrl.value = imgURL;
            }
        }
        backgroundImage.visible = true // 设置背景图可见 (此visible属性未直接控制显示)
    }
    galleryDialogConfig.visible = false // 关闭弹窗
}
/* End - 选择社区/我的图片 - End */



/**
 * 手动上传产品图成功回调
 * @param response API返回的响应数据
 * @param uploadFile 上传的文件对象
 */
const onUploadProductPicSuccess: UploadProps['onSuccess'] = (response, uploadFile) => {
    if (response.errcode == 0) {
        customUploadProductPic.value = response.data.url; // 保存上传的产品图URL
        currentProductImageURL.value = customUploadProductPic.value; // 更新当前选择的产品图URL
        list.value = []; // 清空预置场景列表
        currentSelect.value = -1;
        currentSelectBg.value = '';
        sceneType.value = '2'; // 切换到手动上传场景图
    }
}

/**
 * 手动上传场景图成功回调
 * @param response API返回的响应数据
 * @param uploadFile 上传的文件对象
 */
const onUploadSuccess: UploadProps['onSuccess'] = (response, uploadFile) => {
    if (response.errcode == 0) {
        genSceneRepaintCacheImgURL.value = ''; // 清空重绘缓存URL
        // 检查是否确定了产品图视角
        if(!currentView.value || currentView.value == 'unknown'){
            ElMessage({
                message: `请先确定产品图视角`,
                type: 'error'
            })
            return false;
        }
        // 如果产品图是正视图，将URL赋值给backgroundImage.url
        if(currentView.value == 'front'){
            backgroundImage.url = response.data.url;
            dealMattingImg(); // 处理抠图产品图
        }
        // 如果产品图是侧视图，将URL赋值给uploadPicUrl
        else{
            uploadPicUrl.value = response.data.url;
        }

    }
}

// 拿产品图去抠图并放置在场景图上方以便产品图可以在场景图上方拖拽移动
const dealMattingImg = async () => {
    let params = {
        product_url: currentProductImageURL.value // 产品图URL
    }
    // 调用API进行产品抠图
    const getObjectMattingResp: any = await AiPicUrlApi.genProductMatting(params)
    if (getObjectMattingResp.errcode == 0) {
        currentProductImageMattingURL.value = getObjectMattingResp.data.image_url; // 获取抠图后的产品图URL
        getAndSetOverImage(currentProductImageMattingURL.value) // 获取并设置可拖拽产品图信息
    }
}


// 获取裁切后的产品图的大小，并设置可拖拽产品图的状态
const getAndSetOverImage = (src: string) => {
    state.imageLoaded = false // 设置图片加载状态为false
    state.scale = 0.5 // 重置缩放比例
    // 显示加载动画
    const loading = ElLoading.service({
        lock: true,
        text: '图片加载中...',
        background: 'rgba(0, 0, 0, 0.7)'
    })
    // 加载图片
    loadImage(src).then((img) => {
        // 处理最大宽高，避免超出背景图
        if (img.height * state.scale > backgroundImage.renderHeight) {
        
            state.scale = (backgroundImage.renderHeight / img.height) * 0.6 // 根据背景图高度调整缩放比例
        }
        state.width = img.width * state.scale // 计算可拖拽产品图宽度
        state.height = img.height * state.scale // 计算可拖拽产品图高度
        state.posX = 0 // 重置X轴位置
        state.posY = 0 // 重置Y轴位置
        state.imageLoaded = true // 设置图片加载状态为true

        // 更新可拖拽产品图的渲染尺寸和自然尺寸
        overImage.renderWidth = state.width
        overImage.renderHeight = state.height
        
        overImage.naturalWidth = img.naturalWidth
        overImage.naturalHeight = img.naturalHeight
        overImage.url = src // 设置可拖拽产品图URL
        overImage.visible = true // 设置可见
        loading.close() // 关闭加载动画
    })
}

// 监听背景图DOM引用变化，调整容器和可拖拽产品图的位置和尺寸
watch(
    () => backgroundImageDiv.value,
    (bgImg: HTMLImageElement | null) => { // 明确类型为HTMLImageElement或null
        if (bgImg) {
            bgImg.onload = () => {
                // 更新背景图的渲染尺寸和自然尺寸
                backgroundImage.renderWidth = bgImg.width
                backgroundImage.renderHeight = bgImg.height
                backgroundImage.naturalWidth = bgImg.naturalWidth
                backgroundImage.naturalHeight = bgImg.naturalHeight
                // 调整容器尺寸与背景图一致
                if (container.value) { // 检查container是否存在
                    (container.value as HTMLElement).style.width = `${bgImg.width}px` // 使用类型断言
                    (container.value as HTMLElement).style.height = `${bgImg.height}px` // 使用类型断言
                }
          
                // 重置可拖拽产品图位置
                state.posX = 0
                state.posY = 0
            }
        }
    }
)
// 计算产品图在场景图上的位置和尺寸比例，用于API调用
const getModelRect = () => {
    const bgWidthRatio = backgroundImage.naturalWidth / backgroundImage.renderWidth // 计算背景图自然宽度与渲染宽度的比例
    const personHeight = state.height * bgWidthRatio, // 计算产品图在自然尺寸背景图上的高度
        personWidth = state.width * bgWidthRatio // 计算产品图在自然尺寸背景图上的宽度
    let posY = state.posY * bgWidthRatio, // 计算产品图在自然尺寸背景图上的Y轴位置
    
        posX = state.posX * bgWidthRatio // 计算产品图在自然尺寸背景图上的X轴位置
    return {
        x: posX,
        y: posY,
        w: personWidth,
        h: personHeight
    }
}

// 下载生成结果图片
const onDownLoad = async () => {
    // 调用API下载图片
    const downloadImageResp: any = await AiPicUrlApi.downloadImage({
        source: currentSource.value, // 来源
        image_ids: [downImageId.value] // 图片ID列表
    })
    if (downloadImageResp.errcode === 0) {
  
        // 如果返回的URL不包含'zip'，直接下载单张图片
        if (downloadImageResp.data.url.indexOf('zip') == -1) {
            downloadImage(downloadImageResp.data.url, `image_${downImageId.value}`)
        }
        // 如果返回的URL包含'zip'，在新窗口打开链接（通常是压缩包）
        else {
            window.open(downloadImageResp.data.url)
        }
    } else {
        // 如果API请求失败，提示下载失败
        ElMessage({
            message: `下载失败，[${downloadImageResp.errcode}]${downloadImageResp.errmsg}`,
            type: 'warning'
       
        })
    }
}

// 点击保存到我的图库
const onSave = async () => {
    // 调用API保存图片到我的图库
    const saveToMineResp = await AiPicUrlApi.saveToMine({
        source: currentSource.value, // 来源
        image_ids: [downImageId.value] // 图片ID列表
    })
    if (saveToMineResp.errcode == 0) {
        // 保存成功提示
        ElMessage({
            message: '保存成功',
            type: 'success'
        })
    } else {
  
        // 保存失败提示
        ElMessage({
            message: `保存失败，[${saveToMineResp.errcode}]${saveToMineResp.errmsg}`,
            type: 'warning'
        })
    }
}





/* Start - 画布编辑 (Fabric.js) - Start */

// 初始化画布（只在需要时创建）
const initializeCanvas = (img: HTMLImageElement) => {

  // 检查是否已有画布实例，避免重复创建
  if (!canvasRef) {
    // 获取画布DOM元素
    const canvasElement = document.querySelector("#canvas") as HTMLCanvasElement;
    if (!canvasElement) {
      console.error("Canvas element not found");
      return;
    }

    // 创建新的 fabric.Canvas 实例
    canvasRef = new fabric.Canvas(canvasElement, {
      //selection: false, // 禁用选择功能 (根据需求可开启)
      isDrawingMode: false, // 初始禁用绘图模式
      devicePixelRatio: true, // 启用设备像素比，提高清晰度
    });
  }
  console.log(img.src);

  // 清空画布内容
  canvasRef.clear();

  // 创建并添加图片到画布
  fabric.Image.fromURL(img.src, (fabricImg) => {
    // 设置图片的缩放比例和位置，使其适应画布尺寸
    fabricImg.set({
      left: 0,
      top: 0,
      scaleX: canvasRef!.width! / img.width, // 使用!断言canvasRef不为null
      scaleY: canvasRef!.height! / img.height, // 使用!断言canvasRef不为null
      selectable: false, // 禁止选择背景图
      evented: false, // 禁止背景图响应事件
    });

    // 将图片添加到画布
    canvasRef!.add(fabricImg); // 使用!断言canvasRef不为null

    canvasRef!.renderAll(); // 重新渲染画布
    customizeControls(); // 自定义控制点样式

  });

  // 动态调整画布大小
  resizeCanvasAndImage(img);
  enableRectMode(); // 默认启用矩形模式

};
    // 移除旋转控制点
    const removeRotationControls = () => {
      // 隐藏旋转控制点（mtr）
      fabric.Object.prototype.controls.mtr.visible = false;
      // 禁用旋转功能
      (fabric.Object.prototype as any).hasRotatingPoint = false; // 使用any绕过类型检查
    };
    // 自定义控制点样式
    const customizeControls = () => {
      // 定义控制点属性
      const controlProperties = {
        size: 8, // 控制点大小
        fill: 'rgb(121.3,187.1,255)', // 控制点填充颜色 (Element Plus 主题色)
        stroke: 'white', // 控制点边框颜色
        strokeWidth: 1, // 控制点边框宽度
        cornerStyle: 'circle', //控制点形状（circle 或 rect）
      };
      // 定义控制点的渲染逻辑
      const renderControl = (ctx: CanvasRenderingContext2D, left: number, top: number, styleOverride: any, fabricObject: fabric.Object) => { // 明确参数类型
        const size = styleOverride.cornerSize || controlProperties.size;
        ctx.save();
        ctx.fillStyle = styleOverride.cornerColor || controlProperties.fill;
        ctx.strokeStyle = controlProperties.stroke;
        ctx.lineWidth = controlProperties.strokeWidth;
        ctx.beginPath();
        if (styleOverride.cornerStyle === 'circle') {
          ctx.arc(left, top, size / 2, 0, 2 * Math.PI, false);
        } else {
          ctx.rect(left - size / 2, top - size / 2, size, size);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      removeRotationControls(); // 移除旋转控制点
      // 修改默认控制点渲染逻辑和样式
      Object.values(fabric.Object.prototype.controls).forEach((control) => {
        control.render = renderControl;
        control.cornerSize = controlProperties.size;
        control.cornerColor = controlProperties.fill;
        control.cornerStyle = controlProperties.cornerStyle;
      });
    };

let isDrawing = false; // 是否正在绘制矩形
    let startPoint: { x: number; y: number } | null = null; // 矩形起始点
    let rect: fabric.Rect | null = null; // 矩形对象
// 启用矩形绘制模式
const enableRectMode = ()=>{
     // 监听鼠标按下事件
     canvasRef!.on('mouse:down', (options: fabric.IEvent) => { // 使用!断言，明确options类型
        if (options.target) return; // 如果点击的是已有对象（如矩形），则不绘制新矩形
        isDrawing = true;
        const pointer = canvasRef!.getPointer(options.e); // 使用!断言
        startPoint = { x: pointer.x, y: pointer.y };

        // 创建矩形对象
        rect = new fabric.Rect({
            left: startPoint.x,
            top: startPoint.y,
            width: 0,
            height: 0,
            fill: 'rgba(0,0,0,.5)', // 半透明黑色填充
            stroke: 'rgba(0,0,0,.5)', // 半透明黑色边框
            strokeWidth: 1,
            selectable: true, // 允许选中
            hasControls: true, // 显示控制点
            hasBorders: false, // 不显示边框
            hasRotatingPoint:false // 禁用旋转控制点
        });
        canvasRef!.add(rect); // 使用!断言
      });
    // 监听鼠标移动事件
    canvasRef!.on('mouse:move', (options: fabric.IEvent) => { // 使用!断言，明确options类型
        if (!isDrawing || !rect || !startPoint) return; // 检查状态和对象是否存在
        const pointer = canvasRef!.getPointer(options.e); // 使用!断言

        // 更新矩形的宽度和高度
        rect.set({
          width: Math.abs(pointer.x - startPoint.x),
          height: Math.abs(pointer.y - startPoint.y),
        });

        // 调整矩形的起始点，使其始终为左上角
        if (pointer.x < startPoint.x) {
          rect.set({ left: pointer.x });
        }
        if (pointer.y < startPoint.y) {
          rect.set({ top: pointer.y });
        }

        canvasRef!.renderAll(); // 重新渲染画布
      });
    // 监听鼠标释放事件
    canvasRef!.on('mouse:up', () => { // 使用!断言
        isDrawing = false; // 结束绘制
      });
    }

// 动态调整画布大小
const resizeCanvasAndImage = (img: HTMLImageElement) => {
  const container = document.getElementById("canvasBox");
  if (!container || !canvasRef) return;
  const containerWidth = container.clientWidth; // 获取容器宽度
  const imageAspectRatio = img.height / img.width; // 计算图片宽高比
  const canvasWidth = containerWidth; // 设置画布宽度为容器宽度
  const canvasHeight = canvasWidth * imageAspectRatio; // 根据宽高比计算画布高度
  canvasWidthRef.value = canvasWidth; // 更新画布渲染宽度
  canvasHeightRef.value = canvasHeight; // 更新画布渲染高度

  // 设置画布的宽高
  canvasRef.setWidth(canvasWidth);
  canvasRef.setHeight(canvasHeight);
  canvasRef.freeDrawingBrush.color = brushColor.value; // 设置画笔颜色
  canvasRef.freeDrawingBrush.width = brushNum.value; // 设置画笔粗细
};

// 切换笔刷类型（矩形或画笔）
const onChangBrushType = ()=>{
    if(brushType.value == '1'){
        canvasRef!.isDrawingMode = false; // 禁用自由绘图模式
        enableRectMode(); // 启用矩形模式
    }
    if(brushType.value == '2'){
        canvasRef!.isDrawingMode = true; // 启用自由绘图模式
        // 移除矩形模式的鼠标事件监听器
        canvasRef!.off('mouse:down');
        canvasRef!.off('mouse:move');
        canvasRef!.off('mouse:up');
    }
}


// 修改画笔粗细
const changeBrushNum = () => {
  canvasRef!.freeDrawingBrush.width = brushNum.value; // 设置画笔粗细
  //changeAction(fabricStatus.value ? 'erase' : 'undoErasing'); // 如果需要橡皮擦功能，可以实现
};
// 清空画布上的涂抹（矩形和路径）
const clearBrush = ()=>{
        // 获取所有对象
    canvasRef!.getObjects().forEach(function(obj) { // 使用!断言
        // 判断对象类型是否为 fabric.Rect 或 fabric.Path
        if (obj instanceof fabric.Rect) {
            canvasRef!.remove(obj); // 删除矩形对象
        }
        if (obj instanceof fabric.Path) {
            canvasRef!.remove(obj); // 删除路径对象
        }
    });
}



/**
 * 生成画布图片（用于自定义侧视图场景的底图）
 */
const genImage = async()=>{
    return new Promise(async(resolve) => {

        // 将缩放后的隐藏canvas内容转为Blob
        (document.querySelector('#resizedCanvas') as HTMLCanvasElement).toBlob(async(blob) => { // 使用类型断言
            // 创建 FormData 对象
            const formData = new FormData();

            // 添加 Blob 数据到 FormData
            formData.append('file', blob as Blob, 'canvas-bg-image.png'); // 文件名可以自定义，使用类型断言

            // 调用API上传图片
            const uploadMaskResp = await AiPicUrlApi.uploadImage(formData)
            if (uploadMaskResp.errcode == 0) {
                finalUploadPicUrl.value = uploadMaskResp.data.url; // 保存上传成功后的URL
                resolve(null); // 解决Promise
            } else {
                // 上传失败处理
            }
        },'image/png'); // 指定输出格式为PNG
    })

}
/**
 * 生成蒙版图片（用于自定义侧视图场景的抠图蒙版）
 */
const genMaskImage = async()=>{
    return new Promise(async(resolve) => {

        // 获取用于生成蒙版的隐藏canvas
        const brushCanvas = new fabric.Canvas('brushCanvas');
        // 设置新 canvas 的尺寸为最终用于生成的图片尺寸
        const newWidth = finalImageWidth.value;
        const newHeight = finalImageHeight.value;
        // 调用复制方法，将主canvas上的绘制内容复制到蒙版canvas
        await copyCanvasUsingJSON(canvasRef!, brushCanvas, newWidth, newHeight); // 使用!断言
        // 将蒙版canvas内容转为Blob
        (document.querySelector('#brushCanvas') as HTMLCanvasElement).toBlob(async(blob) => { // 使用类型断言
            // 创建 FormData 对象
            const formData = new FormData();

            // 添加 Blob 数据到 FormData
            formData.append('file', blob as Blob, 'canvas-image.png'); // 文件名可以自定义，使用类型断言

            // 调用API上传蒙版图片
            const uploadMaskResp = await AiPicUrlApi.uploadImage(formData)
            if (uploadMaskResp.errcode == 0) {
                uploadPicMaskUrl.value = uploadMaskResp.data.url; // 保存上传成功后的URL
                resolve(null); // 解决Promise
            } else {
                // 上传失败处理
            }
        },'image/png'); // 指定输出格式为PNG
    })
}


/**
 * 把画布上的路径和矩形复制到新画布（还原原图大小的画布）上，并设置为白色，背景黑色
 * @param originalCanvas 原始 Fabric.js 画布实例
 * @param newCanvas 新的 Fabric.js 画布实例
 * @param newWidth 新画布的宽度
 * @param newHeight 新画布的高度
 */
async function copyCanvasUsingJSON(originalCanvas: fabric.Canvas, newCanvas: fabric.Canvas, newWidth: number, newHeight: number) { // 明确参数类型
  const originalWidth = originalCanvas.width!; // 使用!断言
  const originalHeight = originalCanvas.height!; // 使用!断言
  // 计算统一的缩放比例
  const scale = Math.min(newWidth / originalWidth, newHeight / originalHeight);
  // 导出原始画布的 JSON 数据
  const jsonData = originalCanvas.toJSON();

  // 设置新 Canvas 尺寸，考虑设备像素比
  console.log('window.devicePixelRatio',window.devicePixelRatio);
  const ratio = window.devicePixelRatio || 1; // 获取设备像素比
  newCanvas.setWidth(newWidth / ratio);
  newCanvas.setHeight(newHeight / ratio);
  newCanvas.getElement().style.width = `${newWidth}px`; // 设置DOM元素的实际尺寸
  newCanvas.getElement().style.height = `${newHeight}px`; // 设置DOM元素的实际尺寸
  // 加载 JSON 数据到新画布
  await new Promise<void>((resolve) => { // 明确Promise的resolve类型
    newCanvas.loadFromJSON(jsonData, () => {
      // 调整对象比例和位置
      newCanvas.getObjects().forEach((obj) => {
        // 删除图片对象 (背景图)
        if (obj.type === 'image') {
            newCanvas.remove(obj);
        }
        // 缩放和调整位置
        obj.scaleX *= scale / ratio;
    
        obj.scaleY *= scale / ratio;
        obj.left! *= scale / ratio; // 使用!断言
        obj.top! *= scale / ratio; // 使用!断言
        // 如果是路径或矩形，设置为白色（用于蒙版）
        if (obj.type === 'path' || obj.type === 'rect') {
            obj.set({
                stroke: 'white',
                fill: 'white',
      
            });
        }
        obj.setCoords(); // 更新边界
      });

      // 设置背景为黑色
      newCanvas.backgroundColor = 'black';

      // 渲染 Canvas
      newCanvas.renderAll();

      resolve(); // 解决Promise
    });
  });
}

/* End - 画布编辑 - End */


// 检查品类ID是否在白名单中
const checkCategoryIdIsInWhiteList = (id: number)=>{ // 明确id类型
  const whiteListIds = categoryWhiteList.map(item => item.id); // 提取白名单ID列表
  if (!whiteListIds.includes(id)) {
    return false; // 不在白名单中
  }
  return true; // 在白名单中
}
</script>

<style scoped>
/* 添加你的样式 */
/* 这里应该包含less或css样式，由于未提供，这里只保留注释 */
</style>