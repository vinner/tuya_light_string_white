import _ from 'lodash';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ImageBackground, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Utils, TYText, TYSdk, Checkbox } from 'tuya-panel-kit';
import Strings from '../../../../i18n';
import Res from '../../../../res';
import ProgressDouble from '../../../../components/TimeProcess';
import TopBar from '../../../../components/topbar';
import SliderSelector from '../../../../components/SliderSelector';
import Popup from '../../../../components/popup';
import { transTime2Str12, transTime2Str12Ampm, transTime2Str24, transTime2Value24 } from '../../../../utils';

const { convertX: cx, width: winWidth } = Utils.RatioUtils;
const { withTheme } = Utils.ThemeUtils;

const THUMB_RADIUS = 16;
const SCALE_HEIGHT = 35;
const SCALE_HEIGHT_EXT = 15;
const PROGRESS_WIDTH = winWidth * 0.8;
const PROGRESS_HEIGHT = winWidth * 0.8;

const CENTER_WIDTH = PROGRESS_WIDTH - SCALE_HEIGHT * 3 - SCALE_HEIGHT_EXT;
const CENTER_HEIGHT = PROGRESS_HEIGHT - SCALE_HEIGHT * 3 - SCALE_HEIGHT_EXT;
const CENTER_X = SCALE_HEIGHT * 2 + SCALE_HEIGHT_EXT * 0.5 - 1;
const CENTER_Y = SCALE_HEIGHT * 2 + SCALE_HEIGHT_EXT * 0.5 - 1;

const WEEK_VIEW_MARGIN_HOR = cx(19);
const WEEK_ITEM_MARGIN_HOR = cx(5);

const WEEK_BTN_WIDTH = (winWidth - WEEK_VIEW_MARGIN_HOR * 2 - WEEK_ITEM_MARGIN_HOR * 14) / 7;

let isInitFlag = false;
let startValue = 480;
let endValue = 1080;
let brightValue = 0;
let scrollEnable = true;

let week_status: boolean[] = [false, false, false, false, false, false, false];

interface MainTimeViewProps {
  isInit: boolean;
  isEdit: boolean;
  isSingle: boolean;
  singleTime: string;
  singleLoops: string;
  power: boolean;
  startTime: string;
  endTime: string;
  loops: string;
  brightness: number;
  theme?: any;
  onBack: () => void;
  onCheck: (
    startTime: string,
    endTime: string,
    loops: string,
    power: boolean ) => boolean;
  onComplete: (
    startTime: string,
    endTime: string,
    loops: string,
    power: boolean,
    bright: number,
    ) => void;
}

