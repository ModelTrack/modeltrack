import Link from "next/link";

function CodeBlock({ children, filename }: { children: string; filename?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-gray-900 overflow-hidden my-4">
      {filename && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
          <div className="size-2.5 rounded-full bg-white/10" />
          <div className="size-2.5 rounded-full bg-white/10" />
          <div className="size-2.5 rounded-full bg-white/10" />
          <span className="ml-2 text-xs text-gray-500 font-mono">{filename}</span>
        </div>
      )}
      <pre className="p-4 text-sm leading-relaxed overflow-x-auto font-mono text-gray-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-gray-800 px-1.5 py-0.5 rounded text-emerald-400 text-sm font-mono">
      {children}
    </code>
  );
}

export default function LangChainPage() {
  return (
    <>
      <h1 className="text-4xl font-bold text-white mb-2">LangChain &amp; Frameworks</h1>
      <p className="text-gray-400 leading-relaxed mb-12 text-lg">
        ModelTrack works with any AI framework that lets you set a custom base
        URL. Here&apos;s how to integrate with the most popular ones.
      </p>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4 my-6">
        <p className="text-sm text-gray-300 leading-relaxed">
          <strong className="text-emerald-400">The universal approach:</strong> ModelTrack
          is a reverse proxy. Any library that talks to Anthropic or OpenAI can be
          routed through it by changing the base URL to{" "}
          <InlineCode>http://localhost:8080</InlineCode>. The examples below show
          how to do this for each framework.
        </p>
      </div>

      {/* LangChain + Anthropic */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">LangChain with Anthropic</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Use the <InlineCode>anthropic_api_url</InlineCode> parameter to route
        through ModelTrack.
      </p>
      <CodeBlock filename="langchain_anthropic.py">{`from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(
    model="claude-sonnet-4-6",
    anthropic_api_url="http://localhost:8080",
    default_headers={
        "X-ModelTrack-Team": "ml-research",
        "X-ModelTrack-App": "langchain-bot",
    }
)

response = llm.invoke("What is the meaning of life?")`}</CodeBlock>

      {/* LangChain + OpenAI */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">LangChain with OpenAI</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Use the <InlineCode>openai_api_base</InlineCode> parameter.
      </p>
      <CodeBlock filename="langchain_openai.py">{`from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o",
    openai_api_base="http://localhost:8080",
    default_headers={
        "X-ModelTrack-Team": "product",
        "X-ModelTrack-App": "langchain-bot",
    }
)

response = llm.invoke("Summarize this document.")`}</CodeBlock>

      {/* CrewAI */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">CrewAI</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        CrewAI uses the Anthropic and OpenAI SDKs under the hood. Set the base
        URL via environment variables:
      </p>
      <CodeBlock filename="terminal">{`# Set the base URL for all LLM calls in CrewAI
export ANTHROPIC_BASE_URL=http://localhost:8080
export OPENAI_BASE_URL=http://localhost:8080

# Attribution headers
export MODELTRACK_TEAM=ml-research
export MODELTRACK_APP=crew-agent

# Then run your CrewAI app normally
python crew_app.py`}</CodeBlock>
      <p className="text-gray-400 leading-relaxed mb-4 mt-4">
        Or use the ModelTrack SDK for auto-instrumentation:
      </p>
      <CodeBlock filename="crew_app.py">{`import modeltrack  # Auto-patches before CrewAI loads the SDK
modeltrack.configure(team="ml-research", app="crew-agent")

from crewai import Agent, Task, Crew
# ... your CrewAI code works as normal`}</CodeBlock>

      {/* LlamaIndex */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">LlamaIndex</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Set <InlineCode>api_base</InlineCode> in the LLM constructor:
      </p>
      <CodeBlock filename="llamaindex_app.py">{`from llama_index.llms.anthropic import Anthropic

llm = Anthropic(
    model="claude-sonnet-4-6",
    api_base="http://localhost:8080",
    additional_kwargs={
        "extra_headers": {
            "X-ModelTrack-Team": "ml-research",
            "X-ModelTrack-App": "llamaindex-bot",
        }
    }
)

from llama_index.llms.openai import OpenAI

llm = OpenAI(
    model="gpt-4o",
    api_base="http://localhost:8080",
    additional_kwargs={
        "extra_headers": {
            "X-ModelTrack-Team": "ml-research",
            "X-ModelTrack-App": "llamaindex-bot",
        }
    }
)`}</CodeBlock>

      {/* Vercel AI SDK */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Vercel AI SDK (Node.js)</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        Use the <InlineCode>baseURL</InlineCode> option when creating the provider:
      </p>
      <CodeBlock filename="app.ts">{`import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

const anthropic = createAnthropic({
  baseURL: 'http://localhost:8080',
  headers: {
    'X-ModelTrack-Team': 'product',
    'X-ModelTrack-App': 'vercel-app',
  }
})

const { text } = await generateText({
  model: anthropic('claude-sonnet-4-6'),
  prompt: 'Hello!',
})`}</CodeBlock>

      <CodeBlock filename="openai-provider.ts">{`import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const openai = createOpenAI({
  baseURL: 'http://localhost:8080',
  headers: {
    'X-ModelTrack-Team': 'product',
    'X-ModelTrack-App': 'vercel-app',
  }
})

const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hello!',
})`}</CodeBlock>

      {/* Generic approach */}
      <h2 className="text-xl font-semibold text-white mt-12 mb-4">Any other framework</h2>
      <p className="text-gray-400 leading-relaxed mb-4">
        If your framework uses the Anthropic or OpenAI Python/Node SDK under the
        hood, you have two options:
      </p>
      <ol className="space-y-4 mb-4 ml-1">
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">1. Auto-instrumentation:</strong> Import{" "}
          <InlineCode>modeltrack</InlineCode> before importing the framework. The SDK
          will patch the underlying LLM clients automatically.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">2. Environment variables:</strong> Set{" "}
          <InlineCode>ANTHROPIC_BASE_URL</InlineCode> or{" "}
          <InlineCode>OPENAI_BASE_URL</InlineCode> to{" "}
          <InlineCode>http://localhost:8080</InlineCode>. Many SDKs read these
          automatically.
        </li>
        <li className="text-gray-400 text-sm leading-relaxed">
          <strong className="text-white">3. Manual base URL:</strong> Look for a{" "}
          <InlineCode>base_url</InlineCode>, <InlineCode>api_base</InlineCode>, or{" "}
          <InlineCode>baseURL</InlineCode> parameter in the framework&apos;s LLM constructor.
        </li>
      </ol>

      <p className="text-gray-400 leading-relaxed mb-4 mt-8">
        Need help integrating with a specific framework?{" "}
        <a
          href="https://github.com/ModelTrack/modeltrack/issues"
          className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          Open an issue on GitHub
        </a>
        .
      </p>
    </>
  );
}
