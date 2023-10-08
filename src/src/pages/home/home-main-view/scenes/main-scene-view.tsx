/* eslint-disable @typescript-eslint/no-empty-function */
import React, { useEffect, useRef, useCallback, useState, createContext } from 'react';
import color from 'color';
import throttle from 'lodash/throttle';
import { View, FlatList, StyleSheet, TouchableOpacity, ScrollView, Image, } from 'react-native';
import { Utils, TYSdk, TYText, IconFont } from 'tuya-panel-kit';
import { useSelector } from '../../../../models';
import { lampPutDpData, saveSceneEditing, saveCustomScene } from '../../../../api';
import Strings from '../../../../i18n';
import Res from '../../../../res';
import icons from '../../../../res/iconfont';
import SupportUtils from '../../../../utils/support';
import DpCodes from '../../../../config/dpCodes';
import BrightSlider from '../../../../components/BrightSlider';
import TopBar from '../../../../components/topbar';
import { ColorParser, getSceneValueOri } from '../../../../utils';
import SceneEditor from './main-scene-editor-view';
import {
  getThemeDataSource,
  getCustomDataSource,
  getScenePic,
  isEditDisable,
  isAddSceneDisable,
  sceneChange,
  sceneComplete,
} from './scene-utils'

const { withTheme } = Utils.ThemeUtils;
const { convertX: cx, convertY: cy, width: winWidth } = Utils.RatioUtils;
const { sceneCode: sceneValueCode, powerCode, } = DpCodes;
const { isSignMeshDivice } = SupportUtils;
const SINGLE_SCENE_WIDTH = winWidth / 4.5;

const LIST_ITEM_PADDING = cx(24);
const LIST_ITEM_PADDING2 = cx(8);
const LIST_ITEM_MARGIN_B = cx(16);
const LIST_ITEM_HEIGHT = cx(88);
const LIST_ITEM_WIDTH = winWidth - LIST_ITEM_PADDING * 2;
const LIST_ITEM_ICON_SIZE = LIST_ITEM_HEIGHT - LIST_ITEM_PADDING2 * 2;
const LIST_ITEM_ICON_RADIO = LIST_ITEM_ICON_SIZE / 2;
const LIST_TITLE_HEIGHT = cx(80);
const LIST_HEIGHT = LIST_ITEM_HEIGHT * 4 + LIST_TITLE_HEIGHT;

const POWER_BUTTON_SIZE = cx(56);

const LIST_ICONS = [
  {
    color: '#00ad3c',
    colorDisabled: '#b0e4c1',
    img: Res.scene_night,
  },
  {
    color: '#2f63ed',
    colorDisabled: '#becdf7',
    img: Res.scene_reading,
  },
  {
    color: '#d83039',
    colorDisabled: '#f2bec1',
    img: Res.scene_work,
  },
  {
    color: '#5015ff',
    colorDisabled: '#c8b6fc',
    img: Res.scene_relaxation,
  },
  {
    color: '#E85217',
    colorDisabled: '#f8cab8',
    img: null,
  },
  {
    color: '#2EC3FF',
    colorDisabled: '#c0edff',
    img: null,
  },
  {
    color: '#A62FED',
    colorDisabled: '#e5c1fa',
    img: null,
  },
  {
    color: '#A62FED',
    colorDisabled: '#e5c1fa',
    img: null,
  },
];

interface MainSceneViewProps {
  theme?: any;
}

