import _, { times } from 'lodash';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing, ImageBackground } from 'react-native';
import { Utils, TYText, Dialog, IconFont, TYSdk } from 'tuya-panel-kit';
import color from 'color';
import Strings from '../../../../i18n';
import SwitchList from '../../../../components/SwitchList';
import icons from '../../../../res/iconfont';
import Res from '../../../../res';
import MainTimeView from './main-time-view';
import TopBar from '../../../../components/topbar';
import {
  SINGLE_TIMER_CNT_MAX,
  GROUP_TIMER_CNT_MAX,
  transLoopsToStr,
  updateCloudTimerList,
  getCloudGroupTimerList,
  getCloudSingleTimerList,
  getTimerParams,
  GroupTimerData,
  SingleTimerData,
  addSingleTimer,
  setSingleTimerState,
  UpdateSingleTimerParams,
  deleteSingleTimer,
  checkGroupTimerConflit,
  addGroupTimer,
  setGroupTimerState,
  updateGroupTimer,
  deleteGroupTimer,
} from './schedule_utils'

const { convertX: cx, convertY: cy, width: winWidth } = Utils.RatioUtils;
const { withTheme } = Utils.ThemeUtils;

const SIZE = 224;

/* 规则编辑参数 */
let editParams = {
  isInit: false,      // 编辑界面是否需要重新初始化，产生变化即需要重新初始化
  isEditting: false,  // 是否当前正处于编辑界面
  isTurning: false,   // 是否正在切换当中
  isEdit: false,      // 新增还是编辑
  index: 0,           // 当前编辑的规则ID
  isSingle: false,
  data: {
    power: true,
    time: '00:00',
    loops: '0000000',
    brightness: 1000,
  },
};

let groupTimers: GroupTimerData[] = [];
let singleTimers: SingleTimerData[] = [];

interface MainElseViewProps {
  theme?: any;
  onGesture;
}

