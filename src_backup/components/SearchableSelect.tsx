import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  className = "",
  allowCustom = false
}: {
  value: string,
  options: { label: string, value: string }[],
  onChange: (val: string) => void,
  placeholder?: string,
  className?: string,
  allowCustom?: boolean
}) {
  const selectedLabel = options.find(o => o.value === value)?.label || value;
  const [inputValue, setInputValue] = React.useState(selectedLabel);
  const debouncedInputValue = useDebounce(inputValue, 300);
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedLabel);
    }
  }, [value, selectedLabel, isOpen]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setInputValue(selectedLabel);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedLabel]);

  const isTyping = isOpen && inputValue !== selectedLabel;
  const filteredOptions = isTyping
    ? options.filter(o => o.label.toLowerCase().includes(debouncedInputValue.toLowerCase()) || o.value.toLowerCase().includes(debouncedInputValue.toLowerCase()))
    : options;

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <input
        type="text"
        className="w-full pr-8 pl-3 py-2 border border-border rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setIsOpen(true);
        }}
        onBlur={() => {
          if (allowCustom) {
            onChange(inputValue);
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) {
            setInputValue(selectedLabel);
          }
        }}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-primary cursor-pointer"
      >
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <ul className="absolute z-[200] w-full mt-1 bg-white border border-border rounded-md shadow-xl max-h-60 overflow-y-auto text-sm">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0 ${opt.value === value ? 'bg-primary/5 font-bold text-primary' : 'text-slate-700 font-medium'}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setInputValue(opt.label);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-slate-400 italic">
              {allowCustom ? 'Tekan enter/klik luar untuk simpan' : 'Tidak ada hasil...'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
