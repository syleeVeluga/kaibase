import { style } from '@vanilla-extract/css';
import { vars } from '../theme/tokens.css.js';
import { card, badge } from '../theme/shared.css.js';

export const functionGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  gap: vars.space.lg,
  marginTop: vars.space.lg,
});

export const functionCard = style([card, {
  transition: 'border-color 0.15s',
  ':hover': {
    borderColor: vars.color.textMuted,
  },
}]);

export const functionCardCustomized = style([card, {
  transition: 'border-color 0.15s',
  borderColor: vars.color.primary,
  borderWidth: '2px',
  ':hover': {
    borderColor: vars.color.primary,
  },
}]);

export const cardHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: vars.space.md,
});

export const cardTitle = style({
  fontSize: vars.fontSize.lg,
  fontWeight: 600,
});

export const cardDescription = style({
  fontSize: vars.fontSize.sm,
  color: vars.color.textSecondary,
  marginBottom: vars.space.md,
});

export const configSummary = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.space.sm,
  marginBottom: vars.space.md,
});

export const configTag = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: vars.space.xs,
  padding: `2px ${vars.space.sm}`,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
});

export const configTagLabel = style({
  fontWeight: 600,
});

export const badgeCustomized = style([badge, {
  backgroundColor: vars.color.info,
  color: vars.color.background,
}]);

export const badgeDefault = style([badge, {
  backgroundColor: vars.color.surface,
  color: vars.color.textMuted,
}]);

export const editForm = style({
  marginTop: vars.space.md,
  paddingTop: vars.space.md,
  borderTop: `1px solid ${vars.color.border}`,
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
  marginBottom: vars.space.md,
});

export const formLabel = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 500,
  color: vars.color.textSecondary,
});

export const formInput = style({
  padding: `${vars.space.sm} ${vars.space.md}`,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.sm,
  outline: 'none',
  ':focus': {
    borderColor: vars.color.primary,
  },
});

export const formSelect = style([formInput, {
  cursor: 'pointer',
}]);

export const formTextarea = style([formInput, {
  minHeight: '120px',
  resize: 'vertical',
  fontFamily: vars.font.mono,
  fontSize: vars.fontSize.xs,
  lineHeight: '1.6',
}]);

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.space.md,
});

export const formActions = style({
  display: 'flex',
  gap: vars.space.sm,
  marginTop: vars.space.md,
});

export const variablesSection = style({
  marginTop: vars.space.sm,
  padding: vars.space.sm,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.sm,
  fontSize: vars.fontSize.xs,
  color: vars.color.textSecondary,
});

export const variableTag = style({
  display: 'inline-block',
  padding: `1px ${vars.space.xs}`,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontFamily: vars.font.mono,
  fontSize: '11px',
  marginRight: vars.space.xs,
  marginBottom: vars.space.xs,
});

/* Pipeline Visualization */
export const pipelineContainer = style({
  padding: vars.space.lg,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  overflowX: 'auto',
});

export const pipelineTitle = style({
  fontSize: vars.fontSize.sm,
  fontWeight: 600,
  color: vars.color.textSecondary,
  marginBottom: vars.space.md,
});

export const pipelineRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  flexWrap: 'nowrap',
});

export const pipelineNode = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.xs,
  padding: `${vars.space.xs} ${vars.space.md}`,
  backgroundColor: vars.color.background,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  fontSize: vars.fontSize.xs,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  cursor: 'default',
});

export const pipelineNodeCustomized = style([pipelineNode, {
  borderColor: vars.color.primary,
  backgroundColor: vars.color.surfaceHover,
}]);

export const pipelineNodeStatic = style([pipelineNode, {
  backgroundColor: vars.color.surface,
  color: vars.color.textMuted,
}]);

export const pipelineDot = style({
  width: '6px',
  height: '6px',
  borderRadius: vars.radius.full,
  backgroundColor: vars.color.primary,
  flexShrink: 0,
});

export const pipelineArrow = style({
  color: vars.color.textMuted,
  fontSize: vars.fontSize.sm,
  flexShrink: 0,
});

export const pipelineBranch = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.xs,
});

export const pipelineStandalone = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.sm,
  marginTop: vars.space.sm,
});

export const standaloneLabel = style({
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  fontStyle: 'italic',
});

export const savedMessage = style({
  color: vars.color.success,
  fontSize: vars.fontSize.xs,
  marginTop: vars.space.xs,
});

export const versionTag = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: `1px ${vars.space.xs}`,
  backgroundColor: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.sm,
  fontSize: '11px',
  fontFamily: vars.font.mono,
  color: vars.color.textMuted,
  fontWeight: 500,
});

export const defaultTemplateSection = style({
  marginTop: vars.space.sm,
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  overflow: 'hidden',
});

export const defaultTemplateToggle = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.space.xs,
  width: '100%',
  padding: `${vars.space.xs} ${vars.space.sm}`,
  background: vars.color.surface,
  border: 'none',
  cursor: 'pointer',
  fontSize: vars.fontSize.xs,
  color: vars.color.textMuted,
  textAlign: 'left',
  ':hover': {
    color: vars.color.text,
  },
});

export const defaultTemplateContent = style({
  padding: vars.space.sm,
  backgroundColor: vars.color.background,
  borderTop: `1px solid ${vars.color.border}`,
});

export const defaultTemplateLabel = style({
  fontSize: vars.fontSize.xs,
  fontWeight: 600,
  color: vars.color.textMuted,
  marginBottom: vars.space.xs,
  marginTop: vars.space.sm,
  selectors: {
    '&:first-child': {
      marginTop: 0,
    },
  },
});

export const defaultTemplateText = style({
  margin: 0,
  padding: vars.space.sm,
  backgroundColor: vars.color.surface,
  borderRadius: vars.radius.sm,
  fontSize: '11px',
  fontFamily: vars.font.mono,
  lineHeight: '1.6',
  color: vars.color.textSecondary,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: '200px',
  overflowY: 'auto',
});
