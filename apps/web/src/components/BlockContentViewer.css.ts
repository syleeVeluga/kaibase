import { style, globalStyle } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const container = style({
  lineHeight: 1.7,
  color: vars.color.text,
  fontSize: vars.fontSize.md,
});

export const heading1 = style({
  fontSize: vars.fontSize.xxl,
  fontWeight: 700,
  marginTop: vars.space.xl,
  marginBottom: vars.space.md,
  ':first-child': { marginTop: 0 },
});

export const heading2 = style({
  fontSize: vars.fontSize.xl,
  fontWeight: 600,
  marginTop: vars.space.lg,
  marginBottom: vars.space.sm,
});

export const heading3 = style({
  fontSize: vars.fontSize.lg,
  fontWeight: 600,
  marginTop: vars.space.md,
  marginBottom: vars.space.sm,
});

export const paragraph = style({
  marginBottom: vars.space.md,
});

export const list = style({
  marginBottom: vars.space.md,
  paddingLeft: vars.space.lg,
});

export const listItem = style({
  marginBottom: vars.space.xs,
});

export const quote = style({
  borderLeft: `3px solid ${vars.color.primary}`,
  paddingLeft: vars.space.md,
  marginBottom: vars.space.md,
  color: vars.color.textSecondary,
  fontStyle: 'italic',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  marginBottom: vars.space.md,
  fontSize: vars.fontSize.sm,
});

globalStyle(`${table} th`, {
  textAlign: 'left',
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderBottom: `2px solid ${vars.color.border}`,
  fontWeight: 600,
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
});

globalStyle(`${table} td`, {
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const divider = style({
  border: 'none',
  borderTop: `1px solid ${vars.color.border}`,
  margin: `${vars.space.lg} 0`,
});

export const citation = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.primary,
  fontWeight: 600,
  verticalAlign: 'super',
  marginLeft: '2px',
  cursor: 'default',
});

export const emptyMessage = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.space.xxl,
  color: vars.color.textMuted,
  fontSize: vars.fontSize.sm,
});
