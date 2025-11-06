import { useEffect, useMemo, useRef, useState } from 'react';

export type ComboOption<TMeta = unknown> = {
  value: string;
  label: string;
  searchValues?: string[];
  data?: TMeta;
};

type ComboInputProps<TMeta = unknown> = {
  value: string;
  onChange: (value: string) => void;
  options?: ComboOption<TMeta>[];
  inputClassName?: string;
  placeholder?: string;
  historyKey?: string;
  historyLimit?: number;
  debounceMs?: number;
  onSearch?: (query: string) => Promise<ComboOption<TMeta>[]>;
  onSelectOption?: (option: ComboOption<TMeta>) => void;
  disabled?: boolean;
  // Control whether to show local "Recent" history in the dropdown
  showHistory?: boolean;
};

const HISTORY_PREFIX = 'combo-history:';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter(Boolean);
}

function loadHistory(key?: string): string[] {
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${HISTORY_PREFIX}${key}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string');
    }
  } catch {
    // ignore malformed storage
  }
  return [];
}

function saveHistory(key: string, values: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${HISTORY_PREFIX}${key}`, JSON.stringify(values));
  } catch {
    // ignore storage failures
  }
}

type NormalizedOption<TMeta = unknown> = {
  kind: 'option' | 'history';
  value: string;
  label: string;
  searchTokens: string[];
  original?: ComboOption<TMeta>;
};

// Combo input with async suggestions + local history.
export default function ComboInput<TMeta = unknown>({
  value,
  onChange,
  options = [],
  inputClassName,
  placeholder,
  historyKey,
  historyLimit = 10,
  debounceMs = 200,
  onSearch,
  onSelectOption,
  disabled,
  showHistory = true,
}: ComboInputProps<TMeta>) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [inputValue, setInputValue] = useState(value || '');
  const [historyItems, setHistoryItems] = useState<string[]>(() => loadHistory(historyKey));
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeqRef = useRef(0);
  const [asyncOptions, setAsyncOptions] = useState<ComboOption<TMeta>[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    if (historyKey) {
      saveHistory(historyKey, historyItems);
    }
  }, [historyKey, historyItems]);

  useEffect(() => {
    if (!onSearch) {
      setAsyncOptions([]);
      setLoading(false);
      return;
    }
    const timeout = window.setTimeout(() => {
      const seq = ++searchSeqRef.current;
      setLoading(true);
      Promise.resolve(onSearch(inputValue))
        .then(results => {
          if (searchSeqRef.current !== seq) return;
          setAsyncOptions(results ?? []);
        })
        .catch(() => {
          if (searchSeqRef.current !== seq) return;
          setAsyncOptions([]);
        })
        .finally(() => {
          if (searchSeqRef.current !== seq) return;
          setLoading(false);
        });
    }, debounceMs);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [inputValue, onSearch, debounceMs]);

  const dedupedOptions = useMemo(() => {
    const map = new Map<string, ComboOption<TMeta>>();
    [...options, ...asyncOptions].forEach(option => {
      if (!option || !option.value) return;
      if (!map.has(option.value)) {
        map.set(option.value, option);
      }
    });
    return Array.from(map.values());
  }, [options, asyncOptions]);

  const normalizedOptions = useMemo<NormalizedOption<TMeta>[]>(() => {
    return dedupedOptions.map(option => {
      const combined = [option.value, option.label, ...(option.searchValues ?? [])].join(' ');
      return {
        kind: 'option' as const,
        value: option.value,
        label: option.label,
        searchTokens: tokenize(combined),
        original: option
      };
    });
  }, [dedupedOptions]);

  const normalizedHistory = useMemo<NormalizedOption<TMeta>[]>(() => {
    const optionMap = new Map(normalizedOptions.map(option => [option.value, option.original]));
    const seen = new Set(normalizedOptions.map(option => option.value));
    return historyItems
      .filter(Boolean)
      .filter(item => !seen.has(item))
      .map<NormalizedOption<TMeta>>(item => ({
        kind: 'history' as const,
        value: item,
        label: optionMap.get(item)?.label ?? item,
        searchTokens: tokenize(item),
        original: optionMap.get(item)
      }));
  }, [historyItems, normalizedOptions]);

  const { sections, flattened } = useMemo(() => {
    const terms = tokenize(inputValue);
    const matches = (arr: NormalizedOption<TMeta>[]) =>
      terms.length === 0
        ? arr
        : arr.filter(option => terms.every(term => option.searchTokens.some(token => token.includes(term))));

    let historyMatches = showHistory ? matches(normalizedHistory) : [];
    let optionMatches = matches(normalizedOptions);

    if (historyMatches.length === 0 && optionMatches.length === 0 && !loading) {
      historyMatches = normalizedHistory.slice(0, 10);
      optionMatches = normalizedOptions.slice(0, 20);
    } else {
      historyMatches = historyMatches.slice(0, 10);
      optionMatches = optionMatches.slice(0, 50);
    }

    const sections: Array<{ title?: string; items: NormalizedOption<TMeta>[] }> = [];
    if (showHistory && historyMatches.length > 0) {
      sections.push({ title: 'Recent', items: historyMatches });
    }
    if (optionMatches.length > 0) {
      sections.push({ title: 'Suggestions', items: optionMatches });
    }

    return {
      sections,
      flattened: sections.flatMap(section => section.items)
    };
  }, [inputValue, normalizedHistory, normalizedOptions, loading]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keep dropdown positioned relative to viewport to avoid clipping by overflow
  useEffect(() => {
    function update() {
      if (!open) return;
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDropdownPos({ left: rect.left, top: rect.bottom - 80, width: rect.width });
    }
    update();
    if (!open) return;
    const onScroll = () => update();
    const onResize = () => update();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setHighlighted(0);
  }, [open, flattened.length]);

  const commitValue = (next: string, option?: ComboOption<TMeta>) => {
    setInputValue(next);
    onChange(next);
    if (!historyKey) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    setHistoryItems(prev => {
      const deduped = prev.filter(item => item !== trimmed);
      deduped.unshift(trimmed);
      return deduped.slice(0, historyLimit);
    });
    if (option) {
      onSelectOption?.(option);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        className={inputClassName || 'input px-2 py-1'}
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        ref={inputRef}
        onFocus={() => {
          setOpen(true);
          if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPos({ left: rect.left, top: rect.bottom + 2, width: rect.width });
          }
        }}
        onChange={event => {
          const next = event.target.value;
          setInputValue(next);
          onChange(next);
          setOpen(true);
          if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setDropdownPos({ left: rect.left, top: rect.bottom + 2, width: rect.width });
          }
        }}
        onKeyDown={event => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            setOpen(true);
            return;
          }
          if (!open) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlighted(index => Math.min(index + 1, Math.max(flattened.length - 1, 0)));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlighted(index => Math.max(index - 1, 0));
          } else if (event.key === 'Enter') {
            const item = flattened[highlighted];
            if (item) {
              commitValue(item.value, item.original as ComboOption<TMeta> | undefined);
              setOpen(false);
            }
          } else if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
      />
      {open && dropdownPos && (
        <div
          className="fixed z-[9999] max-h-64 overflow-auto rounded-md border border-neutral-200 bg-white text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          style={{ left: dropdownPos.left, top: dropdownPos.top, width: dropdownPos.width }}
        >
          {loading && (
            <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">Searching…</div>
          )}
          {!loading && sections.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">No matches</div>
          ) : (
            sections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                {section.title && (
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                    {section.title}
                  </div>
                )}
                {section.items.map((option, index) => {
                  const flatIndex =
                    sections.slice(0, sectionIdx).reduce((count, s) => count + s.items.length, 0) + index;
                  const active = flatIndex === highlighted;
                  return (
                    <button
                      key={`${option.kind}-${option.value}-${flatIndex}`}
                      type="button"
                      className={`${active ? 'bg-neutral-100 dark:bg-neutral-800' : ''} flex w-full flex-col items-start px-3 py-2 text-left text-neutral-900 dark:text-neutral-100`}
                      onMouseEnter={() => setHighlighted(flatIndex)}
                      onMouseDown={event => {
                        event.preventDefault();
                        commitValue(option.value, option.original as ComboOption<TMeta> | undefined);
                        setOpen(false);
                      }}
                    >
                      <span className="font-medium">{option.value}</span>
                      {option.label !== option.value && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{option.label}</span>
                      )}
                      {option.kind === 'history' && (
                        <span className="text-[10px] uppercase text-neutral-400 dark:text-neutral-500">Recent</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
