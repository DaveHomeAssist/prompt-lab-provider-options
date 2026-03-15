import Ic from './icons';
import { MODES } from './constants';

export default function EditorActions({
  m,
  compact,
  enhMode,
  onEnhanceModeChange,
  onEnhance,
  onRunCases,
  onSave,
  onClear,
  loading,
  hasInput,
  runningCases,
  testCaseCount,
  hasSavablePrompt,
  enhanceShortcutLabel = 'Ctrl+Enter',
}) {
  return (
    <div className={`flex gap-2 ${compact ? 'flex-col' : ''}`}>
      <div className={`flex gap-2 ${compact ? 'w-full' : 'flex-1'}`}>
        <select
          value={enhMode}
          onChange={(e) => onEnhanceModeChange(e.target.value)}
          className={`${m.input} border rounded-lg px-2 py-1.5 text-xs ${m.text} focus:outline-none shrink-0 ${compact ? 'w-32' : 'max-w-36'}`}
        >
          {MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.label}
            </option>
          ))}
        </select>
        <button
          onClick={onEnhance}
          disabled={loading || !hasInput}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
        >
          {loading
            ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enhancing...
                </>
              )
            : (
                <>
                  <Ic n="Wand2" size={13} />
                  Enhance {enhanceShortcutLabel}
                </>
              )}
        </button>
        <button
          onClick={onRunCases}
          disabled={loading || runningCases || testCaseCount === 0}
          className="flex items-center justify-center gap-1 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg py-2 text-xs font-semibold transition-colors"
        >
          {runningCases
            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <Ic n="FlaskConical" size={12} />}
          Run Cases
        </button>
      </div>
      <div className={`flex gap-2 ${compact ? 'w-full' : ''}`}>
        <button
          onClick={onSave}
          disabled={!hasSavablePrompt}
          className="flex-1 px-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors py-2"
        >
          Save
        </button>
        <button
          onClick={onClear}
          disabled={loading}
          className="flex-1 px-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors py-2"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