const MainSceneView: React.FC<MainSceneViewProps> = ({
  theme: {
    global: { fontColor, themeColor },
  },
}) => {
  const isSigMesh = useRef(isSignMeshDivice());
  const flatListRef = useRef<FlatList<unknown>>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const sceneEditorRef = useRef<SceneEditor>(null);
  const power = useSelector(state => state.dpState[powerCode]) as boolean;
  const sceneValue = useSelector(state => state.dpState[sceneValueCode]) as string || '';
  const customScenes = useSelector(state => state.cloudState.sceneDatas) || [];
  const sceneEditing = useSelector(state => state.uiState['sceneEditing']) || false;
  const [currSceneId, setCurrSceneId] = useState(sceneValue.slice(0,2));

  useEffect(() => {
    //scrollToSelected();
    return () => {
      /* 退出页面后关闭事件监听 */
      saveSceneEditing(false);
    };
  }, []);

  useEffect(() => {
    //if (!sceneEditing && customSceneProps.editing) {
    //  lampPutDpData({ [workModeCode]: 'scene' });
    //}
  }, [sceneEditing]);

  /* 根据传入的场景数据参数，更新 currSceneId */
  const updateCurSceneId = (value: string) => {
    setCurrSceneId(value.slice(0, 2));
  };

  /* 列表界面自动滚动到选择场景的位置 */
  const scrollToSelected = (animated: boolean) => {
    scrollViewRef.current?.scrollTo(getScrollInitOffset(), 0, animated);
  };

  /* 根据当前选中元素的ID计算出列表需要的偏移量 */
  const getScrollInitOffset = () => {
    const id = parseInt(currSceneId, 16);
    let n = Math.floor(id / 6);
    n = n > 3 ? 3 : n;
    n = n < 0 ? 0 : n;
    return LIST_HEIGHT * n;
  };

  /* 点击切换场景的回调函数 */
  const handleScenePress = (id: string, value: string) => () => {
    if (!power) {
      return;
    }

    if (id === currSceneId && sceneValue) {
      return;
    }

    /* 优先更新界面，优化用户体验 */
    updateCurSceneId(value);

    let sceneData = value;
    // 在sign mesh下，只发送场景号（sign mesh 对数据包在长度有限制，所以最终定在切换场景时只传场景号）
    if (isSigMesh.current) {
      sceneData = value.slice(0, 2);
    }

    lampPutDpData({ [sceneValueCode]: sceneData });
  };

  /* 完成场景编辑时的回调函数，退出编辑状态 */
  const navCustomSceneComplete = useCallback((value: string, sceneDatas) => {
    saveSceneEditing(false);

    if (value !== '') {
      /* 保存数据 */
      saveCustomScene(sceneDatas);
      /* 更新界面上选中当前模式 */
      updateCurSceneId(value);
      lampPutDpData({ [sceneValueCode]: value });
      //scrollToSelected(false);
    }
  },[]);

  /* 进入新增或编辑场景的回调函数，进入编辑状态 */
  const navToCustomScene = (value: string, isEdit: boolean) => () => {
    if (!power) {
      return;
    }

    sceneEditorRef.current?.setEditParams(isEdit, value);
    saveSceneEditing(true);
  };

  const renderItem = ({ item }) => {
    const { name, value, isEdit } = item;
    const id = value.slice(0, 2);
    const active = id === currSceneId;

    let i = parseInt(id, 16);
    i = i < 0x61 ? i % LIST_ICONS.length : (i - 0x61 + 4);
    const listIcon = LIST_ICONS[i];
    const bgColor = power ? '#f6f6f6' : '#fafafa';
    const iconBgColor = power ? listIcon.color : listIcon.colorDisabled;
    const textColor = power ? fontColor : '#c7c4ca';
    const activeIconColor = power ? themeColor : '#b1e4c4'; 
    return (
      <View style={[
          styles.sectionSceneItemView,
          {
            backgroundColor: bgColor,
          }
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="HomeScene_SceneView_Select"
          activeOpacity={0.9}
          style={[styles.labelView]}
          onPress={handleScenePress(id, value)}
        >
          <View style={[ styles.sectionSceneItemIcon, { backgroundColor: iconBgColor}]}>
            {listIcon.img !== null && <Image style={styles.sectionSceneItemIcon} source={listIcon.img} />}
          </View>
          <TYText style={[styles.text, { color: textColor }]}>
            {`${name}`}
          </TYText>

          {
            active && <IconFont d={icons.check} size={cx(25)} fill={activeIconColor} stroke={activeIconColor} />
          }

        </TouchableOpacity>

        {
          isEdit &&
          <TouchableOpacity
            accessibilityLabel="HomeScene_SceneView_Edit"
            activeOpacity={0.9}
            style={[styles.editView]}
            onPress={navToCustomScene(value, true)}
          >
            <TYText style={[styles.editText, { color: textColor, borderColor: textColor }]}>
              {`Edit`}
            </TYText>
          </TouchableOpacity>
        }
      </View>
    );
  };

  /* 渲染场景列表，传入参数为
   * title - 列表标题；
   * editable - 是否需要显示可编辑按键；
   * addable - 是否需要显示新增按键
   * dataSource - 需要显示在列表中的元素数据
   */
  const renderFlatList = (
    title: string,
    editable: boolean,
    powerable: boolean,
    dataSource:{name:string, value:string}[]
  ) => {
    const d = dataSource.map(d => {return {name: d.name, value: d.value, isEdit: editable}});
    const len = dataSource.length;
    const height = len * (LIST_ITEM_HEIGHT + LIST_ITEM_MARGIN_B) + LIST_TITLE_HEIGHT;

    return (
        <View style={[styles.sectionSceneList, {height: height, paddingHorizontal: LIST_ITEM_PADDING }]}>
          <View style={{ height: LIST_TITLE_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TYText style={styles.title}>{Strings.getLang(title)}</TYText>
            {powerable && renderPower()}
          </View>
          <FlatList
            accessibilityLabel="HomeScene_SceneView_FlatListRef"
            ref={flatListRef}
            initialScrollIndex={0}
            data={d}
            renderItem={renderItem}
            keyExtractor={(_, idx) => `${idx}`}
          />
        </View>
    );
  };

  const handlerPower = () => throttle(() => {
      lampPutDpData({ [powerCode]: !power });
    }, 200); 

  const renderPower = () => {
    return (
      <TouchableOpacity
        accessibilityLabel="HomeScene_SceneView_Power"
        activeOpacity={0.9}
        style={[styles.powerView]}
        onPress={handlerPower()}
      >
        <IconFont d={icons.power} size={cx(25)} fill={'#000'} stroke={'#000'} />
      </TouchableOpacity>
    );
  };

  const handleSceneChange = (bright: number) => {
    const sceneValueOri = getSceneValueOri(currSceneId, customScenes);
    sceneChange(bright, sceneValueOri);
  };

  const handleSceneComplete = (bright: number) => {
    const sceneValueOri = getSceneValueOri(currSceneId, customScenes);
    sceneComplete(bright, sceneValueOri);
  };

  /* 渲染顶部控制栏 */
  const renderTopBar = () => {
    return (
      <TopBar
        title={TYSdk.devInfo.name}
        backhandle={undefined}
      />
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.container,]}>
        {renderTopBar()}
        <ScrollView
          ref={scrollViewRef}
          accessibilityLabel="CustomScene_ScrollView"
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollView]}
          >
          {/* 主题心情模式 */}
          {renderFlatList('theme_mood', false, true, getThemeDataSource())}
          {/* 自定义模式 */}
          {renderFlatList('custom_diy', true, false, getCustomDataSource(customScenes))}
        </ScrollView>
      </View>
      <SceneEditor
        ref={sceneEditorRef}
        isEditting={sceneEditing}
        onComplete={navCustomSceneComplete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
  },
  editor: {
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06060e',
  },
  container: {
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topbarTitle: {
    backgroundColor: 'transparent',
    fontSize: cx(20),
    color: '#000',
    fontWeight: '400',
  },
  scrollView: {
    alignSelf: 'stretch',
    marginTop: cy(5),
  },
  powerView: {
    alignItems: 'center',
    justifyContent: 'center',
    width: POWER_BUTTON_SIZE,
    height: POWER_BUTTON_SIZE,
    marginRight: 20,
    borderRadius: POWER_BUTTON_SIZE / 2,
    borderColor: '#ededed',
    borderWidth: 1,
  },
  title: {
    fontSize: cx(24),
    fontWeight: '400',
    color: '#000',
  },
  addScene: {
    width: SINGLE_SCENE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexDirection: 'row',
    paddingLeft: LIST_ITEM_PADDING2,
    paddingRight: cx(23),
  },
  editView: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    fontSize: cx(12),
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#000',
    paddingVertical: cx(5),
    paddingHorizontal: cx(10),
    marginRight: cx(16),
    borderWidth: 0.5,
    borderRadius: 15,
  },
  text: {
    fontSize: cx(14),
    color: '#04001E',
    flex: 1,
    paddingLeft: cx(16),
  },
  sectionSceneList: {
    height: LIST_HEIGHT,
    flexDirection: 'column',
    alignSelf: 'stretch',
    backgroundColor: 'transparent'
  },
  sectionSceneItemView: {
    height: LIST_ITEM_HEIGHT,
    width: LIST_ITEM_WIDTH,
    marginBottom: LIST_ITEM_MARGIN_B,
    borderRadius: LIST_ITEM_HEIGHT * 0.5,
    shadowRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  sectionSceneItemIcon: {
    height: LIST_ITEM_ICON_SIZE,
    width: LIST_ITEM_ICON_SIZE,
    borderRadius: LIST_ITEM_ICON_RADIO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row:{
    flex: 1,
    justifyContent: "space-around"
  },
  iconActive: {
    backgroundColor: '#fff',
  },
});

export default withTheme(MainSceneView);
