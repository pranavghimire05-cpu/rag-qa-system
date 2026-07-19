import { useEffect, useState, useRef } from "react";
import { UserIcon, Search, Zap, Loader2, ArrowRight, Upload, FileText } from "lucide-react";

import { getStats, askQuestion, uploadDocument } from "../lib/api"; // Added uploadDocument
import { useApi } from "../lib/useApi";             

export function StatsBar({ onSearchStart, onSearchSuccess, onSearchError, selectedFile, setSelectedFile }) {
  const [input, setInput] = useState("");
  const [useHybrid, setUseHybrid] = useState(true);
  
  const fileInputRefCenter = useRef(null);
  const searchApi = useApi();
  const uploadApi = useApi();
  
  const [stats, setStats] = useState({
    total_documents: 0,
    collection_name: "",
  });
  const [loading, setLoading] = useState(true);

  // Triggers API pipeline ingestion right after file assignment
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (setSelectedFile) {
      setSelectedFile(file);
    }

    try {
      // Execute the upload API endpoint call wrapped in your useApi handler
      await uploadApi.execute(() => uploadDocument(file));
      
      // Optionally force refresh stats immediately after upload completes
      const updatedStats = await getStats();
      setStats(updatedStats);
    } catch (err) {
      console.error("Document ingestion failed:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || searchApi.loading) return;

    const currentQuery = input.trim();
    setInput("");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (onSearchStart) onSearchStart(currentQuery);

    try {
      const res = await searchApi.execute(() => {
        return askQuestion(currentQuery, useHybrid);
      });
      
      if (res && onSearchSuccess) {
        onSearchSuccess(res);
      }
    } catch (err) {
      console.error("Search failed:", err);
      if (onSearchError) onSearchError();
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getStats();
        setStats(data);
      } catch (err) {
        console.error("Failed fetching collection stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 z-50 h-35 bg-[#E8FAF8] flex items-center justify-between w-full px-8 py-4 border-b border-slate-200 shadow-sm">
      {/* Left */}
      <div>
        <h1 className="text-lg font-bold text-slate-800">RAG Q&A</h1>
        <p className="text-xs text-slate-500">Document Intelligence</p>
      </div>

      {/* Mid */}
      <div className="w-full max-w-2xl flex gap-3 items-center mx-6">
        <form onSubmit={handleSubmit} className="w-full relative group">
          <div className="h-35 relative flex items-center bg-white border border-slate-200 group-hover:border-slate-300 focus-within:border-indigo-500 rounded-xl p-1 transition-all duration-200 shadow-sm focus-within:shadow-md">
            <Search className="absolute left-4 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type to search vectors or drop context..."
              disabled={searchApi.loading}
              className="w-full bg-transparent pl-11 pr-36 py-3 text-sm text-slate-800 focus:outline-none"
            />
            
            <div className="absolute right-2 flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRefCenter} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept=".pdf,.txt,.csv,.json,.doc,.docx" 
              />
              <button
                type="button"
                onClick={() => fileInputRefCenter.current?.click()}
                disabled={uploadApi.loading}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                {uploadApi.loading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <Upload className="w-4 h-4" />}
              </button>

              <button type="button" onClick={() => setUseHybrid(!useHybrid)} className="flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[11px] font-semibold transition-all bg-white border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer shadow-3xs">
                <Zap className={`w-3.5 h-3.5 ${useHybrid ? "text-amber-500 animate-pulse" : "text-slate-400"}`} />
              </button>

              <button
                type="submit"
                disabled={!input.trim() || searchApi.loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {searchApi.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Search</span>}
                {!searchApi.loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Documents Count Badge */}
        <button className="relative flex items-center gap-2 px-2 py-2">
          <div className="group relative px-3">
            <FileText className="h-5 w-5 text-indigo-500" />
            <span className="absolute -top-4 -right-3 h-4 min-w-4 px-1 bg-red-600 text-white text-[9px] flex items-center justify-center rounded-full font-mono">
              {loading ? "..." : stats.total_documents.toLocaleString()}
            </span>
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max px-3 py-1.5 bg-white border border-neutral-200 shadow-lg rounded-md text-[10px] font-bold uppercase tracking-widest text-neutral-500 opacity-0 invisible transition-all duration-200 group-hover:opacity-100 group-hover:visible group-hover:translate-y-1 z-50 pointer-events-none">
              Total number of document chunks
            </span>
          </div>
        </button>

        {/* User Identity Profile Indicator */}
        <div className="flex items-center gap-3 rounded-xl bg-[#AFFAF4] border border-slate-200 px-3 py-1.5 shadow-2xs">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs">
            <UserIcon className="bg-red rounded-full"></UserIcon>
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">Pranav</p>
            <p className="text-[10px] text-slate-400 font-mono">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}