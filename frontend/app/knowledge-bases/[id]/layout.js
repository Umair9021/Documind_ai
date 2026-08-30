"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, FileText, ArrowLeft, BookOpen } from "lucide-react";

export default function KBLayout({ children, params }) {
  const pathname = usePathname();
  const kbId = params.id;

  const isChat = pathname.includes("/chat");
  const isSources = pathname.includes("/sources");

  return (
    <div className="flex flex-col flex-1 mx-auto max-w-7xl px-4 sm:px-6 py-6 w-full">
      {/* Top Breadcrumb & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Knowledge Base</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {kbId === "kb_generative_ai_001" ? "Generative AI & RAG Master Notes" : "Knowledge Workspace"}
            </h1>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-100 p-1 self-start sm:self-auto">
          <Link
            href={`/knowledge-bases/${kbId}/chat`}
            className={`flex items-center space-x-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              isChat ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </Link>
          <Link
            href={`/knowledge-bases/${kbId}/sources`}
            className={`flex items-center space-x-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
              isSources ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Sources</span>
          </Link>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col pt-4">{children}</div>
    </div>
  );
}
