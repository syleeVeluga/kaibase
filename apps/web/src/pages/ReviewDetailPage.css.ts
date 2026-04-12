import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: vars.space.lg,
});

export const headerLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
});

export const headerTitle = style({
  fontSize: vars.fontSize.xl,
  fontWeight: 700,
});

export const reasoningCard = style({
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  padding: vars.space.md,
  marginBottom: vars.space.lg,
});

export const reasoningLabel = style({
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  color: vars.color.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: vars.space.sm,
});

export const reasoningText = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.text,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
});

export const diffContainer = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.space.md,
  marginBottom: vars.space.lg,
  '@media': {
    '(max-width: 900px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const diffPanel = style({
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  overflow: 'hidden',
});

export const diffPanelHeader = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  borderBottom: `1px solid ${vars.color.border}`,
  backgroundColor: vars.color.surface,
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  color: vars.color.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

export const diffPanelBody = style({
  padding: vars.space.md,
  minHeight: '300px',
  maxHeight: '600px',
  overflowY: 'auto',
});

export const notesSection = style({
  marginBottom: vars.space.lg,
});

export const notesLabel = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  color: vars.color.text,
  marginBottom: vars.space.sm,
});

export const notesTextarea = style({
  width: '100%',
  minHeight: '100px',
  padding: vars.space.sm,
  borderRadius: vars.radius.md,
  border: `1px solid ${vars.color.border}`,
  fontSize: vars.fontSize.sm,
  fontFamily: vars.font.body,
  resize: 'vertical',
  color: vars.color.text,
  ':focus': {
    outline: 'none',
    borderColor: vars.color.primary,
    boxShadow: `0 0 0 2px ${vars.color.primary}20`,
  },
});

export const actionBar = style({
  display: 'flex',
  gap: vars.space.sm,
  justifyContent: 'flex-end',
  paddingTop: vars.space.md,
  borderTop: `1px solid ${vars.color.border}`,
});

export const noContentMessage = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '200px',
  color: vars.color.textMuted,
  fontSize: vars.fontSize.sm,
  fontStyle: 'italic',
});

export const dateMeta = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
  textAlign: 'right',
  marginTop: vars.space.sm,
});
