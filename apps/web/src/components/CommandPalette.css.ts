import { style, keyframes } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

export const overlay = style({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '15vh',
  zIndex: 1000,
  animation: `${fadeIn} 0.1s ease-out`,
});

export const container = style({
  width: '100%',
  maxWidth: '560px',
  backgroundColor: vars.color.background,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.lg,
  overflow: 'hidden',
});

export const inputWrapper = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.md} ${vars.space.lg}`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const searchIcon = style({
  color: vars.color.textMuted,
  flexShrink: 0,
});

export const input = style({
  flex: 1,
  border: 'none',
  outline: 'none',
  fontSize: vars.fontSize.md,
  fontFamily: vars.font.body,
  backgroundColor: 'transparent',
  color: vars.color.text,
  '::placeholder': {
    color: vars.color.textMuted,
  },
});

export const results = style({
  maxHeight: '320px',
  overflowY: 'auto',
});

export const resultItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  padding: `${vars.space.sm} ${vars.space.lg}`,
  cursor: 'pointer',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'background-color 0.1s',
  ':hover': {
    backgroundColor: vars.color.surfaceHover,
  },
});

export const resultTitle = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  color: vars.color.text,
});

export const resultType = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  marginLeft: 'auto',
});

export const hint = style({
  padding: `${vars.space.sm} ${vars.space.lg}`,
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  textAlign: 'center',
});
