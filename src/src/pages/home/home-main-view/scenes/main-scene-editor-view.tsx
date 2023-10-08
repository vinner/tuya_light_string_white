/* eslint-disable @typescript-eslint/no-empty-function */
import React, { Component } from 'react';
import { StyleSheet, Animated, Easing, } from 'react-native';
import { Utils } from 'tuya-panel-kit';
import CustomScene from '../../../customScene';

const { width: winWidth } = Utils.RatioUtils;

interface SceneEditorProps {
  theme?: any;
  isEditting: boolean;
  onComplete: (value: string, sceneDatas)=>void;
}

interface SceneEditorState {
}

export default class SceneEditor extends Component<SceneEditorProps, SceneEditorState> {
  editting = false;  
  waveAnim = new Animated.Value(0);
  initFlag = false;
  onComplete = false;
  onCompleteValue = '';
  newSceneDatas = [];

  isEdit = false; // 判断是编辑场景还是添加场景，true为编辑，false为添加
  value = '';

  constructor(props: SceneEditorProps) {
    super(props);
  };

  setInstance = (name: string) => (ref: SceneEditor) => {
    this[`_ref_${name}`] = ref;
  };

  getInstance = (name: string) => this[`_ref_${name}`];

  componentDidUpdate() {
    if (this.props.isEditting !== this.editting) {
      this.startWaveAnimation(this.props.isEditting);
    }
  }

  /* 开始进入或退出编辑界面的动画 */
  startWaveAnimation = (editting: boolean) => {
    const { onComplete } = this.props;
    const startValue = editting ? 0 : 1;
    const endValue = editting ? 1 : 0;

    this.waveAnim.setValue(startValue);
    Animated.timing(this.waveAnim, {
      toValue: endValue,
      duration: 300,
      easing: Easing.bezier(.22,.62,.6,.9),
    }).start(
      () => {
        this.editting = editting;
        if (this.onComplete) {
          onComplete && onComplete(this.onCompleteValue, this.newSceneDatas);
          this.onComplete = false;
        }
      }
    );
  };

  /* 进入编辑界面 */
  setEditParams = (isEdit: boolean, value: string) => {
    this.initFlag = !this.initFlag;
    this.isEdit = isEdit;
    this.value = value;
  }

  /* 完成场景编辑时的回调函数，退出编辑状态 */
  handleCustomSceneComplete = (value: string, sceneDatas) => {
    this.onComplete = true;
    this.onCompleteValue = value;
    this.newSceneDatas = sceneDatas;
    this.startWaveAnimation(false);
  };

  render() {
    return (
      <Animated.View
          accessibilityLabel="HomeScene_Custom_Editor"
          style={[
            styles.editor,
            {
              paddingTop:10
            },
            {
              transform: [
                {
                  translateX: this.waveAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -winWidth],
                  }),
                },
              ],
            },
          ]}
      >
        <CustomScene
            id='customScene'
            title=' '
            isEdit={this.isEdit}
            initFlag={this.initFlag}
            value={this.value}
            onComplete={this.handleCustomSceneComplete}
          />
      </Animated.View>
    );
  };
};

const styles = StyleSheet.create({
  editor: {
    width: '100%',
    height: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});