const MainTimeView: React.FC<MainTimeViewProps> = (
  {
    theme: {
      global: { },
    },
    isInit,
    isEdit,
    isSingle,
    singleTime,
    singleLoops,
    power,
    startTime: st,
    endTime: et,
    loops: lp,
    brightness,
    onBack,
    onCheck,
    onComplete,
  }
) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [powerState, setPowerState] = useState(false);
  const [singleTimeValue, setSingleTimeValue] = useState(0);
  const [__, set_update] = useState(false);

  useEffect(() => {
  }, []);

  /* 强制重新渲染 */
  const forceUpdate = () => {
    set_update(preu => !preu);
  };

  /* 时间变化回调函数，主要是为了解决在滑动时间时，整体界面不会随着一起滑动 */
  const timeValueChange = ({}) => {
    // @ts-ignore
    scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
  };

  /* 时间变化完成回调函数 */
  const timeValueComplete = useCallback(({minValue, maxValue}) => {
    startValue = Math.floor(minValue);
    endValue = Math.floor(maxValue);
    // @ts-ignore
    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
  }, []);

  /* 顶部控制栏返回回调函数 */
  const exitTimeClock = useCallback(() => {
    // TODO
    onBack();
  }, []);
 
  /* 星期天数按键回调函数 */
  const handleWeekButton = (index: number) => () => {
    week_status[index] = !(week_status[index]);
    forceUpdate();
  };

  /* 亮度控制条数值变化回调函数 */
  const _handleBrightChange = useCallback((value: number, complete: boolean) => {
    if (complete) {
      if (!scrollEnable) {
        scrollEnable = true;
        forceUpdate();
      }

      brightValue = Math.floor(value * 10);
    } else {
      if (scrollEnable) {
        scrollEnable = false;
        forceUpdate();
      }
    }
  }, []);

  /* 提交界面修改，回退到列表界面 */
  const _handleSubmit = useCallback(() => {
    if (isSingle) {
      const s = formatTimeStr(Math.floor(singleTimeValue));
      const l = week_status.map((seletect) => {
        return  seletect ? '1' : '0';
      }).join('');

      if (onCheck(s, '', l, powerState)) {
        onComplete(s, '', l, powerState,
          brightValue,
          );
      }
    } else {
      const s = formatTimeStr(Math.floor(startValue));
      const e = formatTimeStr(Math.floor(endValue));
      const l = week_status.map((seletect) => {
                  return  seletect ? '1' : '0';
                }).join('');
  
      if (onCheck(s, e, l, powerState)) {
        onComplete(s, e, l, powerState,
                brightValue,
                );
      }
    }
  }, [isSingle, singleTimeValue, powerState]);

  /* 将时间数值转换成时间字符串，时间数值5分钟为一单位 */
  const formatTimeStr = (v, f: boolean = true) => {
    if (f) {
      const timeStr = transTime2Str24(v);
      return `${timeStr.hour}:${timeStr.min}`;;
    } else {
      const timeStr = transTime2Str12(v);
      const ampm = transTime2Str12Ampm(v);
      return `${timeStr.hour}:${timeStr.min} ${ampm}`;;
    }
  };

  /* 检查是否需要重新初始化界面 */
  const checkInit = () => {
    /* 通过 isInitFlag 是否变化来判断是否需要重新初始化 */
    if (isInit != isInitFlag) {
      /* 判断是新增界面还是编辑界面 */
      if (isEdit) {
        /* 编辑界面，所有参数更新为传入的属性值 */
        startValue = transTime2Value24(st);
        endValue = transTime2Value24(et);
        brightValue =  brightness;

        if (isSingle) {
          setSingleTimeValue(transTime2Value24(singleTime));
          setPowerState(power);
          const p = singleLoops.split('');
          [0,1,2,3,4,5,6].map((id) => {
            week_status[id] = p[id] === '0' ? false : true;
          });  
        } else {
          const p = lp.split('');
          [0,1,2,3,4,5,6].map((id) => {
            week_status[id] = p[id] === '0' ? false : true;
          });  
        }
      } else {
        /* 新增界面所有参数初始化默认值 */
        startValue = 480;
        endValue = 1080;
        brightValue = 1000;
        week_status.fill(false);

        if (isSingle) {
          setSingleTimeValue(0);
          setPowerState(true);
        }
      }
      isInitFlag = isInit;
      scrollViewRef.current?.scrollTo(0, 0, false);
    }
  };

  /* 渲染顶栏控制栏 */
  const renderTopBar = useCallback(() => {
    return (
      <TopBar
        title={' '}
        setting={false}
        backhandle={exitTimeClock}
      />
    );
  }, []);

  /* 渲染时间控件中间部位 */
  const renderCenterView = useCallback(() => {
    return (
      <View style={{position: 'absolute', top: CENTER_Y,  left: CENTER_X}}>
        <ImageBackground
          style={{width: CENTER_WIDTH, height: CENTER_HEIGHT}}
          source={Res.timer_picker_bg}
        />
      </View>
    );
  }, []);

  /* 渲染时间选择控件 */
  const renderProgressView = useCallback(() => {
    return (
      <View
        style={[styles.progress,]}
      >
        <ProgressDouble
          timeTextStyle={{color: '#fff', fontSize: 22}}
          foreColor={{'0%': '#B2E62C', '20%': '#B2E62C', '80%': '#00AD3C', '100%': '#00AD3C'}}
          x1='0%'
          x2='100%'
          y1='0%'
          y2='100%'
          thumbRadius={THUMB_RADIUS}
          thumbFill='#00AD3C'
          minThumbFill='#B2E62C'
          thumbStroke='#00AD3C'
          minThumbStroke='#B2E62C'
          backColor='#e8e8e8'
          startDegree={270}
          minValue={startValue}     // 上早8点，
          maxValue={endValue}    // 晚止6点，
          min={0}
          max={1440} // 精度为1分钟，1小时12个值，24小时为1440个
          scaleHeight={SCALE_HEIGHT}
          scaleHeightExt={SCALE_HEIGHT_EXT}
          style={{ width: PROGRESS_WIDTH, height: PROGRESS_HEIGHT }}
          renderCenterView={renderCenterView()}
          onValueChange={timeValueChange}
          onSlidingComplete={timeValueComplete}
        />
      </View>
    );
  }, []);

  const renderPowerView = () => {
    return (
      <View style={{flexDirection: 'row', alignItems: 'center', height: cx(80), marginHorizontal: cx(24), borderBottomColor: '#f0edf1', borderBottomWidth: 1}}>
        <TYText style={{ fontSize: cx(14), color: '#000', flex: 1 }}> {'Regular rotation'} </TYText>
        <View style={{ flexDirection: 'row' }}>
          <Checkbox
            color={powerState ? "#00ad3c" : '#dedede'}
            size={cx(18)}
            checked={powerState}
            style={{ marginRight: cx(15) }}
            onChange={() => setPowerState(true)}
          >
            <TYText style={{ fontSize: cx(14), color: '#000' }}> {'ON'} </TYText>
          </Checkbox>
          <Checkbox
            color={!powerState ? "#00ad3c" : '#dedede'}
            checked={!powerState}
            onChange={() => setPowerState(false)}
          >
            <TYText style={{ fontSize: cx(14), color: '#000' }}> {'OFF'} </TYText>
          </Checkbox>
        </View>
      </View>
    );
  }

  const handleSingleTimeSelect = () => {
    Popup.timerPicker({
      title: '时间选择',
      confirmText: 'Confirm',
      startTime: singleTimeValue,
      footerType: 'singleConfirm',
      confirmTextStyle: { color: '#fff', fontWeight: '400' },
      footerWrapperStyle: { marginBottom: cx(24) },
      singlePicker: true,
      is12Hours: true,
      symbol: false,
      prefixPosition: 'left',
      showTitleDivider: false,
      onConfirm: ({ startTime }, { close }) => {
        setSingleTimeValue(startTime);
        close();
      },
    });
  }

  const renderTimeView = () => {
    return (
      <TouchableOpacity
        onPress={() => handleSingleTimeSelect()}
      >
      <View style={{flexDirection: 'row', alignItems: 'center',  height: cx(80), marginHorizontal: cx(24), borderBottomColor: '#f0edf1', borderBottomWidth: 1}}>
        <TYText style={{ fontSize: cx(14), color: '#000', flex: 1 }}> {'Time'} </TYText>
        <TYText style={{ fontSize: cx(14), color: '#000', marginRight: 5 }}> {formatTimeStr(singleTimeValue, false)} </TYText>
        <Image source={Res.arrow} />
      </View>
      </TouchableOpacity>
    );
  }

  const weekString: string[] = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
  /* 渲染星期中某一天的选择按键 */
  const renderDayButton = (index: number, select: boolean) => {
    const week_str = weekString[index] || weekString[0];
    const c = select ? '#00AD3C' : 'transparent';
    const fc = select ? '#fff' : '#00AD3C';

    return (
      <TouchableOpacity
        accessibilityLabel="Week Button"
        activeOpacity={0.9}
        style={[styles.editView, { backgroundColor: c }]}
        onPress={handleWeekButton(index)}
      >
        <TYText style={[styles.exec_text, {color: fc}]}>
          {week_str}
        </TYText>
      </TouchableOpacity>
    );
  };

  /* 渲染一星期7天的多选按键 */
  const renderWeekButton = useCallback(() => {
    return (
      <View style={styles.exec_contain}>
        {<TYText style={[styles.exec_title, { marginLeft: cx(24) - WEEK_VIEW_MARGIN_HOR, }]}> {'Date'} </TYText>}
        <View
          style={{width: '100%', flexDirection:'row', alignItems: 'center', justifyContent: 'center'}}
        >
          {week_status.map((seletect, index) => {return renderDayButton(index, seletect)})}
        </View>
      </View>
    );
  }, []);

  /* 渲染亮度条 */
  const renderBrightBar = useCallback(() => {
    return (
      <View style={{ marginHorizontal: cx(24), paddingBottom: cx(24)}}>
        <TYText style={[styles.exec_title]}>{'Brightness control'}</TYText>
        <SliderSelector
              minValue={1}
              maxValue={100}
              value={brightValue / 10}
              onSlidingComplete={_handleBrightChange}
            />
      </View>
    )
  }, []);

  /* 渲染确定按键 */
  const renderSubmitButton = () => {
    return (
      <View
        style={styles.sectionBtnView}
      >
        <TouchableOpacity
          accessibilityLabel="CustomScene_Cancel"
          activeOpacity={0.8}
          style={[styles.section_cancel]}
          onPress={exitTimeClock}
        >
          <TYText style={[styles.text, { color: '#020914', fontSize: cx(14) }]}>
            {'Cancel'}
          </TYText>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="CustomScene_Submit"
          activeOpacity={0.8}
          style={[styles.section_submit]}
          onPress={() => _handleSubmit()}
        >
          <TYText style={[styles.text, { color: '#fff', fontSize: cx(14) }]}>
            {'Confirm'}
          </TYText>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container,]}>
      {/* 定时 */}
      {checkInit()}
      {renderTopBar()}
      <ScrollView
        ref={scrollViewRef}
        //ref="scrollViewRef"
        scrollEnabled={scrollEnable}
        accessibilityLabel="CustomScene_ScrollView"
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollView]}
      >
        {!isSingle && renderProgressView()}
        {isSingle && renderPowerView()}
        {isSingle && renderTimeView()}
        {renderWeekButton()}
        {!isSingle && renderBrightBar()}
      </ScrollView>
      {renderSubmitButton()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },

  scrollView: {
    alignSelf: 'stretch',
  },

  progress: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: cx(7),
  },

  text: {
    fontSize: cx(14),
  },

  exec_contain: {
    marginVertical: cx(24),
    marginHorizontal: WEEK_VIEW_MARGIN_HOR,
    flex: 1,
  },

  exec_title: {
    fontSize: cx(14),
    marginBottom: cx(16),
    color: '#000',
  },

  exec_text: {
    fontSize: cx(12),
  },

  editView: {
    width: WEEK_BTN_WIDTH,
    height: WEEK_BTN_WIDTH * 1.263,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00AD3C',
    borderRadius: WEEK_BTN_WIDTH * 0.5 + 1,
    marginHorizontal: WEEK_ITEM_MARGIN_HOR,
  },

  sectionBtnView: {
    backgroundColor:'transparent',
    flexDirection: 'row',
    marginHorizontal: cx(20),
    marginTop: cx(10),
    marginBottom: cx(20),
    width: winWidth - cx(40),
  },

  section_cancel: {
    width: '50%',
    height: cx(54),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eeedf0',
    borderTopLeftRadius: cx(27),
    borderBottomLeftRadius: cx(27),
  },

  section_submit: {
    width: '50%',
    height: cx(54),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#04001E',
    borderTopRightRadius: cx(27),
    borderBottomRightRadius: cx(27),
  },
});

export default withTheme(MainTimeView);
