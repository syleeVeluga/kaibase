import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  maxHeight: 'calc(100vh - 32px)',
});

export const answerArea = style({
  flex: 1,
  overflowY: 'auto',
  padding: vars.space.lg,
});

export const emptyPrompt = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: vars.color.textMuted,
  gap: vars.space.md,
});

export const emptyTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: 600,
  color: vars.color.text,
});

export const answerCard = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space.lg,
  marginBottom: vars.space.md,
});

export const questionText = style({
  fontSize: vars.fontSize.md,
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: vars.space.md,
});

export const answerText = style({
  fontSize: vars.fontSize.sm,
  lineHeight: 1.7,
  color: vars.color.text,
  whiteSpace: 'pre-wrap',
});

export const citationMarker = style({
  display: 'inline',
  color: vars.color.primary,
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  cursor: 'pointer',
  verticalAlign: 'super',
  ':hover': {
    textDecoration: 'underline',
  },
});

export const citationsSection = style({
  marginTop: vars.space.md,
  paddingTop: vars.space.md,
  borderTop: `1px solid ${vars.color.border}`,
});

export const citationsTitle = style({
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  color: vars.color.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: vars.space.sm,
});

export const citationItem = style({
  display: 'flex',
  gap: vars.space.sm,
  padding: `${vars.space.xs} 0`,
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
});

export const citationIndex = style({
  color: vars.color.primary,
  fontWeight: 600,
  flexShrink: 0,
});

export const metaRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.md,
  marginTop: vars.space.md,
});

export const confidenceBadge = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.xs,
  padding: `2px ${vars.space.sm}`,
  borderRadius: vars.radius.full,
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
});

export const inputArea = style({
  display: 'flex',
  gap: vars.space.sm,
  padding: vars.space.lg,
  borderTop: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.background,
});

export const inputField = style({
  flex: 1,
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.body,
  outline: 'none',
  transition: 'border-color 0.15s',
  ':focus': {
    borderColor: vars.color.primary,
  },
  '::placeholder': {
    color: vars.color.textMuted,
  },
});
