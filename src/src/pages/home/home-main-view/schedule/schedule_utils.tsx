import {
  translateTimeToS,
  parseJSON,
} from '../../../../utils';
import DpCodes from '../../../../config/dpCodes';
import Api from '../../../../api/cloudTimer';
import icons from '../../../../res/iconfont';
import { TYSdk, GlobalToast, } from 'tuya-panel-kit';
import _ from 'lodash';

const { powerCode, colourCode, brightCode, temperatureCode } = DpCodes;
export const SINGLE_TIMER_CNT_MAX = 2;
export const GROUP_TIMER_CNT_MAX = 8;
export const TIMER_CATEGORY = 'category_timer';//'time_clock'
export const SINGLE_TIMER_ALIAS_BNAME = 'single';//'time_clock'

let group_timers: GroupTimerData[] = []; // 从云端读取到本地缓存的定时规则
let single_timers: SingleTimerData[] = []; // 从云端读取到本地缓存的定时规则

/* 定时规则参数 */
export interface SingleTimerData {
  status: boolean; // 开启灯光规则状态： 0关闭 1开启
  groupId: string;
  loops: string;
  time: string;
  power: boolean;
  //data: SingleTimerDpsData;
}

export interface SingleTimerDpsData {
  brightness: number;
}

/* 定时规则参数 */
export interface GroupTimerData {
  startStatus: boolean; // 开启灯光规则状态： 0关闭 1开启
  endStatus: boolean;   // 关闭灯光规则状态： 0关闭 1开启
  groupId: string,
  ids: number,
  ide: number;
  data: CloudTimingData;
}

interface CloudTimingData {
  brightness: number;
  loops: string;
  startTime: string;
  endTime: string;
  state: boolean;
  execuing: boolean;
}

interface TimeStage {
  startTime: number;
  endTime: number;
  loops: string;
}

/* 对比两个时间的大小，输入时间都是字符串，格式要求是"hh:mm" */
const compareTime = (time1: string, time2: string) => {
  const t1 = translateTimeToN(time1);
  const t2 = translateTimeToN(time2);
  return t1 === t2 ? 0 : t1 > t2 ? 1 : -1;
};

/* 将字符串的时间转换成当天的分钟数 */
const translateTimeToN = (time: string) => {
  const t = time.split(':');
  return parseInt(t[0]) * 60 + parseInt(t[1]);
};

/* 检查时间是否与已经存在并开启的定时任务存在冲突 */
export const checkGroupTimerConflit = (startTime: string, endTime: string, loops: string, index: number, timers: GroupTimerData[]) => {
  const loopsStart = translateLoops(loops, startTime, true);
  let res: number[] = [];

  timers.map( (item, i) => {
    if (index === i || (!item.startStatus && !item.endStatus)) {
      return false;
    }

    /* 如果起始的定时已经执行过了，则将起始时间判定为当前时间 */
    const s = (item.data.loops === '0000000' && !item.startStatus) ? genCurrentTimeStr() : item.data.startTime;
    const itemLoopsStart =  translateLoops(item.data.loops, item.data.startTime, item.startStatus);
    //TYSdk.native.simpleTipDialog('confilt: ' + index + ':' + i +  ','+ loopsStart + ' ** ' + itemLoopsStart, () => {});

    if (checkTimeConflit(startTime, endTime, loopsStart, s, item.data.endTime, itemLoopsStart)) {
      res.push(i);
    }
  });
  return res;
};

/*
 * 当定时设置为不循环时，需要确定下一个执行定时的时间点：
 * 如果开始执行的时间大于当前的系统时间，则表示执行定时的日期是今天；
 * 如果开始执行的时间小于当前的系统时间，则表示执行定时的日期是明天；
 */
const translateLoops = (loops: string, time: string, state: boolean) => {
  if (loops !== '0000000') {
    return loops;
  }

  const date = new Date();
  const min = date.getHours() * 60 + date.getMinutes();
  const t = translateTimeToN(time);
  const ln = '0000000'.split('');

  /* 判断输入参数时间是否大于系统当前时间 */
  if (state) {
    if (t > min) {
      ln[date.getDay()] = '1';
    } else {
      ln[(date.getDay() + 1) % 7] = '1';
    }
  } else {
    ln[date.getDay()] = '1';
  }
  return ln.join('');
};

