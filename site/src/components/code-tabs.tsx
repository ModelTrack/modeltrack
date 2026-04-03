'use client';

import { useState } from 'react';

const PROXY_URL = 'https://proxy.modeltrack.ai/ws/YOUR_WORKSPACE';

interface Tab {
  label: string;
  filename: string;
  lines: Line[];
}

type Line = { text: string; color: string } | 'newline';

const c = {
  kw: 'text-blue-400',
  str: 'text-green-400',
  fn: 'text-yellow-300',
  comment: 'text-gray-600',
  text: 'text-gray-300',
};

const tabs: Tab[] = [
  {
    label: 'Python',
    filename: 'app.py',
    lines: [
      { text: 'import', color: c.kw },
      { text: ' anthropic', color: c.text },
      'newline',
      'newline',
      { text: '# Point your SDK at ModelTrack — everything else stays the same', color: c.comment },
      'newline',
      { text: 'client = anthropic.', color: c.text },
      { text: 'Anthropic', color: c.kw },
      { text: '(', color: c.text },
      'newline',
      { text: `    base_url=`, color: c.text },
      { text: `"${PROXY_URL}/v1"`, color: c.str },
      'newline',
      { text: ')', color: c.text },
      'newline',
      'newline',
      { text: 'response = client.', color: c.text },
      { text: 'messages', color: c.fn },
      { text: '.', color: c.text },
      { text: 'create', color: c.fn },
      { text: '(', color: c.text },
      'newline',
      { text: '    model=', color: c.text },
      { text: '"claude-sonnet-4-6"', color: c.str },
      { text: ',', color: c.text },
      'newline',
      { text: '    messages=[{', color: c.text },
      { text: '"role"', color: c.str },
      { text: ': ', color: c.text },
      { text: '"user"', color: c.str },
      { text: ', ', color: c.text },
      { text: '"content"', color: c.str },
      { text: ': ', color: c.text },
      { text: '"Hello"', color: c.str },
      { text: '}]', color: c.text },
      'newline',
      { text: ')', color: c.text },
      'newline',
      { text: '# ModelTrack tracks: tokens, cost, latency, team, feature', color: c.comment },
    ],
  },
  {
    label: 'Node.js',
    filename: 'app.ts',
    lines: [
      { text: 'import', color: c.kw },
      { text: ' Anthropic ', color: c.text },
      { text: 'from', color: c.kw },
      { text: ' ', color: c.text },
      { text: '"@anthropic-ai/sdk"', color: c.str },
      { text: ';', color: c.text },
      'newline',
      'newline',
      { text: '// Point your SDK at ModelTrack — everything else stays the same', color: c.comment },
      'newline',
      { text: 'const', color: c.kw },
      { text: ' client = ', color: c.text },
      { text: 'new', color: c.kw },
      { text: ' ', color: c.text },
      { text: 'Anthropic', color: c.fn },
      { text: '({', color: c.text },
      'newline',
      { text: '  baseURL: ', color: c.text },
      { text: `"${PROXY_URL}/v1"`, color: c.str },
      { text: ',', color: c.text },
      'newline',
      { text: '});', color: c.text },
      'newline',
      'newline',
      { text: 'const', color: c.kw },
      { text: ' response = ', color: c.text },
      { text: 'await', color: c.kw },
      { text: ' client.', color: c.text },
      { text: 'messages', color: c.fn },
      { text: '.', color: c.text },
      { text: 'create', color: c.fn },
      { text: '({', color: c.text },
      'newline',
      { text: '  model: ', color: c.text },
      { text: '"claude-sonnet-4-6"', color: c.str },
      { text: ',', color: c.text },
      'newline',
      { text: '  messages: [{', color: c.text },
      { text: ' role', color: c.text },
      { text: ': ', color: c.text },
      { text: '"user"', color: c.str },
      { text: ', ', color: c.text },
      { text: 'content', color: c.text },
      { text: ': ', color: c.text },
      { text: '"Hello"', color: c.str },
      { text: ' }],', color: c.text },
      'newline',
      { text: '});', color: c.text },
      'newline',
      { text: '// ModelTrack tracks: tokens, cost, latency, team, feature', color: c.comment },
    ],
  },
  {
    label: 'cURL',
    filename: 'terminal',
    lines: [
      { text: '# Same API, just swap the base URL', color: c.comment },
      'newline',
      { text: 'curl', color: c.kw },
      { text: ` ${PROXY_URL}/v1/messages `, color: c.text },
      { text: '\\', color: c.text },
      'newline',
      { text: '  -H ', color: c.text },
      { text: '"Content-Type: application/json"', color: c.str },
      { text: ' \\', color: c.text },
      'newline',
      { text: '  -H ', color: c.text },
      { text: '"x-api-key: $ANTHROPIC_API_KEY"', color: c.str },
      { text: ' \\', color: c.text },
      'newline',
      { text: '  -H ', color: c.text },
      { text: '"anthropic-version: 2023-06-01"', color: c.str },
      { text: ' \\', color: c.text },
      'newline',
      { text: '  -d ', color: c.text },
      { text: "'{", color: c.str },
      'newline',
      { text: '    "model": "claude-sonnet-4-6",', color: c.str },
      'newline',
      { text: '    "max_tokens": 1024,', color: c.str },
      'newline',
      { text: '    "messages": [{"role": "user", "content": "Hello"}]', color: c.str },
      'newline',
      { text: "  }'", color: c.str },
    ],
  },
  {
    label: 'OpenAI',
    filename: 'app.py',
    lines: [
      { text: 'from', color: c.kw },
      { text: ' openai ', color: c.text },
      { text: 'import', color: c.kw },
      { text: ' OpenAI', color: c.text },
      'newline',
      'newline',
      { text: '# Works with OpenAI SDK too — just change the base URL', color: c.comment },
      'newline',
      { text: 'client = ', color: c.text },
      { text: 'OpenAI', color: c.fn },
      { text: '(', color: c.text },
      'newline',
      { text: '    base_url=', color: c.text },
      { text: `"${PROXY_URL}/v1"`, color: c.str },
      { text: ',', color: c.text },
      'newline',
      { text: '    api_key=', color: c.text },
      { text: '"your-openai-key"', color: c.str },
      'newline',
      { text: ')', color: c.text },
      'newline',
      'newline',
      { text: 'response = client.', color: c.text },
      { text: 'chat', color: c.fn },
      { text: '.', color: c.text },
      { text: 'completions', color: c.fn },
      { text: '.', color: c.text },
      { text: 'create', color: c.fn },
      { text: '(', color: c.text },
      'newline',
      { text: '    model=', color: c.text },
      { text: '"gpt-4o"', color: c.str },
      { text: ',', color: c.text },
      'newline',
      { text: '    messages=[{', color: c.text },
      { text: '"role"', color: c.str },
      { text: ': ', color: c.text },
      { text: '"user"', color: c.str },
      { text: ', ', color: c.text },
      { text: '"content"', color: c.str },
      { text: ': ', color: c.text },
      { text: '"Hello"', color: c.str },
      { text: '}]', color: c.text },
      'newline',
      { text: ')', color: c.text },
      'newline',
      { text: '# ModelTrack tracks: tokens, cost, latency, team, feature', color: c.comment },
    ],
  },
];

export default function CodeTabs() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];

  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0c14] overflow-hidden">
      {/* Tab bar with traffic lights */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="size-3 rounded-full bg-red-500/20" />
        <div className="size-3 rounded-full bg-yellow-500/20" />
        <div className="size-3 rounded-full bg-green-500/20" />

        <div className="ml-3 flex items-center gap-1">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActive(i)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors duration-200 ${
                i === active
                  ? 'bg-white/[0.08] text-blue-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-600 font-mono">
          {tab.filename}
        </span>
      </div>

      {/* Code content */}
      <pre className="p-6 text-sm leading-relaxed overflow-x-auto font-mono min-h-[240px]">
        <code>
          {tab.lines.map((line, i) =>
            line === 'newline' ? (
              '\n'
            ) : (
              <span key={i} className={line.color}>
                {line.text}
              </span>
            )
          )}
        </code>
      </pre>
    </div>
  );
}
