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
  marginBottom: vars.space.xs,
});

export const workspaceName = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontWeight: 500,
  padding: `0 ${vars.space.sm}`,
  marginBottom: vars.space.lg,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const nav = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
  flex: 1,
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
    backgroundColor: vars.color.selection,
    color: vars.color.selectionText,
    boxShadow: `inset 0 0 0 1px ${vars.color.selectionBorder}`,
    ':hover': {
      backgroundColor: vars.color.selectionHover,
      color: vars.color.selectionText,
    },
  },
]);

export const userSection = style({
  borderTop: `1px solid ${vars.color.border}`,
  paddingTop: vars.space.md,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
});

export const userName = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  color: vars.color.text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const navLinkContent = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
});

export const logoutButton = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  padding: 0,
  ':hover': {
    color: vars.color.error,
  },
});
