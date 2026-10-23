"use client";

import ReactMarkdown from "react-markdown";

/** Lightweight markdown renderer styled for the PlayBeat dark/gold theme. */

export function Markdown({ content }: { content: string }) {
  return (
    <div className="text-[13.5px] leading-relaxed text-silver">
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gold-lt">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-silver-lt/90">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 ml-1 list-none space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 marker:text-gold/70 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="pl-1" {...props}>
              {children}
            </li>
          ),
          h1: ({ children }) => (
            <h3 className="mb-1 mt-3 font-display text-sm font-bold text-silver-lt first:mt-0">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-1 mt-3 font-display text-sm font-bold text-silver-lt first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1 mt-3 font-display text-[13px] font-bold text-silver-lt first:mt-0">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-2 font-display text-[13px] font-bold text-silver-lt first:mt-0">
              {children}
            </h4>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-gold underline decoration-gold/40 underline-offset-2 hover:decoration-gold"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-gold/50 bg-gold/5 py-1 pl-3 text-silver/85 italic last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-silver/15" />,
          pre: ({ children }) => (
            <pre className="pb-scroll mb-2 max-w-full overflow-x-auto rounded-lg border border-silver/12 bg-[#070b16] p-3 text-xs leading-relaxed last:mb-0">
              {children}
            </pre>
          ),
          code: ({ children, className }) => {
            const isBlock = /language-/.test(className ?? "");
            if (isBlock) {
              return <code className="text-gold-lt/90">{children}</code>;
            }
            return (
              <code className="rounded border border-silver/15 bg-navy-deep/80 px-1.5 py-0.5 font-mono text-[11.5px] text-gold-lt/90">
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
