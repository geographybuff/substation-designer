/**
 * "Help me fix this": the expandable help shown under a finding or an unmet
 * objective in campaign mode. Steps, an optional diagram, and actions: Show me
 * (select and frame the items, pulse the right toolbox entry, turn on the
 * overlay), Do it for me (one-click mechanical fixes) and the Field Guide.
 */
import { useState } from 'preact/hooks';
import type { Help } from '../../content/help';
import { HelpDiagram } from './HelpDiagram';

export interface HelpActions {
  showMe: (h: Help) => void;
  fix: (h: Help) => void;
  guide: (topic: string) => void;
}

export function HelpToggle({ help, actions, testId }: { help: Help | null; actions: HelpActions; testId?: string }) {
  const [open, setOpen] = useState(false);
  if (!help) return null;
  return (
    <div class="help" onClick={(e) => e.stopPropagation()}>
      <button class="help-link" onClick={() => setOpen(!open)} aria-expanded={open} data-testid={testId ?? 'help-toggle'}>
        {open ? '▾ Hide help' : '▸ Help me fix this'}
      </button>
      {open && <HelpBody help={help} actions={actions} />}
    </div>
  );
}

export function HelpBody({ help, actions }: { help: Help; actions: HelpActions }) {
  const canShow = !!(help.tool || help.overlay || help.itemIds?.length || help.diagram);
  return (
    <div class="help-body" data-testid="help-body">
      <p class="help-what">{help.what}</p>
      {help.steps.length > 0 && (
        <ol class="help-steps">
          {help.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
      {help.diagram && <HelpDiagram id={help.diagram} />}
      <div class="help-actions">
        {canShow && (
          <button class="btn small" onClick={() => actions.showMe(help)} data-testid="help-show">
            Show me
          </button>
        )}
        {help.fix && (
          <button class="btn small primary" onClick={() => actions.fix(help)} data-testid="help-fix" title="Makes the change for you; undo with Ctrl+Z">
            {help.fix.label}
          </button>
        )}
        {help.guide && (
          <button class="btn small" onClick={() => actions.guide(help.guide!)} data-testid="help-guide">
            Field Guide
          </button>
        )}
      </div>
    </div>
  );
}
