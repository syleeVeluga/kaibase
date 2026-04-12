import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const searchBar = style({
  display: 'flex',
  gap: vars.space.sm,
  marginBottom: vars.space.lg,
});

export const searchInput = style({
  flex: 1,
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.md,
  fontFamily: vars.font.body,
  outline: 'none',
  transition: 'border-color 0.15s',
  ':focus': {
    borderColor: vars.color.primary,
    boxShadow: `0 0 0 3px ${vars.color.primary}20`,
  },
  '::placeholder': {
    color: vars.color.textMuted,
  },
});

export const resultsList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
});

export const resultCard = style({
  display: 'block',
  padding: vars.space.md,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  textDecoration: 'none',
  color: 'inherit',
  transition: 'all 0.15s',
  ':hover': {
    borderColor: vars.color.primary,
    backgroundColor: vars.color.surface,
  },
});

export const resultTitle = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: vars.space.xs,
});

export const resultSnippet = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
  lineHeight: 1.5,
});

export const resultMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  marginTop: vars.space.sm,
});

export const resultCount = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  marginBottom: vars.space.md,
});
