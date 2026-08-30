"use client";
import { useState } from "react";
import { Settings as SettingsIcon, Shield, Sliders, Database, Cpu, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [provider, setProvider] = useState("granite");
  const [model, setModel] = useState("ibm/granite-4-h-small");
  const [temperature, setTemperature] = useState(0.1);
  const [topK, setTopK] = useState(4);
  const [threshold, setThreshold] = useState(0.4);
  const [saved, setSaved] = useState(false);

  function handleSave(e) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 w-full">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">Application Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure model parameters, vector index defaults, and SaaS usage boundaries.
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-6">
        {/* LLM Engine Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
            <Cpu className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">LLM Generation Provider</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="granite">IBM WatsonX Granite (Recommended)</option>
                <option value="ollama">Local Llama 3 (Ollama)</option>
                <option value="openai_compatible">OpenAI-Compatible API</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Model Identifier</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Temperature: {temperature}</label>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full mt-2 accent-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Retrieval Defaults */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
            <Database className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Vector Store & Retrieval Defaults</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Top-K Retrieved Chunks: {topK}</label>
              <input
                type="range"
                min={1}
                max={8}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full mt-2 accent-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Similarity Threshold Filter: {threshold}</label>
              <input
                type="range"
                min={0.0}
                max={0.9}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full mt-2 accent-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Usage Limits (Read-Only) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
            <Shield className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">SaaS Tier Usage Limits</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Max KBs</span>
              <span className="text-base font-bold text-slate-900">5</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Max Documents</span>
              <span className="text-base font-bold text-slate-900">50</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Quota</span>
              <span className="text-base font-bold text-slate-900">500 MB</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">YouTube Quota</span>
              <span className="text-base font-bold text-slate-900">10 / mo</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <div className="flex items-center space-x-1 text-xs text-emerald-600 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Settings saved successfully!</span>
            </div>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
