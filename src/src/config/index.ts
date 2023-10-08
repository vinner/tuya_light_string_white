import theme from './theme';
import dpCodes from './dpCodes';

const WHITEPARAM = {
  TEMP_MIN: 140,
  TEMP_MAX: 700,
  KELVIN_MIN: 2000,
  KELVIN_MAX: 7000,
}

const WORKMODE = {
  WHITE: 'white',
  COLOUR: 'colour',
  COLOUR_WHITE: 'colour_white',
  SCENE: 'scene',
  MUSIC: 'music',
};

export { dpCodes, theme, WORKMODE, WHITEPARAM };