/* 获取当前系统时间的字符串 */
const genCurrentTimeStr = () => {
  const date = new Date();
  return  translateTimeToS(date.getHours() * 60 + date.getMinutes());
}

 /* 修改定时循环规则，针对跨天的操作，将循环规则往后推一天 */
 const loopsStepF = (loops: string) => {
  if (loops === '0000000' || loops === '1111111') {
    return loops;
  }

  const s1 = loops.slice(0, 6);
  const s2 = loops.charAt(6);
  return s2 + s1;
};

/* 将时间从字符串转换成下下整型，同时判断是否跨天，如果跨天则将其拆分为两个同一天的时间段 */
const transTimeStage = (startTime: string, endTime: string, loops: string) => {
  const s1 = translateTimeToN(startTime);
  const s2 = translateTimeToN(endTime);
  if (s1 < s2) {
    return ([{
      startTime: s1,
      endTime: s2,
      loops
    }]);
  } else {
    return ([
    {
      startTime: s1,
      endTime: translateTimeToN('24:00'),
      loops,
    },
    {
      startTime: 0,
      endTime: s2,
      loops: loopsStepF(loops)
    }]);
  }
}
/*
 * 判断两个时间组是否存在冲突
 * st1: 第一个时间组的起始时间
 * st2: 第一个时间组的结束时间
 * l1: 第一个时间组的每周执行日期
 * dt1: 第二个时间组的起始时间
 * dt2: 第二个时间组的结束时间
 * l2: 第二个时间组的每周执行日期
 */
const checkTimeConflit = (st1: string, st2: string, l1: string, dt1: string, dt2: string, l2: string) => {
  let sTimeStage: TimeStage[] = transTimeStage(st1, st2, l1);
  let dTimeStage: TimeStage[] = transTimeStage(dt1, dt2, l2);

  return sTimeStage.map(s => {
            return dTimeStage.map(d => {
                    if (d.endTime < s.startTime || d.startTime > s.endTime) {
                      return false;
                    }
                    return s.loops.split('').map(
                              (i, index) => (i === '1' && d.loops[index] === '1')
                            ).includes(true);
                  }).includes(true);
          }).includes(true);
};

 /* 由定时循环规则转换成显示文字 */
export const transLoopsToStr = (loops: string) => {
  const week = loops.split('');
  const weekStr = ['Sun.', 'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fir.', 'Sat.'];
  const s = weekStr.filter((_w, index) => week[index] === '1');

  if (s.length === 0) {
    return 'No Loop';
  }

  if (s.length >= 7) {
    return 'Every Day';
  }

  return s.join('');
}

export const getCloudGroupTimerList = () => {
  return group_timers;
}

export const getCloudSingleTimerList = () => {
  return single_timers;
}

/* 通过 devId 从云端读取已存在的定时规则，保存到本地缓存中，再刷新显示 */
export const updateCloudTimerList = async (showLoad = true) => {
  if (showLoad) {
    TYSdk.mobile.showLoading();
  }

  const handleError = (response: any) => {
    const err = parseJSON(response);
    TYSdk.mobile.hideLoading();
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });
  };

  let timerList: any = [];
  try {
    const timers = await Api.getCategoryTimerList(TIMER_CATEGORY);
    // @ts-ignore
    timerList = [...(timers.groups || [])];
    TYSdk.native.hideLoading();
  } catch (error) {
    handleError(error);
    TYSdk.mobile.hideLoading();
  }

  //TYSdk.native.simpleTipDialog('timerList: ' + JSON.stringify(timerList), () => {});
  group_timers =  formatCloudGroupData(timerList);
  single_timers = formatCloudSingleData(timerList);
  
};

/* 将从云端获取到的组定时数据转换成本地存储数据 */
const formatCloudGroupData = (timerList: any[]) => {
  //TYSdk.native.simpleTipDialog('group: ' + JSON.stringify(timerList), () => {});
  return timerList.filter(item => item.timers.length === 2).map((item) => {
    const { id, timers } = item;

    const startId = timers[0].groupOrder === 0 ? 0 : 1;
    const endId = timers[0].groupOrder === 0 ? 1 : 0;

    const c = parseColorData(timers[startId].dps);

    /* 存储规则到本地缓存中 */
    return {
      startStatus: timers[startId].status,
      endStatus: timers[endId].status,
      groupId: id,
      ids: timers[startId].timerId,
      ide: timers[endId].timerId,
      data: {
        state: timers[startId].status === 1 || timers[endId].status === 1 ? true : false,
        execuing: timers[startId].status === 0 && timers[endId].status === 1 ? true : false,
        loops: timers[startId].loops,
        startTime: timers[startId].time,
        endTime: timers[endId].time,
        brightness: c.brightness,
      }
    };
  });
};

