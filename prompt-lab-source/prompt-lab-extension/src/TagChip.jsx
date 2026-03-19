import Ic from './icons';
import { useThemeTokens } from './theme/ThemeProvider.jsx';

export default function TagChip({ tag, onRemove, onClick, selected }) {
  const { getTagChipClass } = useThemeTokens();
  return (
    <span
      onClick={onClick}
      {...(onClick ? { role: 'button', tabIndex: 0, onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } } } : {})}
      className={getTagChipClass({ tag, selected: Boolean(selected), clickable: Boolean(onClick) })}
    >
      {tag}
      {onRemove && <Ic n="X" size={10} className="cursor-pointer" onClick={e => { e.stopPropagation(); onRemove(tag); }} />}
    </span>
  );
}
