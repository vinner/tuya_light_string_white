/* eslint-disable max-len */
import Strings from '../i18n';

// 主题场景参数- 默认为静态
export const defaultThemeScenes = [
  {
    name: 'Night',
    value: '000e0d0000000000000000c803e8',
  },
  {
    name: 'Dine',
    value: '010e0d0000000000000003e803e8',
  },
  {
    name: 'Work',
    value: '020e0d00000000000000032003e8',
  },
  {
    name: 'Cozy',
    value: '030e0d0000000000000001f403e8',
  },
];

// 自定义场景参数 - 默认为空（只在只有白光的时候使用）
export const defaultCustomScenes = [
  {
    name: 'Blink',
    value: '61646403000000000000000003e8646403000000000000026203e8',
  },
  {
    name: 'Pulse',
    value: '623a3a02000000000000000003e83a3a02000000000000032a03e8',
  },
  {
    name: 'Flicker',
    value: '63464601000000000000000003e846460100000000000002c603e8',
  },
  {
    name: 'Bright',
    value: '640e0d0000000000000003e803e8',
  },
];

export default {
  cloudState: {
    themeScenes: defaultThemeScenes,
    customScenes: defaultCustomScenes,
    sceneDatas: [...defaultCustomScenes],
    sceneBright: 100,
    singleTimer: [],
    dimmerConfig: '',
  },
};
