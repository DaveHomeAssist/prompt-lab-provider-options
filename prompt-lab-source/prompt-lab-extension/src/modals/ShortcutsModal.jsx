import Ic from '../icons';

export default function ShortcutsModal({ m, primaryModKey, onClose }) {
  return (
    <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-50 p-4`} onClick={onClose}>
      <div className={`pl-modal-panel ${m.modal} border rounded-xl p-5 w-full max-w-sm`} role="dialog" aria-modal="true" aria-labelledby="modal-shortcuts" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-shortcuts" className={`font-bold text-sm ${m.text}`}>Keyboard Shortcuts</h2>
          <button type="button" onClick={onClose} className={`${m.textSub} rounded-lg p-2 hover:bg-white/10 transition-colors`}><Ic n="X" size={14} /></button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider mb-2`}>Global</p>
            <div className="flex flex-col gap-2.5">
              {[[`${primaryModKey} ↵`, 'Enhance prompt'], [`${primaryModKey} S`, 'Save prompt'], [`${primaryModKey} K`, 'Command palette'], ['?', 'Show shortcuts'], ['Esc', 'Close modals']].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm ${m.textBody}`}>{label}</span>
                  <kbd className={`text-xs font-mono px-2 py-1 ${m.pill} rounded-md`}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider mb-2`}>Scratchpad (PadTab)</p>
            <div className="flex flex-col gap-2.5">
              {[
                [`${primaryModKey} E`, 'Export / download pad'],
                [`${primaryModKey} ⇧ D`, 'Insert date separator'],
                [`${primaryModKey} ⇧ C`, 'Copy all content'],
                [`${primaryModKey} ⇧ X`, 'Clear pad'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm ${m.textBody}`}>{label}</span>
                  <kbd className={`text-xs font-mono px-2 py-1 ${m.pill} rounded-md`}>{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
