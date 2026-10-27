import React from 'react';
import { FiPlus, FiTrash2, FiChevronUp, FiChevronDown, FiEye, FiEyeOff } from 'react-icons/fi';
import { Button } from '../../components/adminUi';
import { inputClass } from '../../components/adminFormat';

const emptySection = () => ({ title: '', body: '', isVisible: true });

/**
 * Edits the sections of a page: a heading and plain text each. In the text, a blank line starts a
 * new paragraph, a line beginning with "- " is a bullet, and **word** is bold. A hidden section is
 * kept here but not shown in the apps.
 */
const SectionsEditor = ({ value = [], onChange }) => {
  const sections = Array.isArray(value) ? value : [];

  const update = (index, patch) => onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const remove = (index) => onChange(sections.filter((_, i) => i !== index));
  const move = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-500">
          No sections yet. Add one to start writing this page.
        </p>
      )}

      {sections.map((section, index) => (
        <div
          key={section._id || index}
          className={`rounded-lg border p-3 ${section.isVisible === false ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200'}`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
              {index + 1}
            </span>
            <input
              value={section.title}
              onChange={(e) => update(index, { title: e.target.value })}
              placeholder="Section heading, e.g. Payments"
              maxLength={150}
              className={`${inputClass} font-semibold`}
            />
            <Button
              variant="ghost"
              className="shrink-0 px-2"
              onClick={() => update(index, { isVisible: section.isVisible === false })}
              aria-label={section.isVisible === false ? 'Show section' : 'Hide section'}
              title={section.isVisible === false ? 'Hidden in the apps. Click to show' : 'Shown in the apps. Click to hide'}
            >
              {section.isVisible === false ? <FiEyeOff /> : <FiEye />}
            </Button>
            <Button variant="ghost" className="shrink-0 px-2" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
              <FiChevronUp />
            </Button>
            <Button variant="ghost" className="shrink-0 px-2" onClick={() => move(index, 1)} disabled={index === sections.length - 1} aria-label="Move down">
              <FiChevronDown />
            </Button>
            <Button variant="ghost" className="shrink-0 px-2 text-red-600" onClick={() => remove(index)} aria-label="Delete section">
              <FiTrash2 />
            </Button>
          </div>
          <textarea
            value={section.body}
            onChange={(e) => update(index, { body: e.target.value })}
            rows={5}
            maxLength={20000}
            placeholder={'Write the text here.\n\n- Start a line with a dash for a bullet\n- Use **double stars** for bold'}
            className={`${inputClass} text-sm leading-relaxed`}
          />
        </div>
      ))}

      <Button variant="secondary" onClick={() => onChange([...sections, emptySection()])} disabled={sections.length >= 60}>
        <FiPlus /> Add section
      </Button>
    </div>
  );
};

export default SectionsEditor;
