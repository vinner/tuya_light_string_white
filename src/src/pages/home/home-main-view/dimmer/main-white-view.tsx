import React, { useEffect, useState } from 'react';
import throttle from 'lodash/throttle';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Utils, TYText, TYSdk, IconFont } from 'tuya-panel-kit';
import { useSelector } from '../../../../models';
import DpCodes from '../../../../config/dpCodes';
import TopBar from '../../../../components/topbar';
import {
  BAISC_WHITES_PARAMS,
  handleBrightComplete,
  parseSceneValue,
} from './dimmer-utils';
import SliderSelector from '../../../../components/SliderSelector';
import TabBar from '../../../../components/tabbar';
import { screen_bottom_height } from '../../../../utils';
import { lampPutDpData } from '../../../../api';
import Res from '../../../../res';
import icons from '../../../../res/iconfont';
// @ts-ignore
import { Rect } from 'react-native-svg';

const { convertX: cx, winWidth, winHeight } = Utils.RatioUtils;
const { withTheme } = Utils.ThemeUtils;
const {
  powerCode,
  workModeCode,
  sceneCode: sceneValueCode,
 } = DpCodes;

const BG_HEIGHT = Math.min(winHeight * 0.66, winWidth * 1.43);
const POWER_BTN_SIZE = 72;
const BRIGHT_HEIGHT = winHeight * 0.34 - screen_bottom_height - POWER_BTN_SIZE * 0.5;
const BG_POSITION_BOTTOM = BRIGHT_HEIGHT + POWER_BTN_SIZE * 0.5;
const TAB_MARGIN_BOTTOM = Math.round(BG_HEIGHT * 0.62);

interface HomeMainWhiteViewProps {
  theme?: any;
}

const HomeMainWhiteView: React.FC<HomeMainWhiteViewProps> = ({
  theme: {
    global: { themeColor },
  },
}) => {
  const power = useSelector(state => state.dpState[powerCode]) as boolean;
  const workMode = useSelector(state => state.dpState[workModeCode]) as 'white';
  const sceneValue = useSelector(state => state.dpState[sceneValueCode]) as string || '';
  const dimmerConfig = useSelector(state => state.cloudState.dimmerConfig) as string || '';
  const [tabRadio, setTabRadio] = React.useState(`0`);
  const [b, setB] = useState(0);

  useEffect(() => {
    const v = parseSceneValue(workMode, sceneValue, dimmerConfig);
    setB(v.bright);
    setTabRadio(`${v.index}`);
    if (power) {
      if (!v.default) {
        handleBrightComplete(v.index, v.bright / 10);
      }
    }
  }, [workMode, sceneValue]);

  /* 亮度变化时的回调函数 */
  const _handleBrightChange = (v: number, complete: boolean) => {
    setB(Math.floor(v * 10));
    complete ? handleBrightComplete(parseInt(tabRadio), v)
    : () => {}//handleBrightChange(v);
  }

  /* 渲染亮度条 */
  const renderBrightBar = () => {
    return (
      <View style={styles.brightView}>
        <TYText style={styles.brightText}>{'Brightness Control'}</TYText>
        <SliderSelector
              disabled={!power}
              minValue={1}
              maxValue={100}
              value={b / 10}
              onSlidingComplete={_handleBrightChange}
            />
      </View>
    );
  };

  /* 渲染顶部控制栏 */
  const renderTopBar = () => {
    return (
      <TopBar
        title={TYSdk.devInfo.name}
        backhandle={undefined}
        setting={true}
      />
    );
  }

  const handlerPower = () => throttle(() => {
    lampPutDpData({ [powerCode]: !power });
  }, 200); 

  const renderPowerBtn = () => {
    return (
      <View style={styles.btnView} >
        <TouchableOpacity
          accessibilityLabel="HomeScene_SceneView_Power"
          activeOpacity={0.9}
          style={[styles.powerView]}
          onPress={handlerPower()}
        >
          <IconFont d={icons.power} size={cx(25)} fill={'#000'} stroke={'#000'} />
        </TouchableOpacity>
      </View>
    );
  }

  const tabRadios = Array.from(Array(4), (_v, k) => k).map(v => {
    return {
      key: `${v}`,
      title: BAISC_WHITES_PARAMS[v].title,
      tabStyle: { alignItems: 'center', justifyContent: 'center' },
      textStyle: { fontSize: cx(12) },
    };
  });

  const handleBasicWhite = (v: string) => {
    const bright = BAISC_WHITES_PARAMS[parseInt(v)].default;
    setTabRadio(v);
    setB(Math.floor(bright * 10));
    handleBrightComplete(parseInt(v), bright);
  };

  const renderBasicWhite = () => {
    return (
      <TabBar
        type="radio"
        tabs={tabRadios}
        activeKey={tabRadio}
        onChange={value => handleBasicWhite(value)}
        disabled={!power}
        style={{
          marginBottom: TAB_MARGIN_BOTTOM,
          width: winWidth - cx(48),
          height: cx(54),
          borderRadius: cx(27),
          backgroundColor: power ? '#E9E6F0' : '#f3f0f8',
        }}
        tabActiveTextStyle={{
          color: power ? themeColor : '#b2e7c5',
        }}
        tabTextStyle ={{
          color: power ? '#787685' : '#d7d6db',
        }}
      />
    );
  }
  const renderBgColor =() => {
    return (
      <View style={{width: '100%', height: '53%'}}>

      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
          style={{ position: 'absolute', bottom: BG_POSITION_BOTTOM, left: cx(0), width: winWidth, height: BG_HEIGHT }}
          source={power ? Res.dimmer_bg : Res.dimmer_bg_poweroff}
        />
      {renderTopBar()}
      <View style={[styles.container]}>
        {renderBasicWhite()}
        {renderPowerBtn()}
        {renderBrightBar()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  btnView: {
    width: '100%',
    height: POWER_BTN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  powerView: {
    alignItems: 'center',
    justifyContent: 'center',
    width: POWER_BTN_SIZE,
    height: POWER_BTN_SIZE,
    borderRadius: POWER_BTN_SIZE / 2,
    backgroundColor: '#fff',
    borderColor: '#ededed',
    borderWidth: 1,
  },
  brightView: {
    width: '100%',
    height: BRIGHT_HEIGHT,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  brightText: {
    backgroundColor: 'transparent',
    fontSize: cx(14),
    color: '#000',
  },
});

export default withTheme(HomeMainWhiteView);
