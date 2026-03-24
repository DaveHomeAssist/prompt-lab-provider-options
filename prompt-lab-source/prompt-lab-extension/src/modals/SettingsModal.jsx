import Ic from '../icons';

export default function SettingsModal({ m, showNotes, setShowNotes, density, setDensity, collections, deleteCollection, exportLib, importLib, clearLibrary, openOptions, onClose }) {
  return (
    <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-40 p-4`}>
      <div className={`pl-modal-panel ${m.modal} border rounded-xl p-5 w-full max-w-sm flex flex-col gap-4`} role="dialog" aria-modal="true" aria-labelledby="modal-settings">
        <div className="flex justify-between items-center">
          <h2 id="modal-settings" className={`font-bold text-base ${m.text}`}>Settings</h2>
          <button type="button" onClick={onClose} className={`${m.textSub} hover:text-white`}><Ic n="X" size={15} /></button>
        </div>
        <label className={`flex items-center justify-between text-sm ${m.textBody} cursor-pointer`}>
          <span>Show enhancement notes</span>
          <input type="checkbox" checked={showNotes} onChange={e => setShowNotes(e.target.checked)} className="accent-violet-500" />
        </label>
        <div>
          <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider mb-2`}>Density</p>
          <div className="flex gap-1">
            {[['compact', 'Compact'], ['comfortable', 'Comfortable'], ['spacious', 'Spacious']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setDensity(id)}
                className={`flex-1 text-xs px-2 py-1.5 rounded-lg transition-colors font-medium ${density === id ? 'bg-violet-600 text-white' : `${m.btn} ${m.textAlt}`}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {collections.length > 0 && (
          <div>
            <p className={`text-xs font-semibold ${m.textSub} uppercase tracking-wider mb-2`}>Collections</p>
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {collections.map(c => (
                <div key={c} className="flex items-center justify-between">
                  <span className={`text-xs ${m.textAlt} flex items-center gap-1`}><Ic n="FolderOpen" size={9} />{c}</span>
                  <button type="button" onClick={() => deleteCollection(c)} className={`text-xs ${m.textMuted} hover:text-red-400 transition-colors`}><Ic n="Trash2" size={11} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={openOptions} className={`flex items-center gap-2 text-sm ${m.btn} rounded-lg px-3 py-2 text-violet-400 font-semibold transition-colors`}>
          🔑 Manage API Key (Options)
        </button>
        <div className={`border-t ${m.border} pt-3 flex flex-col gap-2`}>
          <button onClick={exportLib} className={`flex items-center gap-2 text-sm ${m.btn} rounded-lg px-3 py-2 ${m.textBody} transition-colors`}><Ic n="Download" size={12} />Export Library</button>
          <label className={`flex items-center gap-2 text-sm ${m.btn} rounded-lg px-3 py-2 ${m.textBody} cursor-pointer transition-colors`}><Ic n="Upload" size={12} />Import Library<input type="file" accept=".json" onChange={importLib} className="hidden" /></label>
          <button type="button" onClick={() => { if (window.confirm('Clear all prompts from the library?')) clearLibrary(); }} className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg px-3 py-2 transition-colors"><Ic n="Trash2" size={12} />Clear All Prompts</button>
        </div>
      </div>
    </div>
  );
}
