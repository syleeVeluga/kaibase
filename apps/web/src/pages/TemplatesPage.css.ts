import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const list = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
  marginBottom: vars.space.xl,
});

export const templateRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: vars.space.md,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
});

export const templateName = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  color: vars.color.text,
});

export const templateMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.md,
  padding: vars.space.lg,
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
});

export const formLabel = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  color: vars.color.text,
});

export const formInput = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.body,
  outline: 'none',
  ':focus': {
    borderColor: vars.color.primary,
  },
});

export const formTextarea = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.body,
  minHeight: '100px',
  resize: 'vertical',
  outline: 'none',
  ':focus': {
    borderColor: vars.color.primary,
  },
});

export const formSelect = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.body,
  backgroundColor: vars.color.background,
  outline: 'none',
});

export const formActions = style({
  display: 'flex',
  gap: vars.space.sm,
  justifyContent: 'flex-end',
});
