export default function MainWorkspace({
  m,
  compact,
  isWeb,
  showEditorPane,
  showLibraryPane,
  editorPane,
  libraryPane,
}) {
  const rootClass = isWeb
    ? `grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} min-h-0`
    : `grid ${compact ? 'grid-cols-1' : 'grid-cols-2'} flex-1 min-h-0 overflow-hidden`;

  return (
    <div className={rootClass}>
      {showEditorPane && (
        <section
          className={`min-w-0 min-h-0 flex flex-col overflow-hidden ${
            showLibraryPane && !compact ? `border-r ${m.border}` : ''
          }`}
          aria-label="Prompt editor workspace"
        >
          {editorPane}
        </section>
      )}

      {showLibraryPane && (
        <aside className="min-w-0 min-h-0 flex flex-col overflow-hidden" aria-label="Prompt library sidebar">
          {libraryPane}
        </aside>
      )}
    </div>
  );
}

