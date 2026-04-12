import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  height: '100%',
});

export const main = style({
  flex: 1,
  overflow: 'auto',
  padding: '24px',
});
