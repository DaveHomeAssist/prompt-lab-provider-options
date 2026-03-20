import { useEffect, useMemo, useState } from 'react';
import { renderMarkdown } from './lib/markdownLite.js';

function buildHtml(text, enableCodeCopy, copiedBlockId) {
  const baseHtml = renderMarkdown(text);
  const copyMap = new Map();

  if (!enableCodeCopy || typeof document === 'undefined') {
    return { html: baseHtml, copyMap };
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = baseHtml;

  Array.from(wrapper.querySelectorAll('pre')).forEach((pre, index) => {
    const code = pre.querySelector('code');
    if (!code) return;

    const blockId = `md-code-${index}`;
    const shell = document.createElement('div');
    shell.className = 'md-preview-code-shell';

    const toolbar = document.createElement('div');
    toolbar.className = 'md-preview-code-toolbar';

    const languageLabel = document.createElement('span');
    languageLabel.className = 'md-preview-code-label';
    const languageClass = Array.from(code.classList).find((name) => name.startsWith('language-'));
    languageLabel.textContent = languageClass ? languageClass.replace('language-', '') : 'Code';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'md-preview-code-copy';
    button.setAttribute('data-md-copy', blockId);
    button.setAttribute('aria-label', 'Copy code block');
    button.textContent = copiedBlockId === blockId ? 'Copied' : 'Copy';

    toolbar.append(languageLabel, button);
    shell.append(toolbar);
    pre.parentNode.insertBefore(shell, pre);
    shell.append(pre);

    copyMap.set(blockId, code.textContent || '');
  });

  return { html: wrapper.innerHTML, copyMap };
}

export default function MarkdownPreview({ text, className = '', enableCodeCopy = false, copy }) {
  const [copiedBlockId, setCopiedBlockId] = useState(null);
  const { html, copyMap } = useMemo(
    () => buildHtml(text, enableCodeCopy, copiedBlockId),
    [text, enableCodeCopy, copiedBlockId]
  );

  useEffect(() => {
    if (!copiedBlockId) return undefined;

    const timeoutId = window.setTimeout(() => {
      setCopiedBlockId(null);
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [copiedBlockId]);

  const handleClick = async (event) => {
    const button = event.target.closest('[data-md-copy]');
    if (!button || typeof copy !== 'function') return;

    const blockId = button.getAttribute('data-md-copy');
    const codeText = copyMap.get(blockId);
    if (!codeText) return;

    await copy(codeText, 'Code copied');
    setCopiedBlockId(blockId);
  };

  return (
    <div
      className={`md-preview ${className}`}
      onClick={enableCodeCopy ? handleClick : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
