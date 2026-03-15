import { useEffect, useRef, useState } from 'react';
import { decodeShare, extractVars, isGhostVar, resolveGhostVars, suggestTitleFromText } from '../promptUtils';
import { normalizeEntry } from '../lib/promptSchema.js';
import { normalizeError } from '../lib/errorTaxonomy.js';
import { useSessionRestore, useSessionSave } from './useSessionState.js';
import { ensureString } from '../lib/utils.js';

/**
 * Save/share/load controller around the library + session storage boundaries.
 */
export default function usePersistenceFlow({ ui, lib, editor }) {
  const { notify, setTab, tab } = ui;
  const {
    raw, enhanced, variants, notes, enhMode,
    setRaw, setEnhanced, setVariants, setNotes, setEnhMode,
    setComposerBlocks,
  } = editor;

  const [showSave, setShowSave] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveTags, setSaveTags] = useState([]);
  const [saveCollection, setSaveCollection] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [showNewColl, setShowNewColl] = useState(false);
  const [newCollName, setNewCollName] = useState('');
  const [varVals, setVarVals] = useState({});
  const [showVarForm, setShowVarForm] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const templateLoadReqRef = useRef(0);

  useSessionRestore({ setRaw, setEnhanced, setVariants, setNotes, setTab, setEnhMode });
  useSessionSave({ raw, enhanced, variants, notes, tab, enhMode });

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return;

    const decoded = decodeShare(hash.slice(7));
    const normalized = normalizeEntry({ ...decoded, id: crypto.randomUUID() });
    if (!normalized) {
      notify('Shared prompt is invalid.');
      return;
    }

    setRaw(normalized.original);
    setEnhanced(normalized.enhanced);
    setVariants(normalized.variants || []);
    setNotes(normalized.notes || '');
    setSaveTags(normalized.tags || []);
    setSaveTitle(normalized.title || '');
    setShowSave(true);
    notify('Shared prompt loaded!');
  }, []);

  const copy = async (text, msg = 'Copied!') => {
    const value = ensureString(text);
    if (!value) {
      notify('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      notify(msg);
    } catch (error) {
      try {
        const el = document.createElement('textarea');
        el.value = value;
        el.style.cssText = 'position:fixed;top:-9999px;opacity:0';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        notify(msg);
      } catch (fallbackError) {
        notify(normalizeError(fallbackError, 'clipboard').userMessage || 'Copy unavailable');
      }
    }
  };

  const openSavePanel = (entry = null) => {
    const source = entry?.enhanced || enhanced || raw;
    setSaveTitle(entry?.title || suggestTitleFromText(source));
    if (entry) {
      setEditingId(entry.id);
      setSaveTags(entry.tags || []);
      setSaveCollection(entry.collection || '');
    } else {
      setEditingId(null);
      if (!enhanced.trim()) setSaveTags([]);
    }
    setShowSave(true);
  };

  const applyEntry = (entry) => {
    const normalized = normalizeEntry(entry);
    if (!normalized) return;
    setEditingId(normalized.id);
    setRaw(normalized.original);
    setEnhanced(normalized.enhanced);
    setVariants(normalized.variants || []);
    setNotes(normalized.notes || '');
    setSaveTags(normalized.tags || []);
    setSaveTitle(normalized.title);
    setSaveCollection(normalized.collection || '');
    setShowSave(false);
    setShowDiff(false);
    lib.bumpUse(normalized.id);
    setTab('editor');
    notify('Loaded into editor!');
  };

  const applyTemplateWithVals = (entry, values) => {
    let text = ensureString(entry?.enhanced);
    Object.entries(values || {}).forEach(([key, value]) => {
      text = text.replaceAll(`{{${key}}}`, ensureString(value));
    });
    applyEntry({ ...entry, enhanced: text });
  };

  const loadEntry = async (entry) => {
    const vars = extractVars(entry?.enhanced);
    if (vars.length === 0) {
      applyEntry(entry);
      return;
    }

    const reqId = templateLoadReqRef.current + 1;
    templateLoadReqRef.current = reqId;
    const ghostVars = vars.filter(isGhostVar);
    const manualVars = vars.filter((name) => !isGhostVar(name));
    const ghostVals = await resolveGhostVars(ghostVars);
    if (reqId !== templateLoadReqRef.current) return;

    if (manualVars.length === 0) {
      setShowVarForm(false);
      setPendingTemplate(null);
      setVarVals({});
      applyTemplateWithVals(entry, ghostVals);
      return;
    }

    setPendingTemplate(entry);
    setVarVals({
      ...Object.fromEntries(manualVars.map((name) => [name, ''])),
      ...ghostVals,
    });
    setShowVarForm(true);
  };

  const applyTemplate = () => {
    if (!pendingTemplate) return;
    applyTemplateWithVals(pendingTemplate, varVals);
    setShowVarForm(false);
    setPendingTemplate(null);
  };

  const doSave = (onSaved) => {
    const saved = lib.doSave({
      raw,
      enhanced,
      variants,
      notes,
      tags: saveTags,
      title: saveTitle,
      collection: saveCollection,
      editingId,
      changeNote,
    });
    if (saved?.id) {
      setEditingId(saved.id);
      setSaveTitle(saved.title || saveTitle);
      if (typeof onSaved === 'function') onSaved(saved.id);
    }
    setChangeNote('');
    setShowSave(false);
    return saved;
  };

  const addToComposer = (entry) => {
    setComposerBlocks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: entry.title, content: entry.enhanced, sourceId: entry.id },
    ]);
    lib.bumpUse(entry.id);
    notify('Added to Composer!');
  };

  const clearPersistenceState = () => {
    templateLoadReqRef.current += 1;
    setShowSave(false);
    setEditingId(null);
    setSaveTitle('');
    setSaveTags([]);
    setSaveCollection('');
    setChangeNote('');
    setShowDiff(false);
    setShowNewColl(false);
    setNewCollName('');
    setVarVals({});
    setShowVarForm(false);
    setPendingTemplate(null);
  };

  return {
    showSave, setShowSave,
    editingId, setEditingId,
    saveTitle, setSaveTitle,
    saveTags, setSaveTags,
    saveCollection, setSaveCollection,
    changeNote, setChangeNote,
    showDiff, setShowDiff,
    showNewColl, setShowNewColl,
    newCollName, setNewCollName,
    varVals, setVarVals,
    showVarForm, setShowVarForm,
    pendingTemplate,
    copy,
    openSavePanel,
    doSave,
    applyEntry,
    loadEntry,
    applyTemplate,
    addToComposer,
    clearPersistenceState,
  };
}
