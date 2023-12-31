import React, { Component } from 'react';
import {
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  StyleSheet,
  Image,
} from 'react-native';
import { IconFont, TYText, Utils, TYSdk } from 'tuya-panel-kit';
import Res from '../../res';

const { convertX: cx, convertY: cy, isIos, isIphoneX, statusBarHeight } = Utils.RatioUtils;

const TOPBAR_MARGIN_TOP = isIos ? statusBarHeight : statusBarHeight + 10;
const TOPBAR_HEIGHT = isIos ? (isIphoneX ? 88 : 64) - statusBarHeight : 56;

interface TopBarProps {
  title?: string;
  setting?: boolean;
  backhandle?: () => void;
  righthandle?: () => void;
  iconColor?: string;
  textStyle?: StyleProp<ViewStyle>;
  backIcon?;
  rightIcon?;
}

export default class TopBar extends Component<TopBarProps> {
  // eslint-disable-next-line react/static-property-placement
  static defaultProps = {
    title: null,
    setting: false,
    backhandle: null,
    iconColor: '#000',
    textStyle: null,
    backIcon: null,
    rightIcon: null,
  };

  setInstance = (name: string) => (ref: TYText) => {
    this[`_ref_${name}`] = ref;
  };

  getInstance = (name: string) => this[`_ref_${name}`];

  onBack = (tab) => () => {
    const {
      backhandle,
      righthandle,
    } = this.props;

    if (tab === 'right') {
      if (righthandle) {
        righthandle();
      } else {
        TYSdk.native.showDeviceMenu();
      }
    } else {
      if (backhandle) {
        backhandle();
      } else {
        TYSdk.native.back();
      }
    }
  };

  render() {
    const {
      title,
      setting,
      iconColor,
      textStyle,
      backIcon,
      rightIcon,
    } = this.props;

    const rightColor = setting ? iconColor : 'transparent';
    return (
      <View
        style={styles.root}
      >
        <TouchableOpacity
          accessibilityLabel="HomeScene_SceneView_Edit"
          activeOpacity={0.9}
          style={styles.left}
          onPress={this.onBack('left')}
        >
          <Image style={{width: cx(24), height: cx(24)}} source={Res.topbar_back} />
        </TouchableOpacity>
        {title && <TYText style={[styles.title, textStyle]} numberOfLines={1}> {title} </TYText>}
        <TouchableOpacity
            accessibilityLabel="HomeScene_SceneView_Edit"
            activeOpacity={0.9}
            style={styles.right}
            disabled={setting ? false : true}
            onPress={this.onBack('right')}
          >
            {setting && <Image style={{width: cx(24), height: cx(24)}} source={Res.topbar_setting} />}
        </TouchableOpacity>
      </View>
    );
  };
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: TOPBAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: TOPBAR_MARGIN_TOP,
    paddingHorizontal: cx(16),
  },
  title: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    fontSize: cx(16),
    color: '#000',
    textAlign: 'center',
  },
  left: {
    height: '100%',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  right: {
    height: '100%',
    width: cx(24),
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
