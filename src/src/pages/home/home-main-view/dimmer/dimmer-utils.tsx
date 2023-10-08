import _ from 'lodash';
import throttle from 'lodash/throttle';
import { lampPutDpData, saveDimmerConfig } from '../../../../api';
import DpCodes from '../../../../config/dpCodes';
import { ColorParser, SceneValueData } from '../../../../utils';
import { TYSdk, Utils } from 'tuya-panel-kit';

const {
  controlCode: controlDataCode,
  sceneCode: sceneValueCode,
 } = DpCodes;

const DEFAULT_SCENE_ID: number = 10;

interface WHITE_PARAMS {
  title: string;
  id: string;
  mode: number;
  default: number;
  datas: SceneValueData[];
};

export const BAISC_WHITES_PARAMS: WHITE_PARAMS[] = [
  {
    title: 'Bright',
    id: '71',
    mode: 0,
    default: 100,
    datas: [
      { h: 0, s: 0, v: 0, b: 1000, k: 1000, m: 0, f: 50, t: 50, },
    ],
  },
  {
    title: 'Breathing',
    id: '72',
    mode: 2,
    default: 81,
    datas: [
      { h: 0, s: 0, v: 0, b: 800, k: 1000, m: 2, f: 70, t: 70, },
      { h: 0, s: 0, v: 0, b: 1,   k: 1000, m: 2, f: 70, t: 70, },
    ],
  },
  {
    title: 'Twinkle',
    id: '73',
    mode: 1,
    default: 71,
    datas: [
      { h: 0, s: 0, v: 0, b: 700, k: 1000, m: 1, f: 70, t: 70, },
      { h: 0, s: 0, v: 0, b: 0,   k: 1000, m: 1, f: 70, t: 70, },
    ],
  },
  {
    title: 'Flash',
    id: '74',
    mode: 3,
    default: 71,
    datas: [
      { h: 0, s: 0, v: 0, b: 700, k: 1000, m: 3, f: 95, t: 95, },
      { h: 0, s: 0, v: 0, b: 0,   k: 1000, m: 3, f: 95, t: 95, },
    ],
  },
];

/* 发送控制数据包 */
export const putControlDataDP = throttle((h: number, s: number, v: number, b: number, t: number) => {
  if (!controlDataCode) {
    return;
  }
  const encodeControlData = ColorParser.encodeControlData(1, h, s, v, b, t);
  lampPutDpData({ [controlDataCode]: encodeControlData });
}, 150);


/* 控制白光用于预览 */
export const handleWhiteBrightChange = (b: number) => {
  putControlDataDP(0, 0, 0, b, 1000);
};

/* 完成白光的参数设置 */
const handleWhiteBrightComplete = (id: number, b: number) => {
  if (typeof putControlDataDP.cancel === 'function') {
    putControlDataDP.cancel();
  }

  const index = id < 0 || id >= BAISC_WHITES_PARAMS.length ? 0 : id;
  let datas = _.cloneDeep(BAISC_WHITES_PARAMS[index].datas);
  datas[0].b = b;

  // 为规避设备端问题，对数组做反向处理
  datas = datas.reverse();
  const value = ColorParser.encodeSceneData(datas, parseInt(BAISC_WHITES_PARAMS[index].id));
  lampPutDpData({ [sceneValueCode]: value });
};

/* 亮度条亮度完成变化的回调函数 */
export const handleBrightChange = (value: number) => {
  const bright = Math.round(value * 10);
  handleWhiteBrightChange(bright);
};

const {
  NumberUtils: { numToHexString },
  CoreUtils: { toFixed },
} = Utils;

export function nToHS(value = 0, num = 2) {
  return numToHexString(value || 0, num);
}

/* 亮度条亮度完成变化的回调函数 */
export const handleBrightComplete = (id:number, value: number) => {
  const bright = Math.round(value * 10);
  handleWhiteBrightComplete(id, bright);

  let result = `${nToHS(id, 1)}${nToHS(bright, 3)}`;
  saveDimmerConfig(result);
  //TYSdk.native.simpleTipDialog('bright: ' + result, () => {});
};

/* 获取亮度 */
export const parseSceneValue = (workMode: string, value: string, config: string) => {
  //TYSdk.native.simpleTipDialog('parse: ' + workMode + ', ' + value + ', ' + config, () => {});
  /** 默认如果是白光模式，则直接返回参数 */
  if (workMode !== 'scene') {
    return {
      default: true,
      index: 0,
      bright: BAISC_WHITES_PARAMS[0].default * 10,
    }
  }

  let index = -1;
  const id = value.slice(0, 2);

  /** 判断是否为设备按按键后的默认模式 */
  if (parseInt(id, 16) === DEFAULT_SCENE_ID) {
    let mode = parseInt(value.slice(6, 8), 16);
    
    /** 默认固件有Bug，在暴闪模式下，上传了 mode 为 2，实际应该为3，因此这里做特殊处理 */
    if (mode === 2 && parseInt(value.slice(2, 4), 16) === 95) {
      mode = 3;
    }

    /** 解析得到当前模式 */
    index = BAISC_WHITES_PARAMS.findIndex(val => val.mode === mode);
    if (index < 0) {
      return {
        default: false,
        index: 0,
        bright: 1000,
      }
    } else {
      return {
        default: true,
        index,
        bright: 1000,   // 内置默认场景亮度都为1000
      } 
    }
  }

  /** 解析得到当前模式 */
  index = BAISC_WHITES_PARAMS.findIndex(val => val.id === id);
  if (index < 0) {
    /** 当前场景并非调光界面对应的场景，读取云参数 */
    const index = parseInt(config.slice(0, 1));
    if (config.length < 4 || index < 0 || index >= BAISC_WHITES_PARAMS.length) {
      return {
        default: false,
        index: 0,
        bright: BAISC_WHITES_PARAMS[0].default * 10,
      }
    } else {
      const bright = parseInt(config.slice(1, 4), 16);
      return { default: false, index, bright }
    }
  }

  const pos = value.length - 8;
  const bright = parseInt(value.slice(pos, pos + 4), 16);
  return ({default: true, index, bright});
};

export const getSceneTabId = (value: string) => {
  let index = 0;
  const id = value.slice(0, 2);
  BAISC_WHITES_PARAMS.map((p, i) => {
    if (p.id === id) {
      index = i;
    }
  });
  return index;
}



