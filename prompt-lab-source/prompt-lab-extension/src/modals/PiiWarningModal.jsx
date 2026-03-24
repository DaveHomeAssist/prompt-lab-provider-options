import Ic from '../icons';

export default function PiiWarningModal({ m, piiWarning, piiRedactAndSend, piiSendAnyway, piiCancel }) {
  if (!piiWarning) return null;
  return (
    <div className={`fixed inset-0 ${m.modalBg} flex items-center justify-center z-50 p-4`}>
      <div className={`pl-modal-panel ${m.modal} border rounded-xl p-5 w-full max-w-md flex flex-col gap-4`} role="dialog" aria-modal="true" aria-labelledby="modal-pii">
        <div className="flex justify-between items-center">
          <h2 id="modal-pii" className={`font-bold text-sm ${m.text}`}>Sensitive Data Detected</h2>
          <button type="button" onClick={piiCancel} className={`${m.textSub} hover:text-white`}><Ic n="X" size={15} /></button>
        </div>
        <p className={`text-xs ${m.textAlt}`}>The following potentially sensitive items were found in your prompt:</p>
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
          {piiWarning.matches.map(match => (
            <div key={match.id} className={`text-xs ${m.textBody} flex items-center gap-2`}>
              <span className="text-yellow-400 font-semibold uppercase text-[10px]">{match.type}</span>
              <span className="font-mono truncate">{match.snippet.length > 32
                ? `${match.snippet.slice(0, 8)}...${match.snippet.slice(-6)}`
                : match.snippet}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={piiRedactAndSend}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-2 text-xs font-semibold transition-colors">
            Redact & Send
          </button>
          <button onClick={piiSendAnyway}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg py-2 text-xs font-semibold transition-colors">
            Send Anyway
          </button>
          <button onClick={piiCancel}
            className={`px-3 ${m.btn} ${m.textBody} rounded-lg py-2 text-xs font-semibold transition-colors`}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
