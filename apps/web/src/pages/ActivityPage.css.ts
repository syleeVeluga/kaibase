import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const filters = style({
  display: 'flex',
  gap: vars.space.sm,
  marginBottom: vars.space.lg,
  flexWrap: 'wrap',
});

export const filterSelect = style({
  padding: `${vars.space.xs} ${vars.space.sm}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.body,
  backgroundColor: vars.color.background,
  color: vars.color.text,
  outline: 'none',
});

export const timeline = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1px',
});

export const eventRow = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.space.md,
  padding: `${vars.space.md} 0`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const eventIcon = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: vars.radius.full,
  backgroundColor: vars.color.surface,
  flexShrink: 0,
  fontSize: vars.fontSize.sm,
});

export const eventContent = style({
  flex: 1,
  minWidth: 0,
});

export const eventType = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  color: vars.color.text,
});

export const eventDetail = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
  marginTop: '2px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const eventTime = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  flexShrink: 0,
  whiteSpace: 'nowrap',
});

export const loadMore = style({
  display: 'flex',
  justifyContent: 'center',
  paddingTop: vars.space.lg,
});
