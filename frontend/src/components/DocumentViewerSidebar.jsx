import React from "react";
import { FileText, BookOpen, Maximize2 } from "lucide-react";

export function DocumentViewerSidebar({ 
  activeSources = [], 
  focusedSourceIndex = 0, 
  onMaximizePage 
}) {
  const activeFocusedSource = activeSources[focusedSourceIndex];

  // Generates a clean URL string directing back to your Python FastAPI /render-pdf route
  const getPdfThumbnailUrl = (sourceObj) => {
    if (!sourceObj || !sourceObj.source) return "";
    
    // Extract file name from absolute/relative path strings
    const fileName = sourceObj.source.split("/").pop();
    const pageNumber = sourceObj.page || 1;
    
    return `http://localhost:8000/render-pdf?file=${encodeURIComponent(fileName)}&page=${pageNumber}`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-full p-4 shadow-3xs flex flex-col space-y-3.5">
      {/* Sidebar Header Indicator Matrix */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900">Document Mapping Context</span>
        </div>
        {activeSources.length > 0 && (
          <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
            Ref {focusedSourceIndex + 1} of {activeSources.length}
          </span>
        )}
      </div>

      {activeFocusedSource ? (
        <div className="space-y-3 animate-[fadeIn_0.4s_ease-out]">
          {/* Visual Document Page Card Frame Container */}
          <div 
            onClick={() => onMaximizePage(getPdfThumbnailUrl(activeFocusedSource))}
            className="relative rounded-lg overflow-hidden border border-slate-200 aspect-[3/4] bg-slate-50 group/thumb cursor-pointer hover:shadow-md transition-all duration-300"
          >
            <img 
              src={getPdfThumbnailUrl(activeFocusedSource)} 
              alt="Source Dynamic Page Viewport Preview Canvas"
              className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-[1.03]"
              onError={(e) => {
                // Fallback UI block display configuration if asset connection breaks down
                e.target.onerror = null;
                e.target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
              }}
            />
            
            {/* Cyber-Minimalist Hover Actions Accent Overlay */}
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-all duration-200">
              <div className="p-2 rounded-lg bg-white/90 backdrop-blur-3xs text-slate-800 shadow-sm flex items-center gap-1 text-[10px] font-semibold transform translate-y-2 group-hover/thumb:translate-y-0 transition-transform">
                <Maximize2 className="w-3 h-3 text-indigo-600" />
                <span>Maximize Page</span>
              </div>
            </div>

            {/* Micro Floating Data Metadata Tags */}
            <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-3xs text-white text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider">
              {activeFocusedSource.source ? activeFocusedSource.source.split(".").pop() : "PDF"}
            </div>
            <div className="absolute bottom-2 right-2 bg-indigo-600 text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold shadow-sm">
              Page {activeFocusedSource.page || "N/A"}
            </div>
          </div>

          {/* Active File Metadata Footnote Block */}
          <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg space-y-1">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Active Context File Path</span>
            <p className="text-[11px] text-slate-700 font-medium truncate" title={activeFocusedSource.source}>
              {activeFocusedSource.source || "Unknown System Source"}
            </p>
          </div>
        </div>
      ) : (
        /* Empty Index Fallback Placeholder Display State Structure */
        <div className="border border-dashed border-slate-200 rounded-lg aspect-[3/4] flex flex-col items-center justify-center p-4 text-center text-slate-400">
          <BookOpen className="w-5 h-5 text-slate-300 mb-2 stroke-1" />
          <p className="text-[11px] leading-normal font-medium max-w-[160px]">Click any text citation index pill to review structural source layout.</p>
        </div>
      )}
    </div>
  );
}