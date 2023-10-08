/* eslint-disable @typescript-eslint/no-empty-function */
import throttle from 'lodash/throttle';
import Res from '../../../../res';
import { lampPutDpData, saveSceneBright } from '../../../../api';
import DpCodes from '../../../../config/dpCodes';
import { ColorParser } from '../../../../utils';
import { defaultThemeScenes, defaultHolidayScenes, defaultColourfulScenes } from '../../../../config/scenes';

const { sceneCode: sceneValueCode, controlCode: controlDataCode, } = DpCodes;
const CUSTOM_ID_OFFSET = 0x61;

/* 获取场景的图片资源 */
export const getScenePic = (id: string) => {
  const num = parseInt(id, 16);
  if (num >= CUSTOM_ID_OFFSET)
  {
    const id = num - CUSTOM_ID_OFFSET;
    const picSource = Res[`dp_scene_custom_${id}`] || Res.dp_scene_custom_0;
  return picSource;
  }
  else
  {
    const id = num % 9;
    const picSource = Res[`dp_scene_data_${id}`] || Res.dp_scene_data_0;
    return picSource;
  }
};

/* 判断当前是否处于可编辑状态 */
export const isEditDisable = (id: string) => {
  return parseInt(id, 16) < CUSTOM_ID_OFFSET;
};

/* 判断自定义场景的数量是否已满，是否还可以新增场景 */
export const isAddSceneDisable = (customScenes) => {
  const datas = getCustomDataSourceOrigin(customScenes);
  const isAddDisable= datas.length <= 0;
  const customSceneValue = isAddDisable ? '' : datas[0].value;
  return { isAddDisable, customSceneValue};
};

/* 自定义场景列表数据，用户可编辑 */
export const getCustomDataSource = (customScenes) => {
  const datas = [...customScenes].filter(
    v => !!v
  );

  datas.sort((a, b) => {
    if ((a.value.length <= 2 && b.value.length <= 2) ||
      (a.value.length > 2 && b.value.length > 2)) {
        return 0;
    } else if (b.value.length > 2) {
      return 1;
    } else {
      return -1;
    }
  });
  return datas;
};

/* 自定义场景列表中未定义的数据，用户可编辑 */
const getCustomDataSourceOrigin = (customScenes) => {
  const datas = [...customScenes].filter(
    v => !!v && v.value.length <= 2
  );
  return datas;
};

/* 主题场景使用默认的，用户不可编辑 */
export const getThemeDataSource = () => {
  let defaultSceneData = defaultThemeScenes; // 五路
  const datas = [...defaultSceneData].filter(
    v => !!v
  );
  return datas;
};

/* 多彩场景使用默认的，用户不可编辑 */
export const getColourfulDataSource = () => {
  const datas = [...defaultColourfulScenes].filter(
    v => !!v
  );
  return datas;
};

/* 假日场景使用默认的，用户不可编辑 */
export const getHolidayDataSource  = () => {
  const datas = [...defaultHolidayScenes].filter(
    v => !!v
  );
  return datas;
};

const putControlDataDP = throttle((h: number, s: number, v: number, b: number, t: number) => {
  if (!controlDataCode) {
    return;
  }
  const encodeControlData = ColorParser.encodeControlData(1, h, s, v, b, t);
  lampPutDpData({ [controlDataCode]: encodeControlData });
}, 150);

export const sceneChange = (bright: number, sceneValue) => {
  /* 拿到第一个颜色数据 */
  let hsvbk = sceneValue.slice(8);
  let [h, s, v, b, k] = (hsvbk.match(/[a-z\d]{4}/gi) || []).map(d => parseInt(d, 16));

  v = (h === 0 && s === 0 && v === 0) ? 0 : v * bright / 100;
  b = (b === 0 && k === 0) ? 0 : b * bright / 100;

  putControlDataDP(h, s, v, b, k);
};

export const sceneComplete = (bright: number, sceneValue) => {
  if (typeof putControlDataDP.cancel === 'function') {
    putControlDataDP.cancel();
  }
  saveSceneBright(bright.toString());
  const sceneData = ColorParser.updateSceneBright(sceneValue, bright);
  lampPutDpData({
    [sceneValueCode]: sceneData
  });
};
