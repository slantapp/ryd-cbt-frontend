import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export type SubjectOption = { id: string; name: string };

type SearchableSubjectSelectProps = {
  subjects: SubjectOption[];
  value: string;
  onChange: (value: string, subject?: SubjectOption) => void;
  /** Use subject id (question bank) or subject name (practice). */
  valueMode?: 'id' | 'name';
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  allowCreate?: boolean;
  onCreateSubject?: (name: string) => Promise<SubjectOption | void>;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
};

export default function SearchableSubjectSelect({
  subjects,
  value,
  onChange,
  valueMode = 'id',
  placeholder = 'Search subjects…',
  allowEmpty = false,
  emptyLabel = 'All subjects',
  allowCreate = false,
  onCreateSubject,
  className = '',
  required = false,
  disabled = false,
  id,
}: SearchableSubjectSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const selectedSubject = useMemo(() => {
    if (!value) return null;
    if (valueMode === 'id') {
      return subjects.find((s) => s.id === value) ?? null;
    }
    return subjects.find((s) => s.name === value) ?? null;
  }, [subjects, value, valueMode]);

  const displayLabel = selectedSubject?.name ?? (valueMode === 'name' && value ? value : '');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjects, query]);

  const showCreate =
    allowCreate &&
    onCreateSubject &&
    query.trim().length > 0 &&
    !subjects.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSubject = (subject: SubjectOption | null) => {
    if (!subject) {
      onChange('', undefined);
    } else {
      onChange(valueMode === 'id' ? subject.id : subject.name, subject);
    }
    setOpen(false);
    setQuery('');
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name || !onCreateSubject) return;
    setCreating(true);
    try {
      const created = await onCreateSubject(name);
      if (created) {
        selectSubject(created);
        toast.success(`Subject "${created.name}" added`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add subject');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          if (!open) setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className={`input-field rounded-xl w-full text-left flex items-center justify-between gap-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={displayLabel || allowEmpty ? 'text-gray-900' : 'text-gray-400'}>
          {displayLabel || (allowEmpty ? emptyLabel : placeholder)}
        </span>
        <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {required && !value && (
        <input
          tabIndex={-1}
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          value=""
          required
          onChange={() => {}}
        />
      )}

      {open && (
        <div className="absolute z-[100] mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                }
              }}
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {allowEmpty && (
              <li>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-600"
                  onClick={() => selectSubject(null)}
                >
                  {emptyLabel}
                </button>
              </li>
            )}
            {filtered.length === 0 && !showCreate && (
              <li className="px-3 py-3 text-sm text-gray-500">No subjects found</li>
            )}
            {filtered.map((subject) => {
              const isSelected =
                valueMode === 'id' ? value === subject.id : value === subject.name;
              return (
                <li key={subject.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      isSelected ? 'bg-[var(--theme-primary-50,#f5eef3)] font-medium' : ''
                    }`}
                    onClick={() => selectSubject(subject)}
                  >
                    {subject.name}
                  </button>
                </li>
              );
            })}
            {showCreate && (
              <li className="border-t border-gray-100">
                <button
                  type="button"
                  disabled={creating}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--theme-primary,#A8518A)] hover:bg-gray-50 font-medium disabled:opacity-50"
                  onClick={handleCreate}
                >
                  {creating ? 'Adding…' : `+ Add "${query.trim()}"`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
