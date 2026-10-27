import React from 'react';
import { parseBody } from './legalContent';

// **bold** inside a line
const Inline = ({ text }) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );

/** Renders a plain-text section body (paragraphs, bullets, bold) as React elements. */
const LegalBody = ({ body, accent }) => (
  <div className="space-y-3 text-sm leading-relaxed text-gray-600">
    {parseBody(body).map((block, i) =>
      block.type === 'ul' ? (
        <ul key={i} className="space-y-2">
          {block.items.map((item, j) => (
            <li key={j} className="flex gap-3">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} aria-hidden />
              <span><Inline text={item} /></span>
            </li>
          ))}
        </ul>
      ) : (
        <p key={i}><Inline text={block.text} /></p>
      )
    )}
  </div>
);

export default LegalBody;
