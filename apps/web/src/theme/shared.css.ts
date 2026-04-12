import { style } from '@vanilla-extract/css';
import { vars } from './tokens.css.js';

export const pageHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: vars.space.lg,
});

export const pageTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: 700,
});

export const badge = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: `2px ${vars.space.sm}`,
  borderRadius: vars.radius.full,
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const badgePending = style([badge, {
  backgroundColor: '#fef3c7',
  color: '#92400e',
}]);

export const badgeProcessing = style([badge, {
  backgroundColor: '#dbeafe',
  color: '#1e40af',
}]);

export const badgeProcessed = style([badge, {
  backgroundColor: '#dcfce7',
  color: '#166534',
}]);

export const badgeFailed = style([badge, {
  backgroundColor: '#fef2f2',
  color: '#991b1b',
}]);

export const badgeDraft = style([badge, {
  backgroundColor: '#f1f5f9',
  color: '#475569',
}]);

export const badgePublished = style([badge, {
  backgroundColor: '#dcfce7',
  color: '#166534',
}]);

export const primaryButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.xs,
  padding: `${vars.space.sm} ${vars.space.md}`,
  backgroundColor: vars.color.primary,
  color: '#ffffff',
  border: 'none',
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  ':hover': {
    backgroundColor: vars.color.primaryHover,
  },
  ':disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
});

export const secondaryButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.xs,
  padding: `${vars.space.sm} ${vars.space.md}`,
  backgroundColor: 'transparent',
  color: vars.color.textSecondary,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s',
  ':hover': {
    backgroundColor: vars.color.surfaceHover,
    borderColor: vars.color.textSecondary,
  },
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
});

export const th = style({
  textAlign: 'left',
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderBottom: `2px solid ${vars.color.border}`,
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  color: vars.color.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const td = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderBottom: `1px solid ${vars.color.border}`,
  fontSize: vars.fontSize.sm,
});

export const emptyState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.space.xxl,
  color: vars.color.textMuted,
  fontSize: vars.fontSize.sm,
});

export const card = style({
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space.lg,
});

export const loading = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.space.xxl,
  color: vars.color.textMuted,
});

export const backLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.xs,
  color: vars.color.textSecondary,
  textDecoration: 'none',
  fontSize: vars.fontSize.sm,
  marginBottom: vars.space.md,
  ':hover': {
    color: vars.color.text,
  },
});

export const textMeta = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
});
