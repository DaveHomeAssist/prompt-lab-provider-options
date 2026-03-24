import Ic from '../icons';

export default function CommandPaletteModal({ m, cmdQuery, setCmdQuery, filteredCmds, onClose }) {
  return (
    <div className={`fixed inset-0 ${m.modalBg} flex items-start justify-center z-50 pt-20 p-4`} onClick={onClose}>
      <div className={`pl-modal-panel ${m.modal} border rounded-xl w-full max-w-md overflow-hidden shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className={`flex items-center gap-2 px-4 py-3 border-b ${m.border}`}>
          <Ic n="Search" size={13} className={m.textSub} />
          <input autoFocus className={`flex-1 bg-transparent text-sm ${m.text} focus:outline-none placeholder-gray-500`}
            placeholder="Search commands…" value={cmdQuery} onChange={e => setCmdQuery(e.target.value)} />
          <span className={`text-xs ${m.textSub} font-mono`}>ESC</span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {filteredCmds.map((a, i) => (
            <button key={i} onClick={a.action}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm ${m.textBody} hover:bg-violet-600 hover:text-white transition-colors text-left`}>
              <span>{a.label}</span>
              {a.hint && <kbd className={`text-xs font-mono px-1.5 py-0.5 ${m.pill} rounded`}>{a.hint}</kbd>}
            </button>
          ))}
          {filteredCmds.length === 0 && <div className={`ui-empty-state text-xs ${m.textMuted}`}>No commands found</div>}
        </div>
      </div>
    </div>
  );
}