/* 产品的需求是有两个单项定时，使用组定时来实现该功能，将所有的单项定时都放到同一个组定时里，将aliasName标识为 SINGLE_TIMER_ALIAS_BNAME。
 * 以组定时中的 groudOrder 来标识定时的顺序。
 */
const formatCloudSingleData = (timerList: any[]) => {
  /* 获取云端的单项定时条目 */
  let timers = timerList.filter(item => item.timers.length == 1 && item.timers[0].aliasName === SINGLE_TIMER_ALIAS_BNAME).map((item) => {
    const { id, timers } = item;
    const p = parseSingleTimerDps(timers[0].dps);
    return (
      {
        status: timers[0].status,
        groupId: id,
        loops: timers[0].loops,
        time: timers[0].time,
        power: p.power,
      });
  });
  return timers;
};


/* 从云端定时数据中解析出颜色数据 */
const parseColorData = (action: string) => {
  const brightDpId = TYSdk.device.getDpIdByCode(brightCode);
  const brightness = action[brightDpId];
  return { brightness };
};

/* 从云端定时数据中解析出电源开关状态 */
const parseSingleTimerDps = (action: string) => {
  const powerDpId = TYSdk.device.getDpIdByCode(powerCode);
  const power = action[powerDpId] === undefined ?  true: action[powerDpId]; 
  return { power };
};

export const getTimerParams = (index: number) => {
  if (index < 0 || index >= group_timers.length) {
    return {
      startStatus: false,
      endStatus: false,
      groupId: 0,
      ids: 0,
      ide: 0,
      data: {
        state: false,
        execuing: false,
        loops: '',
        startTime: '',
        endTime: '',
        brightness: 1000,
      }
    };
  }
  return group_timers[index];
}

/* 颜色参数 */
export interface ColorData {
  isColour: boolean;
  h: number;
  s: number;
  t: number;
  b: number;
}

/* 将字值转化为4位长度的十六进制字符串 */
const decimalToHex = (num) => {
  var hex = Number(num).toString(16);
  while (hex.length < 4) {
      hex = "0" + hex;
  }
  return hex;
}

/* 生成定时事件的命令字符串 */
export const genTimerParams = (startTime: string, endTime: string, loops: string, brightness: number) => {
  const stepLoops = compareTime(startTime, endTime) > 0 && loops !== '0000000' && loops !== '1111111';
  const powerDpId = TYSdk.device.getDpIdByCode(powerCode);
  //const workModeDpId = TYSdk.device.getDpIdByCode(workModeCode);
  //const smearDpId = TYSdk.device.getDpIdByCode(smearCode);
  const colourDpId = TYSdk.device.getDpIdByCode(colourCode);
  const brightDpId = TYSdk.device.getDpIdByCode(brightCode);
  const tempDpId = TYSdk.device.getDpIdByCode(temperatureCode);
  const dpsStart: any = {};
  const dpsEnd: any = {};

  /* 生成开启灯的命令 */
  //dpsStart[powerDpId] = true;
  //dpsStart[workModeDpId] = color.isColour ? "colour" : "white";

  // 下面是幻彩灯串涂抹的定时设置，暂不用该协议设置灯串颜色
  //dpsStart[smearDpId] = genDimmerDps(color);

  // 下面是壁灯机型的定时设置，在幻彩灯串中不可用
  dpsStart[brightDpId] = brightness;

  /* 生成关闭灯的命令 */
  dpsEnd[powerDpId] = false;

  return {
    category: TIMER_CATEGORY,
    loops,
    instruct: [
      {
        dps: dpsStart,
        time: startTime,
        loops,
      },
      {
        dps: dpsEnd,
        time: endTime,
        loops: stepLoops ? loopsStepF(loops) : loops,
      }
    ],
    aliasName: '',
    isAppPush: false,
    options: {
      checkConflict: 0,
    },
  };
};

/* 生成定时事件的命令字符串 */
export const genSingleTimerParams = (time: string, loops: string, power: boolean) => {
  const powerDpId = TYSdk.device.getDpIdByCode(powerCode);
  let dps: any = {};

  if (power) {
    dps[powerDpId] = true;
  } else {
    dps[powerDpId] = false;
  }

  const instruct = [{
      dps,
      time,
      loops,
    }];

  return {
    category: TIMER_CATEGORY,
    loops,
    instruct,
    aliasName: SINGLE_TIMER_ALIAS_BNAME,
    isAppPush: false,
    options: {
      checkConflict: 0,
    },
  };
};

