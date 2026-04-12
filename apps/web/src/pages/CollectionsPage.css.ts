import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: vars.space.md,
});

export const collectionCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
  padding: vars.space.lg,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  textDecoration: 'none',
  color: 'inherit',
  transition: 'all 0.15s',
  ':hover': {
    borderColor: vars.color.primary,
    boxShadow: vars.shadow.md,
  },
});

export const cardName = style({
  fontSize: vars.fontSize.md,
  fontWeight: 600,
  color: vars.color.text,
});

export const cardDescription = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textSecondary,
  lineHeight: 1.5,
});

export const cardMeta = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  marginTop: 'auto',
  paddingTop: vars.space.sm,
});
