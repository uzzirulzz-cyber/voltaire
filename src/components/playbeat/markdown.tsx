"use client";

import ReactMarkdown from "react-markdown";

/** Lightweight markdown renderer styled for the vivid PlayBeat theme. */

export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[13.5px] leading-relaxed text-dim">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-acc3">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-ink/90">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-1 list-none space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 marker:text-acc3/70 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="pl-1" {...props}>
              {children}
            </li>
          ),
          h1: ({ children }) => (
            <h3 className="mb-1 mt-3 font-display text-sm font-bold text-ink first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-1 mt-3 font-display text-sm font-bold text-ink first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1 mt-3 font-display text-[13px] font-bold text-ink first:mt-0">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-2 font-display text-[13px] font-bold text-ink first:mt-0">
              {children}
            </h4>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-acc1 underline decoration-acc1/40 underline-offset-2 hover:decoration-acc1"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-acc2/50 bg-acc2/5 py-1 pl-3 text-dim italic last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-white/12" />,
          pre: ({ children }) => (
            <pre className="pb-scroll mb-2 max-w-full overflow-x-auto rounded-xl border border-white/10 bg-[#0b1322] p-3 text-xs leading-relaxed last:mb-0">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return <code className="text-acc3/90">{children}</code>;
            }
            return (
              <code className="rounded border border-white/15 bg-void/80 px-1.5 py-0.5 font-mono text-[11.5px] text-acc2/90">
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
