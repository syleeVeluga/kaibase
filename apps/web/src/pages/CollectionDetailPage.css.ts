import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.md,
  marginBottom: vars.space.lg,
});

export const description = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textSecondary,
  marginBottom: vars.space.lg,
});
