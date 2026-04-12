import { style } from '@vanilla-extract/css';
import { vars } from '../../theme/tokens.css.js';

export const sidebar = style({
  width: '240px',
  height: '100%',
  borderRight: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surface,
  display: 'flex',
  flexDirection: 'column',
  padding: vars.space.md,
});

export const logo = style({
  fontSize: vars.fontSize.xl,
  fontWeight: 700,
  padding: `${vars.space.md} ${vars.space.sm}`,
  marginBottom: vars.space.lg,
});

export const nav = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
});

export const navLink = style({
  display: 'block',
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderRadius: vars.radius.md,
  color: vars.color.textSecondary,
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  textDecoration: 'none',
  ':hover': {
    backgroundColor: vars.color.surfaceHover,
    color: vars.color.text,
  },
});

export const navLinkActive = style([
  navLink,
  {
    backgroundColor: vars.color.primary,
    color: '#ffffff',
    ':hover': {
      backgroundColor: vars.color.primaryHover,
      color: '#ffffff',
    },
  },
]);
