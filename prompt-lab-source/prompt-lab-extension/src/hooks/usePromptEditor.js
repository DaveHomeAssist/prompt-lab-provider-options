import useEditorState from './useEditorState.js';
import useExecutionFlow from './useExecutionFlow.js';
import usePersistenceFlow from './usePersistenceFlow.js';

/**
 * Backward-compatible composition wrapper.
 *
 * App can compose useEditorState/useExecutionFlow/usePersistenceFlow directly.
 * This wrapper preserves the legacy usePromptEditor() API surface.
 */
export default function usePromptEditor(ui, lib) {
  const editor = useEditorState();
  const persistence = usePersistenceFlow({ ui, lib, editor });
  const execution = useExecutionFlow({ ui, lib, editor, persistence });

  const doSave = () => persistence.doSave(execution.refreshEvalRuns);
  const clearEditor = () => {
    execution.clearExecutionState();
    persistence.clearPersistenceState();
    editor.clearEditorState();
  };

  return {
    ...editor,
    ...persistence,
    ...execution,
    doSave,
    clearEditor,
  };
}
