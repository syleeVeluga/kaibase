import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const header = style({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: vars.space.lg,
  gap: vars.space.md,
});

export const titleArea = style({
  flex: 1,
});

export const title = style({
  fontSize: vars.fontSize.xxl,
  fontWeight: 700,
  marginBottom: vars.space.sm,
});

export const meta = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
});

export const actions = style({
  display: 'flex',
  gap: vars.space.sm,
  flexShrink: 0,
});

export const layout = style({
  display: 'grid',
  gridTemplateColumns: '1fr 280px',
  gap: vars.space.lg,
  '@media': {
    '(max-width: 900px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const content = style({
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space.lg,
  minHeight: '400px',
});

export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.md,
});

export const metaCard = style({
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space.md,
});

export const metaLabel = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: vars.space.xs,
});

export const metaValue = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.text,
});

export const archiveButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${vars.space.sm} ${vars.space.md}`,
  backgroundColor: 'transparent',
  color: vars.color.textSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  cursor: 'pointer',
  ':hover': {
    backgroundColor: vars.color.surfaceHover,
    color: vars.color.error,
    borderColor: vars.color.error,
  },
  selectors: {
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
  },
});
