import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const emptyStateCard = style({
  display: 'grid',
  gap: vars.space.xl,
  padding: vars.space.xl,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
});

export const emptyStateContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
  maxWidth: '560px',
});

export const emptyStateTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: 700,
  color: vars.color.text,
});

export const emptyStateDescription = style({
  fontSize: vars.fontSize.md,
  color: vars.color.textSecondary,
  lineHeight: 1.6,
});

export const emptyStateForm = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.md,
  maxWidth: '420px',
});

export const emptyStateLabel = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  color: vars.color.text,
});

export const emptyStateInput = style({
  width: '100%',
  padding: `${vars.space.sm} ${vars.space.md}`,
  fontSize: vars.fontSize.sm,
  color: vars.color.text,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  selectors: {
    '&:focus': {
      outline: 'none',
      borderColor: vars.color.primary,
      boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.18)',
    },
  },
});

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: vars.space.md,
  marginBottom: vars.space.xl,
});

export const statCard = style({
  display: 'flex',
  flexDirection: 'column',
  padding: vars.space.lg,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
});

export const statValue = style({
  fontSize: vars.fontSize.xxl,
  fontWeight: 700,
  color: vars.color.text,
  lineHeight: 1,
});

export const statLabel = style({
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  color: vars.color.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginTop: vars.space.sm,
});

export const healthSection = style({
  marginTop: vars.space.xl,
});

export const healthTitle = style({
  fontSize: vars.fontSize.lg,
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: vars.space.md,
});

export const healthGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: vars.space.md,
});

export const healthCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.sm,
  padding: vars.space.lg,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
});

export const healthLabel = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  color: vars.color.text,
});

export const healthValue = style({
  fontSize: vars.fontSize.xl,
  fontWeight: 700,
});

export const progressBar = style({
  width: '100%',
  height: '8px',
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.full,
  overflow: 'hidden',
});

export const progressFill = style({
  height: '100%',
  borderRadius: vars.radius.full,
  transition: 'width 0.3s',
});
