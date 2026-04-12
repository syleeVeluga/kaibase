import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const divider = style({
  border: 'none',
  borderTop: `1px solid ${vars.color.border}`,
  margin: `${vars.space.lg} 0`,
});

export const sectionHeading = style({
  fontSize: vars.fontSize.lg,
  fontWeight: 600,
  marginBottom: vars.space.md,
});

export const accountDescription = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textSecondary,
  marginBottom: vars.space.md,
});
