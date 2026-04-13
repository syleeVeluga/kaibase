import { style } from '@vanilla-extract/css';
import { vars } from '../../theme/tokens.css.js';

export const tabs = style({
  display: 'flex',
  gap: vars.space.xs,
  marginBottom: vars.space.lg,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const tab = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  color: vars.color.textSecondary,
  cursor: 'pointer',
  border: 'none',
  background: 'none',
  borderBottom: '2px solid transparent',
  marginBottom: '-1px',
  transition: 'all 0.15s',
  ':hover': {
    color: vars.color.text,
  },
});

export const tabActive = style([tab, {
  color: vars.color.selectionText,
  borderBottomColor: vars.color.selectionBorder,
  backgroundColor: vars.color.selectionSurface,
  borderTopLeftRadius: vars.radius.md,
  borderTopRightRadius: vars.radius.md,
}]);

export const dropZone = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.space.sm,
  padding: vars.space.xl,
  border: `2px dashed ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  color: vars.color.textSecondary,
  fontSize: vars.fontSize.sm,
  cursor: 'pointer',
  transition: 'all 0.15s',
  ':hover': {
    borderColor: vars.color.primary,
    backgroundColor: vars.color.selectionSurface,
  },
});

export const dropZoneActive = style([dropZone, {
  borderColor: vars.color.selectionBorder,
  backgroundColor: vars.color.selectionSurface,
  color: vars.color.selectionText,
}]);

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
  marginBottom: vars.space.md,
});

export const formLabel = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  color: vars.color.textSecondary,
});

export const formInput = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.md,
  outline: 'none',
  ':focus': {
    borderColor: vars.color.primary,
  },
});

export const formTextarea = style([formInput, {
  minHeight: '120px',
  resize: 'vertical',
  fontFamily: 'inherit',
}]);

export const actions = style({
  display: 'flex',
  gap: vars.space.sm,
  marginTop: vars.space.md,
});

export const successMessage = style({
  color: vars.color.success,
  fontSize: vars.fontSize.sm,
  padding: vars.space.sm,
  backgroundColor: '#f0fdf4',
  borderRadius: vars.radius.sm,
  marginBottom: vars.space.md,
});

export const connectorCard = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: vars.space.md,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  marginBottom: vars.space.sm,
});

export const connectorInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
});

export const connectorName = style({
  fontWeight: 600,
  fontSize: vars.fontSize.sm,
});

export const connectorMeta = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
});

export const connectorActions = style({
  display: 'flex',
  gap: vars.space.xs,
});

export const dangerButton = style({
  padding: `${vars.space.xs} ${vars.space.sm}`,
  backgroundColor: 'transparent',
  color: vars.color.error,
  border: `1px solid ${vars.color.error}`,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.xs,
  cursor: 'pointer',
  ':hover': {
    backgroundColor: '#fef2f2',
  },
});
