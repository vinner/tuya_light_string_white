import { TYSdk } from 'tuya-panel-kit';
import _ from 'lodash';
import { NativeModules } from 'react-native';
import * as DPUtils from '../utils/dpUtils';
import { musicEnabled, musicDisabled } from '../utils/index';
import { actions } from '../models/modules/common';
import { store } from '../models/index';

const TYPublicNative = NativeModules.TYRCTMusicManager;
const TYNative = TYSdk.native;

// 查询panelConfig配置
export const getCloudFun = (name: string, defaultValue: any = null) => {
  return _.get(TYSdk, ['devInfo', 'panelConfig', 'fun', name], defaultValue);
};

export const lampPutDpData = async (d: DpValueType) => {
  // 是否开启了音乐
  if (d.work_mode === 'music') {
    musicEnabled();
  } else if (typeof d.music_data === 'undefined' && typeof d.countdown === 'undefined') {
    musicDisabled();
  }
  DPUtils.recordDpQuery(d);
  TYSdk.device.putDeviceData({ ...d });
};

// 开启手机麦克风
export const startMic = async () => {
  return new Promise((resolve, reject) => {
    try {
      TYPublicNative.startVoice(
        (d: any) => {
          // 屏幕常亮
          TYSdk.native.screenAlwaysOn(true);
          resolve(d);
        },
        (e: any) => {
          reject(e);
        }
      );
    } catch (err) {
      reject(err);
    }
  });
};

// 关闭手机麦克风
export const stopMic = async () =>
  new Promise((resolve, reject) => {
    try {
      TYPublicNative.stopVoice(resolve, reject);
      TYSdk.native.screenAlwaysOn(false);
    } catch (err) {
      reject(err);
    }
  });

export const saveDeviceCloudData = (key: string, data: any) => {
  return new Promise((resolve, reject) => {
    try {
      const jsonString = typeof data === 'object' ? JSON.stringify(data) : data;
      TYNative.setDevProperty(
        key,
        jsonString,
        (d: any) => {
          console.log('===setDevProperty===', key, data);
          resolve(d);
        },
        reject
      );
    } catch (e) {
      reject(e);
    }
  });
};

export const getDeviceCloudData = (key?: string) => {
  return new Promise((resolve, reject) => {
    TYNative.getDevProperty(
      d => {
        if (typeof d !== 'undefined') {
          let data = d;
          if (key) {
            data = typeof d[key] !== 'undefined' ? d[key] : {};
          }
          if (typeof data === 'string') data = JSON.parse(data);
          console.log('===getDevProperty===', key, data);
          resolve(data);
        } else reject();
      },
      () => reject()
    );
  });
};

export const saveSingleTimer = async (data: any) => {
  try {
    await saveDeviceCloudData('singleTimer', data);
    store.dispatch(
      actions.updateCloudState({
        singleTimer: data,
      })
    );
  } catch (err) {
    console.warn('saveSingleTimer Failed: ', err);
  }
};

export const saveDimmerConfig = async (data: any) => {
  try {
    await saveDeviceCloudData('dimmerConfig', data);
    store.dispatch(
      actions.updateCloudState({
        dimmerConfig: data,
      })
    );
  } catch (err) {
    console.warn('saveDimmerConfig Failed: ', err);
  }
};

export const saveSceneBright = async (data: any) => {
  try {
    await saveDeviceCloudData('sceneBright', data);
    store.dispatch(
      actions.updateCloudState({
        sceneBright: data,
      })
    );
  } catch (err) {
    console.warn('saveSceneBright Failed: ', err);
  }
};

export const saveCustomScene = async (data: any) => {
  try {
    await saveDeviceCloudData('customScenes', data);
    store.dispatch(
      actions.updateCloudState({
        customScenes: data,
      })
    );
  } catch (err) {
    console.warn('saveCustomScenes Failed: ', err);
  }
};

export const saveSceneEditing = async (data: any) => {
  store.dispatch(
    actions.updateUi({
      sceneEditing: data,
    })
  );
};

export const saveMusicMode = async (data: any) => {
store.dispatch(
  actions.updateUi({
    musicMode: data,
  })
);
};