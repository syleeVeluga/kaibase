import { style } from '@vanilla-extract/css';
import { vars } from '../../theme/tokens.css.js';

export const container = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100%',
  backgroundColor: vars.color.surface,
});

export const card = style({
  width: '100%',
  maxWidth: '400px',
  padding: vars.space.xl,
  backgroundColor: vars.color.background,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.lg,
});

export const title = style({
  fontSize: vars.fontSize.xxl,
  fontWeight: 700,
  textAlign: 'center',
  marginBottom: vars.space.xs,
});

export const subtitle = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textSecondary,
  textAlign: 'center',
  marginBottom: vars.space.xl,
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.md,
});

export const fieldGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
});

export const label = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  color: vars.color.textSecondary,
});

export const input = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.md,
  outline: 'none',
  transition: 'border-color 0.15s',
  ':focus': {
    borderColor: vars.color.primary,
  },
});

export const button = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  backgroundColor: vars.color.primary,
  color: '#ffffff',
  border: 'none',
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.md,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  marginTop: vars.space.sm,
  ':hover': {
    backgroundColor: vars.color.primaryHover,
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const errorMessage = style({
  color: vars.color.error,
  fontSize: vars.fontSize.sm,
  textAlign: 'center',
  padding: vars.space.sm,
  backgroundColor: '#fef2f2',
  borderRadius: vars.radius.sm,
});

export const switchLink = style({
  textAlign: 'center',
  fontSize: vars.fontSize.sm,
  color: vars.color.textSecondary,
  marginTop: vars.space.md,
});
