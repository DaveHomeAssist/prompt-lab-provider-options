import Ic from './icons';

const STEPS = [
  {
    title: 'Pick a provider',
    detail: 'Choose Anthropic, OpenAI, Gemini, OpenRouter, or local Ollama.',
  },
  {
    title: 'Add access',
    detail: 'Paste an API key or point Prompt Lab at your local Ollama instance.',
  },
  {
    title: 'Run Enhance',
    detail: 'Try the sample prompt, then save the result into your library.',
  },
];

export default function SetupCard({ m, isFirstEver = false, onOpenSettings, onDismiss }) {
  return (
    <section className={`${m.surface} border border-violet-500/30 rounded-lg p-3`} aria-label="Prompt Lab setup">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Ic n="Zap" size={15} className="text-violet-400 shrink-0" />
            <p className={`text-sm font-semibold ${m.text}`}>
              {isFirstEver ? 'Welcome to Prompt Lab' : 'Finish setting up'}
            </p>
          </div>
          <p className={`mt-1 text-xs ${m.textMuted}`}>
            {isFirstEver
              ? 'Connect one provider so the first enhance is only a few clicks away.'
              : 'Your provider setup still looks incomplete. Finish one connection to keep Create ready to use.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={`ui-control shrink-0 rounded-md p-1.5 ${m.btn} ${m.textAlt}`}
          aria-label="Dismiss setup card"
        >
          <Ic n="X" size={12} />
        </button>
      </div>

      <ol className="mt-3 flex flex-col gap-2">
        {STEPS.map((step, index) => (
          <li key={step.title} className={`flex items-start gap-2 rounded-lg border ${m.border} ${m.codeBlock} px-3 py-2`}>
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${m.text}`}>{step.title}</p>
              <p className={`text-[11px] ${m.textMuted}`}>{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenSettings}
          className="ui-control rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-500"
        >
          Open Provider Settings
        </button>
        <span className={`text-[11px] ${m.textMuted}`}>The card closes after your first successful enhance.</span>
      </div>
    </section>
  );
}
