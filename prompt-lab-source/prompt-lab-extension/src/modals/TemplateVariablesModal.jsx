import Ic from '../icons';
import { isGhostVar } from '../promptUtils';

export default function TemplateVariablesModal({ m, varVals, setVarVals, pendingTemplate, pendingTemplateInputMap, applyTemplate, skipTemplate, onClose }) {
  if (!pendingTemplate) return null;
  return (
    <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-40 p-4`}>
      <div className={`pl-modal-panel ${m.modal} border rounded-xl p-5 w-full max-w-md flex flex-col gap-4`} role="dialog" aria-modal="true" aria-labelledby="modal-vars">
        <div className="flex justify-between items-center">
          <h2 id="modal-vars" className={`font-bold text-sm ${m.text}`}>Fill Template Variables</h2>
          <button type="button" onClick={onClose} className={`${m.textSub} hover:text-white`}><Ic n="X" size={15} /></button>
        </div>
        <p className={`text-xs ${m.textAlt}`}>"{pendingTemplate.title}" contains template variables:</p>
        <div className="flex flex-col gap-2">
          {Object.keys(varVals).map(k => {
            const inputDef = pendingTemplateInputMap[k];
            const isSelect = inputDef?.type === 'select' && Array.isArray(inputDef.options) && inputDef.options.length > 0;
            return (
            <div key={k}>
              <label className="text-xs font-mono font-semibold text-violet-400 block mb-1">
                {inputDef?.label || `{{${k}}}`}
                {isGhostVar(k) && (
                  <span className="ml-2 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide text-emerald-300">
                    auto
                  </span>
                )}
              </label>
              {isSelect ? (
                <select
                  className={`w-full ${m.input} border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500 ${m.text}`}
                  value={varVals[k]}
                  onChange={e => setVarVals(p => ({ ...p, [k]: e.target.value }))}
                  aria-label={inputDef.label || k}
                >
                  <option value="">{inputDef.placeholder || `Select ${inputDef.label || k}…`}</option>
                  {inputDef.options.map((opt) => (
                    <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                      {typeof opt === 'string' ? opt : (opt.label || opt.value)}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={`w-full ${m.input} border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-500 ${m.text}`}
                  placeholder={inputDef?.placeholder || (isGhostVar(k) ? 'Auto-filled · editable' : `Value for ${k}…`)}
                  value={varVals[k]} onChange={e => setVarVals(p => ({ ...p, [k]: e.target.value }))} />
              )}
            </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={applyTemplate} className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-sm font-semibold transition-colors">Apply Template</button>
          <button onClick={skipTemplate} className={`px-4 ${m.btn} rounded-lg text-sm ${m.textBody} transition-colors`}>Skip</button>
        </div>
      </div>
    </div>
  );
}