const MainElseView: React.FC<MainElseViewProps> = (
  {
    theme: {
      global: { fontColor },
    },
  }
) => {
  const [waveAnim] = useState(new Animated.Value(0));
  const [__, setUpdate] = useState(false);

  const listRef = useRef<SwitchList>(null);
  const scrollRef = useRef<ScrollView>(null);
  //const [groupTimers, setGroupTimers] = useState<GroupTimerData[]>([]);
  //const [singleTimers, setSingleTimers] = useState<SingleTimerData[]>([]);
  //const [editParams, setEditParams] = useState<EditParams>(defaultEditParams);
  const [scrollEnable, setScrollEnable] = useState<boolean>(true);

  useEffect(() => {
    updateTimerList(false);
  }, []);

  const forceUpdate = () => {
    setUpdate(preu => !preu);
  };

  const updateTimerList = (showLoad: boolean) => {
    updateCloudTimerList(showLoad).then(() => {
      groupTimers = getCloudGroupTimerList();
      singleTimers = getCloudSingleTimerList();
      forceUpdate();
      //setGroupTimers(getCloudGroupTimerList());
      //setSingleTimers(getCloudSingleTimerList());
    });
  }

  const showConflitDialog = (cList: number[], timers) => {
    if (cList.length <= 0) {
      return;
    }

    Dialog.custom({
      title: 'Timer Repeat',
      confirmText: 'OK',
      content: (
        <View style={styles.conflitRoot}> 
          <TYText style={styles.conflitTitle}> {'The setting timer is repeated with the following:'} </TYText>
          {
            cList.map(i => {
              return (
                <View style={styles.conflitView}>
                  <TYText style={styles.conflitText1}> {`${timers[i].data.startTime} - ${timers[i].data.endTime}`} </TYText>
                  <TYText style={styles.conflitText2}> {transLoopsToStr(timers[i].data.loops)} </TYText>
                </View>
              );
            })
          }
        </View>
      ),
      onConfirm: (_data, { close }) => {
        close();
      },
    });
  };

  /* 修改定时规则状态：开启或关闭 */
  const _handleSetGroupTimerState = async (index: number, state: boolean) => {
    setGroupTimerState(index, state).then(
      () => {
          updateTimerList(false)
      }
    )
  };

  /* 根据index删除对应的定时规则 */
  const _handleDeleteGroupTimer = async (index: number) => {
    deleteGroupTimer(index).then(
      () => updateTimerList(false)
    );
  };

  /* 添加定时规则 */
  const _handleAddGroupTimer = async (startTime: string, endTime: string, loops: string, brightness: number) => {
    addGroupTimer(startTime, endTime, loops, brightness).then(
      () => {
          setTimeout(() => updateTimerList(false), 500);
      }
    )
  };

  /* 修改定时规则 */
  const _handleUpdateGroupTimer = async (index: number, startTime: string, endTime: string, loops: string, brightness: number) => {
    
    updateGroupTimer(index, startTime, endTime, loops, brightness).then(
      () => {
          setTimeout(() => updateTimerList(false), 500);
      }
    )
  };

  /* 修改定时规则状态：开启或关闭 */
  const _handleAddSingleTimer = async (time: string, loops: string, power: boolean) => {
    addSingleTimer(time, loops, power).then(
      () => setTimeout(() => updateTimerList(false), 500)
    );
  }

  /* 修改定时规则状态：开启或关闭 */
  const _handleSetSingleTimerState = async (index: number, state: boolean) => {
    await setSingleTimerState(index, state).then(
      () =>  updateTimerList(false)
    );
  }

  /* 修改定时规则状态：开启或关闭 */
  const _handleUpdateSingleTimer = async (index: number, time: string, loops: string, power: boolean) => {
    UpdateSingleTimerParams(index, time, loops, power).then(
      () => setTimeout(() => updateTimerList(false), 500)
    );
  }

  /* 根据index删除对应的定时规则 */
  const _handleDeleteSingleTimer = async (index: number) => {
    deleteSingleTimer(index).then(
      () => updateTimerList(false)
    );
  };

  /* 渲染顶部控制栏 */
  const renderTopBar = () => {
    return (
      <TopBar
        title={' '}
        backhandle={undefined}
      />
    );
  }
  
  /* 添加列表元素 */
  const _renderListSection = ({key, title, value, cnt, cntLimit, onPress}) => {
    const dimmedColor = color(fontColor).alpha(0.5).rgbString();
    const disabled = cnt >= cntLimit? true : false;
    const iconBg = disabled ? '#b2e7c5' : '#00ad3c';
    return (
      <View style={[styles.section, styles.section__listItem]}>
        <TouchableOpacity
          accessibilityLabel={`CustomScene_${key}`}
          disabled={disabled}
          style={[styles.row]}
          activeOpacity={disabled ? 0 : 0.8}
          onPress={onPress}
        >
          <TYText style={[styles.text, { color: fontColor }]} >{title}</TYText>
          <View style={styles.row__right} >
            <TYText style={[styles.text, { color: dimmedColor, marginRight: cx(9)}, ]}>
              {value}
            </TYText>
            <View style={[styles.addIcon, {backgroundColor: iconBg}]}>
              <IconFont d={icons.add} size={cx(20)} fill={'#fff'} stroke={'#fff'} />
            </View>
          </View>
        </TouchableOpacity>
        <View style={{ width: '100%', height: 1, backgroundColor: '#f0edf1' }}/>
      </View>
    );
  }

  /* 渲染新建定时规则列表元素 */
  const _renderGroupTimeClockItem = () => {
    return _renderListSection({
      key: 'timer_rule',
      title: 'Timer',
      value: '',
      cnt: groupTimers.length,
      cntLimit: GROUP_TIMER_CNT_MAX,
      onPress: _handleAddGroupTimeClock
    });
  };

  /* 渲染新建定时规则列表元素 */
  const _renderSingleTimeClockItem = () => {
    return _renderListSection({
      key: 'single_timer',
      title: 'Time Switch',
      value: '',
      cnt: singleTimers.length,
      cntLimit: SINGLE_TIMER_CNT_MAX,
      onPress: _handleAddNewSingleTimer
    });
  };

  const _renderSingleTimers = () => {
    if (singleTimers.length <= 0) {
      return (
        <View style={{ height: cx(80)}}/>
      )
    } else {
      const data = singleTimers.map(t => {
                      return {
                        startTime: t.time,
                        endTime: t.time,
                        loops: t.loops,
                        power: t.power,
                        startStatus: t.status,
                        endStatus: t.status,
                      }
                    });
      //TYSdk.native.simpleTipDialog('single: ' + JSON.stringify(data), () => {});

      return (
        <SwitchList
          ref={listRef}
          data={data}
          type='single'
          onValueChange={_handleSetSingleTimerState}
          onPress={_handleEditSingleTimer}
          onDelete={_handleDeleteSingleTimer}
          onMoveStart={_handleItemMoveStart}
          onMoveComplete={_handleItemMoveComplete}
        />
      );
    }
  };

  const _handleAddNewSingleTimer = useCallback(() => {
    //TYSdk.native.simpleTipDialog('_handleAddNewSingleTimer', () => {});

    editParams.isInit = !editParams.isInit;
    editParams.isEdit = false;
    editParams.isEditting = true;
    editParams.isTurning = true;
    editParams.isSingle = true;
    forceUpdate();

    /*
    const { isInit, index, data } = editParams;
    setEditParams({
      isInit: !isInit,
      isEdit: false,
      isEditting: true,
      isTurning: true,
      index,
      isSingle: true,
      data,
    });
    */
  }, []);

  const _handleEditSingleTimer = useCallback((index: number) => {
    editParams.isInit = !editParams.isInit;
    editParams.isEdit = true;
    editParams.index = index;
    editParams.isEditting = true;
    editParams.isTurning = true;
    editParams.isSingle = true;
    editParams.data.power = singleTimers[index].power;
    editParams.data.time = singleTimers[index].time;
    editParams.data.loops = singleTimers[index].loops;
    forceUpdate();

    /*
    const { isInit, data } = editParams;
    setEditParams({
      isInit: !isInit,
      isEdit: true,
      isEditting: true,
      isTurning: true,
      index,
      isSingle: true,
      data: {
        power: singleTimers[index].power,
        time: singleTimers[index].time,
        loops: singleTimers[index].loops,
        brightness: data.brightness,
      },
    });
    */
  }, [singleTimers]);

  /* 进入添加定时规则界面的回调函数 */
  const _handleAddGroupTimeClock = useCallback(() => {
    editParams.isInit = !editParams.isInit;
    editParams.isEdit = false;
    editParams.isEditting = true;
    editParams.isTurning = true;
    editParams.isSingle = false;
    forceUpdate();
    /*
    TYSdk.native.simpleTipDialog('_handleAddGroupTimeClock: ' + JSON.stringify(editParams), () => {});
    const { isInit, index, data } = editParams;
    setEditParams({
      isInit: !isInit,
      isEdit: false,
      isEditting: true,
      isTurning: true,
      index,
      isSingle: false,
      data,
    });
    */
  }, []);
  
  /* 进入编辑定时规则界面 */
  const _handleEditGroupTimer = useCallback((index: number) => {
    editParams.isInit = !editParams.isInit;
    editParams.isEdit = true;
    editParams.index = index;
    editParams.isEditting = true;
    editParams.isTurning = true;
    editParams.isSingle = false;
    forceUpdate();
    //TYSdk.native.simpleTipDialog('_handleEditGroupTimer' , () => {});
    /*
    const { isInit, data } = editParams;
    setEditParams({
      isInit: !isInit,
      isEdit: true,
      isEditting: true,
      isTurning: true,
      index,
      isSingle: false,
      data,
    });
    */
  }, []);

  /* 渲染已存在的定时规则列表元素的函数 */
  const _renderGroupTimers = () => {
    const data = groupTimers.map(t => {
                    return {
                      startTime: t.data.startTime,
                      endTime: t.data.endTime,
                      loops: t.data.loops,
                      power: true,
                      startStatus: t.startStatus,
                      endStatus: t.endStatus,
                    }
                  });

    return (
      <SwitchList
        ref={listRef}
        data={data}
        onValueChange={_handleSetGroupTimerState}
        onPress={_handleEditGroupTimer}
        onDelete={_handleDeleteGroupTimer}
        onMoveStart={_handleItemMoveStart}
        onMoveComplete={_handleItemMoveComplete}
      />
    );
  };

  /* 定时列表元素在开始滑动时的回调函数 */
  const _handleItemMoveStart = useCallback(() => {
    //setScrollEnable(false);
    // @ts-ignore
    scrollRef.current?.setNativeProps({ scrollEnabled: false});
  },[]);

  /* 定时列表元素在结束滑动时的回调函数 */
  const _handleItemMoveComplete = useCallback(() => {
    //setScrollEnable(true);
    // @ts-ignore
    scrollRef.current?.setNativeProps({ scrollEnabled: true});
  },[]);

  /* 从添加或编辑定时规则界面返回定时列表界面的回调函数 */
  const _handleTimeClockBack = useCallback(() => {
    editParams.isEditting = false;
    editParams.isTurning = true;
    forceUpdate();
    //TYSdk.native.simpleTipDialog('_handleTimeClockBack: ' + JSON.stringify(editParams), () => {});
    /*
    const { isInit, isEdit, index, isSingle, data } = editParams;
    setEditParams({
      isInit,
      isEdit,
      isEditting: false,
      isTurning: true,
      index,
      isSingle,
      data,
    });
    */
  },[]);

  const _handleTimeClockCheck = useCallback((
    startTime: string,
    endTime: string,
    loops: string,
    power: boolean,
    ) => {

      if (editParams.isSingle) {
        if (editParams.isEdit) {
          // TODO
        } else {
          // TODO
        }
        return true;
      } else {
        const index = editParams.isEdit ? editParams.index : -1;
        const conflitList = checkGroupTimerConflit(startTime, endTime, loops, index, groupTimers);
        if (conflitList.length > 0) {
          showConflitDialog(conflitList, groupTimers);
          return false;
        } else {
          return true;
        }
      }
  }, []);

  /* 添加或编辑定时规则界面完成操作，并返回定时列表界面的回调函数 */
  const _handleTimeClockComplete = useCallback((
    startTime: string,
    endTime: string,
    loops: string,
    power: boolean,
    brightness: number,
    ) => {
      /*
      TYSdk.native.simpleTipDialog('isEdit: ' + JSON.stringify(editParams), () => {});
      const { isInit, isEdit, index, isSingle, data } = editParams;
      setEditParams({
        isInit,
        isEdit,
        isEditting: false,
        isTurning: true,
        index,
        isSingle,
        data,
      });
      */

      editParams.isEditting = false;
      editParams.isTurning = true;
      forceUpdate();

      if (editParams.isSingle) {
        //TYSdk.native.simpleTipDialog('isEdit: ' + editParams.isEdit, () => {});
        if (editParams.isEdit) {
          _handleUpdateSingleTimer(editParams.index, startTime, loops, power);
        } else {
          _handleAddSingleTimer(startTime, loops, power);
        }
      } else {
        // 判断是编辑还是添加定时规则
        if (editParams.isEdit) {
          _handleUpdateGroupTimer(editParams.index, startTime, endTime, loops, brightness);
        } else {
          _handleAddGroupTimer(startTime, endTime, loops, brightness);
        }
      }
  }, []);

  const getIinitFlag = () => {
    if (editParams.isTurning) {
      if (editParams.isEditting) {
        listRef.current?.reset_item_state();
        //TYSdk.native.simpleTipDialog('data: ' + JSON.stringify(timers), () => {});
      }
      startWaveAnimation();
    }
    return editParams.isInit;
  };

  const startWaveAnimation = () => {
    const startValue = editParams.isEditting ? 0 : 1;
    const endValue = editParams.isEditting ? 1 : 0;

    waveAnim.setValue(startValue);
    Animated.timing(waveAnim, {
      toValue: endValue,
      duration: 350,
      easing: Easing.bezier(.22,.62,.6,.9),
    }).start(
      () => {
        editParams.isTurning = false;
        /*
        TYSdk.native.simpleTipDialog('wave: ' + JSON.stringify(editParams), () => {});
        const { isInit, isEdit, isEditting, index, isSingle, data } = editParams;
        setEditParams({
          isInit,
          isEdit,
          isEditting,
          isTurning: false,
          index,
          isSingle,
          data,
        });
        */
      }
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <ImageBackground
          style={{ position: 'absolute', width: winWidth, height: winWidth * 0.533 }}
          source={Res.timer_header}
        />
        {renderTopBar()}
        <TYText style={{fontSize:cx(24), color:fontColor, marginLeft: cx(24), marginTop: cx(44), marginBottom: cx(48), fontWeight: '400'}}> {'More'} </TYText>

        <ScrollView
          accessibilityLabel="CustomScene_ScrollView"
          ref={scrollRef}
          scrollEnabled={scrollEnable}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollView]}
        >
        {/* 定时 */}
        {_renderSingleTimeClockItem()}
        {_renderSingleTimers()}
        {_renderGroupTimeClockItem()}
        {_renderGroupTimers()}
        </ScrollView>
      </View>
      <Animated.View
          accessibilityLabel="HomeScene_Custom_Editor"
          style={[
            styles.editor,
            {
              //paddingTop:10
            },
            {
              transform: [
                {
                  translateX: waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -winWidth],
                  }),
                },
              ],
            },
          ]}
      >
        <ImageBackground
          style={{ position: 'absolute', top: 0, left: 0, width: winWidth, height: winWidth * 1.6 }}
          source={Res.timer_editor_bg}
        />
        <MainTimeView
          isInit={getIinitFlag()}
          isEdit={editParams.isEdit}
          isSingle={editParams.isSingle}
          singleTime={editParams.data.time}
          singleLoops={editParams.data.loops}
          power={editParams.data.power}
          startTime={getTimerParams(editParams.index).data.startTime}
          endTime={getTimerParams(editParams.index).data.endTime}
          loops={getTimerParams(editParams.index).data.loops}
          brightness={getTimerParams(editParams.index).data.brightness}
          onBack={_handleTimeClockBack}
          onCheck={_handleTimeClockCheck}
          onComplete={_handleTimeClockComplete}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
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
    backgroundColor: '#fff',
  },

  container: {
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    paddingBottom: cy(10),
  },

  scrollView: {
    alignSelf: 'stretch',
  },

  section: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },

  section__listItem: {
    alignSelf: 'stretch',
    height: cx(87),
    marginHorizontal: cx(24),
  },

  mask: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    marginTop: cy(55),
    borderRadius: 112,
    backgroundColor: '#000E20',
    borderColor: '#000',
    borderWidth: 2,
    overflow: 'hidden',
  },

  image: {
    width: 448,
    height: 149,
  },

  item: {
    height: '30',
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },

  text: {
    fontSize: cx(23),
    color: '#fff',
    fontWeight: '400',
  },

  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },

  row__right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addIcon: {
    width: cx(24),
    height: cx(24),
    borderRadius: cx(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflitRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: cx(20),
  },
  conflitTitle: {
    fontSize: 17,
    color: '#000',
  },
  conflitView: {
    width: winWidth * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: cx(20),
    paddingVertical: cx(10),
    backgroundColor: '#d8d8d8',
    borderRadius: 30,
  },
  conflitText1: {
    fontSize: 18, 
    color: '#000',
    fontWeight:'400',
  },
  conflitText2: {
    fontSize: 15,
    color: '#4c4c4c',
  },
});

export default withTheme(MainElseView);