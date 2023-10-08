import React, { Component } from 'react';
import { View, StyleSheet, ViewStyle, LayoutChangeEvent, Image } from 'react-native';
import { Utils, TYText } from 'tuya-panel-kit';
import Res from '../../res';
import Slider from './slider';

const { convertX: cx } = Utils.RatioUtils;
const { withTheme } = Utils.ThemeUtils;

const LAYOUT_HEIGHT = cx(54);
const LAYOUT_RADIUS = LAYOUT_HEIGHT * 0.5;
const LAYOUT_PADDING_V = cx(5);
const LAYOUT_PADDING_H = cx(5);
const ITEM_SIZE = LAYOUT_HEIGHT - LAYOUT_PADDING_V * 2;

// | -LAYOUT_PADDING_H- | -ITEM_SIZE- | -LAYOUT_PADDING_H- | -SIDER_WIDTH- | -LAYOUT_PADDING_H- | -ITEM_SIZE- | -LAYOUT_PADDING_H- |
const SLIDER_WIDTH_EX = LAYOUT_PADDING_H * 4 + ITEM_SIZE * 2;
const THUMB_SIZE = cx(24);
const FONT_SIZE = cx(14);

interface SliderSelectorProps {
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  imgLeft?: string;
  iconRight?: string;
  minValue?: number;
  maxValue?: number;
  value: number;
  onSlidingComplete: (value: number, complete: boolean,) => void;
  theme?: any;
}

interface SliderSelectorState {
  value: number;
  layout_width: number;
}

class SliderSelector extends Component<SliderSelectorProps, SliderSelectorState> {

  textRef: TYText;

  constructor(props: SliderSelectorProps) {
    super(props);
    const { value } = this.props;
    this.state = {
      value,
      layout_width: 0,
    };
  }

  _handleValueChange = (value: number, complete: boolean) => {
    const { minValue = 0, maxValue = 100, onSlidingComplete } = this.props;
    const p = (value - minValue) / (maxValue - minValue);
    const v = Math.ceil((maxValue - minValue) * p) + minValue;

    this.textRef.setState({ text: `${v}%` });
    onSlidingComplete(v, complete);
  };

  _handleLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    this.setState({ layout_width: layout.width });
  };

  _handleRenderThumb = () => {
    return (
      <View
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
      >
        <View style={{ width: THUMB_SIZE * 0.28, height: THUMB_SIZE * 0.12, backgroundColor: '#fff', borderRadius: 2 }}/>
      </View>
    );
  }

  render() {
    const {
      disabled = false,
      imgLeft = Res.slider_bright,
      minValue = 0,
      maxValue = 100,
      value,
      theme,
    } = this.props;
    const {
      layout_width,
    } = this.state;
    const {
      global: { themeColor },
    } = theme;
    const tColor = disabled ? '#b2e7c5' : themeColor;
    const fColor = disabled ? '#c4c3ca' : '#b7b6bf';
    const fontColor = disabled ? '#c4c3ca' : '#04001E';
    const bgColor = disabled ? '#fdfdfd' : '#EDEDED';
    const v = Math.floor(value);

    return (
      <View
        style={{ width: '100%', height: LAYOUT_HEIGHT}}
        onLayout={this._handleLayout}
      >
        <View style={[styles.container, { width: layout_width, backgroundColor: bgColor }]}>
          <View style={styles.iconfont__left}>
            <Image style={{width: cx(24), height: cx(24)}} source={imgLeft} />
          </View>
          <Slider.Horizontal
            accessibilityLabel="CustomScene_EditSpeed"
            theme={{
              width: layout_width - SLIDER_WIDTH_EX,
              height: 6,
              trackRadius: 3,
              trackHeight: 6,
              thumbSize: 26,
              thumbRadius: 26,
              thumbTintColor: '#FFF',
              minimumTrackTintColor: '#F84803',
              maximumTrackTintColor: '#E5E5E5',
            }}
            disabled={disabled}
            canTouchTrack={true}
            minimumValue={minValue}
            maximumValue={maxValue}
            maximumTrackTintColor={'transparent'}
            minimumTrackTintColor={'transparent'}
            useNoun={true}
            nounStep={4}
            minNounStyle={{
              backgroundColor: tColor,
              height: 3,
              width: 3,
              borderRadius: 1.5,
            }}
            maxNounStyle={{
              backgroundColor: fColor,
              height: 3,
              width: 3,
              borderRadius: 1.5,
            }}
            thumbTintColor={tColor}
            thumbStyle={styles.sliderThumb}
            renderThumb={this._handleRenderThumb}
            trackStyle={styles.sliderTrack}
            onlyMaximumTrack={false}
            value={v}
            onValueChange={value => this._handleValueChange(value, false)}
            onSlidingComplete={value => this._handleValueChange(value, true)}
          />
          <View style={styles.iconfont__right}>
            <TYText
              ref={(ref: TYText) => {
                this.textRef = ref;
              }}
              style={{fontSize: FONT_SIZE, color: fontColor, textAlign: 'right' }}
            >
              {`${v}%`}
            </TYText>
          </View>
        </View>
      </View>
    );
  }
}

export default withTheme(SliderSelector);

const styles = StyleSheet.create({
  container: {
    height: LAYOUT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e5e8',
    borderRadius: LAYOUT_RADIUS,
    paddingHorizontal: LAYOUT_PADDING_H,
  },

  text: {
    fontSize: cx(14),
  },

  iconfont__left: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT_PADDING_H,
    backgroundColor: '#fff',
  },

  iconfont__right: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT_PADDING_H,
    backgroundColor: 'transparent',
  },

  slider: {
    width: cx(270),
    marginHorizontal: cx(8),
  },

  sliderTrack: {
    height: Math.max(3, cx(3)),
  },

  sliderThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE * 0.5,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
});