export const checkSingleTimerConflit = (index: number, time: string, status: boolean) => {
  let conflit = false;

  if (!status) {
    return false;
  }

  single_timers.map((t, i) => {
    if (i != index && t.status && t.time === time) {
      conflit = true;
    }
  });
  return conflit;
}

export const addSingleTimer = async (time: string, loops: string, power: boolean) => {
  if (single_timers.length >= SINGLE_TIMER_CNT_MAX) {
    return;
  }

  const params = genSingleTimerParams(time, loops, power);
  try{
    await Api.addTimer({ ...params } as any);
  } catch (error) {
    const err: { message?: string; errorMsg?: string } = parseJSON(error);
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });  
  }
}

export const setSingleTimerState = async (index: number, state: boolean) => {
  if (index < 0 || index >= single_timers.length) {
    return;
  }

  if (single_timers[index].status === state) {
    return;
  }

  /* 修改单项定时条目 */
  try {
    await Api.updateTimerStatus(TIMER_CATEGORY, single_timers[index].groupId, state ? 1: 0);
  } catch (error) {
    const err: { message?: string; errorMsg?: string } = parseJSON(error);
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });
  }
}

/* 修改定时规则 */
export const UpdateSingleTimerParams = async (index: number, time: string, loops: string, power: boolean) => {
  if (index < 0 || index >= single_timers.length) {
    return;
  }

  /* 修改单项定时条目 */
  const params = genSingleTimerParams(time, loops, power);
  try {
    await Api.updateTimer({ groupId: single_timers[index].groupId, ...params } as any);
  } catch (error) {
    const err: { message?: string; errorMsg?: string } = parseJSON(error);
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });
  }
}

export const deleteSingleTimer = async (index: number) => {
  try {
    await Api.removeTimer(single_timers[index].groupId, TIMER_CATEGORY);
  } catch (error) {
    const err: { message?: string; errorMsg?: string } = parseJSON(error);
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });
  }    
}

/* 修改定时规则状态：开启或关闭 */
export const setGroupTimerState = async (index: number, state: boolean) => {
  const timers = [...group_timers];

  /* 如果是开启定时，需要先检查是否与已经开启的定时存在冲突 */
  if (state) {
    const conflitList = checkGroupTimerConflit(timers[index].data.startTime, timers[index].data.endTime, timers[index].data.loops, index, timers);
    if (conflitList.length > 0) {
      return conflitList;
    }
  }

  try {
    await Api.updateTimerStatus(TIMER_CATEGORY, timers[index].groupId, state ? 1: 0);
  } catch (error) {
    const err: { message?: string; errorMsg?: string } = parseJSON(error);
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });
  }
};

/* 根据index删除对应的定时规则 */
export const deleteGroupTimer = async (index: number) => {
  try {
    await Api.removeTimer(group_timers[index].groupId, TIMER_CATEGORY);
  } catch (error) {
    const err: { message?: string; errorMsg?: string } = parseJSON(error);
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });
  }  
};

/* 添加定时规则 */
export const addGroupTimer = async (startTime: string, endTime: string, loops: string, brightness: number) => {
  if (group_timers.length >= GROUP_TIMER_CNT_MAX) {
    return;
  }

  const conflitList = checkGroupTimerConflit(startTime, endTime, loops, -1, group_timers);
  if (conflitList.length > 0) {
    //TYSdk.native.simpleTipDialog('add conflit', () => {});
    return conflitList;
  }

  const params = genTimerParams(startTime, endTime, loops, brightness);
  try {
    Api.addTimer({ ...params } as any);
  } catch (error) {
    const err: { message?: string; errorMsg?: string } = parseJSON(error);
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });
  }
};

/* 修改定时规则 */
export const updateGroupTimer = async (index: number, startTime: string, endTime: string, loops: string, brightness: number) => {
  const conflitList = checkGroupTimerConflit(startTime, endTime, loops, index, group_timers)
  if (conflitList.length > 0) {
    //TYSdk.native.simpleTipDialog('update conflit: ' + index, () => {});
    return conflitList;
  }

  const params = genTimerParams(startTime, endTime, loops, brightness);

  try {
    Api.updateTimer({ groupId: group_timers[index].groupId, ...params } as any);
  } catch (error) {
    const err: { message?: string; errorMsg?: string } = parseJSON(error);
    GlobalToast.show({ text: err.message || err.errorMsg, d: icons.error, show: true, onFinish: GlobalToast.hide });
  }
};