import { useState, useRef, useEffect } from "react"
import { Sparkles, BookOpen, Loader2, FileText, Quote, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { askQuestion} from "../lib/api"
import { useApi } from "../lib/useApi"

function FormattedAnswer({ text, sources = [], onRefSelect }) {
  if (!text) return null;

  const lines = text.split('\n');
  let refCounter = 0;

  return (
    <div className="space-y-4 font-sans text-[13.5px] leading-relaxed text-slate-600">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) return null;

        const regex = /(\*\*.*?\*\*|\[Source:.*?\])/g;
        const parts = line.split(regex);

        return (
          <p key={lineIdx} className="tracking-normal font-normal relative">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <span key={partIdx} className="font-bold text-slate-900 bg-slate-100/60 px-1 rounded mx-0.5">
                    {part.slice(2, -2)}
                  </span>
                );
              } else if (part.startsWith('[Source:') && part.endsWith(']')) {
                const currentSource = sources[refCounter] || {};
                const currentRefIndex = refCounter;
                refCounter++;

                const fileName = currentSource.source ? currentSource.source.split("/").pop() : "Data Segment";
                const pageInfo = currentSource.page ? `Page ${currentSource.page}` : "Matrix Sync";
                const extractedExcerpt = currentSource.text || "Extracted structural dataset segment.";

                return (
                  <span 
                    key={partIdx} 
                    onClick={() => onRefSelect(currentRefIndex)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-mono bg-indigo-50 border border-indigo-100/80 text-indigo-600 px-2 py-0.5 rounded ml-1 tracking-tight cursor-pointer hover:bg-indigo-100 transition-colors group/ref relative"
                  >
                    <BookOpen className="w-2.5 h-2.5" />
                    <span>Ref #{refCounter}</span>

                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/ref:flex flex-col w-72 bg-white border border-slate-200 p-3.5 rounded-xl shadow-xl text-slate-700 z-50 pointer-events-none transition-all duration-200 scale-95 origin-bottom group-hover/ref:scale-100 group-hover/ref:opacity-100 animate-[fadeIn_0.15s_ease-out]">
                      <span className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-indigo-600 border-b border-slate-100 pb-1.5 mb-2">
                        <span className="truncate max-w-[150px]">{fileName}</span>
                        <span className="text-slate-400 font-normal">{pageInfo}</span>
                      </span>
                      <span className="text-[11px] font-sans leading-relaxed text-slate-500 normal-case tracking-normal font-normal line-clamp-3">
                        "{extractedExcerpt}"
                      </span>
                      <span className="text-[9px] text-indigo-500 font-sans mt-1.5 block font-medium">Click to focus source page view →</span>
                      <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]" />
                    </span>
                  </span>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

export function ChatPanel({ 
  messages = [], 
  setMessages, 
  hasSearched = false, 
  setHasSearched, 
  hideHeader = true 
}) {
  const [input, setInput] = useState("")
  const [useHybrid] = useState(true)
  const [isChatOpen] = useState(false)
  const [focusedSourceIndex, setFocusedSourceIndex] = useState(0)
  const [zoomScale, setZoomScale] = useState(1.0)
  
  const chatInputRef = useRef(null)
  const searchApi = useApi()

  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => chatInputRef.current?.focus(), 300)
    }
  }, [isChatOpen])

  useEffect(() => {
    setZoomScale(1.0);
  }, [focusedSourceIndex]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || searchApi.loading) return

    if (setHasSearched) setHasSearched(true)
    const currentQuery = input.trim()
    setInput("")
    
    const newId = Date.now().toString()
    if (setMessages) {
      setMessages(prev => [...prev, { id: newId, query: currentQuery, answer: null, sources: [] }])
    }

    try {
      const response = await searchApi.execute(() => askQuestion(currentQuery, useHybrid))
      if (setMessages && response) {
        setMessages(prev => prev.map(msg => msg.id === newId ? { ...msg, ...response } : msg));
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 3.0))
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.5))
  const handleResetZoom = () => setZoomScale(1.0)

  const latestMessage = messages[messages.length - 1] || {}
  const activeSources = latestMessage.sources || []
  const activeFocusedSource = activeSources[focusedSourceIndex]

  const getPdfThumbnailUrl = (sourceObj) => {
    if (!sourceObj || !sourceObj.source) {
      return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
    }
    const fileName = sourceObj.source.split("/").pop();
    const pageNumber = sourceObj.page || 1;
    return `http://localhost:8000/render-pdf?file=${encodeURIComponent(fileName)}&page=${pageNumber}`;
  }

  const handleOpenInNewWindow = () => {
    if (!activeFocusedSource) return;
    const url = getPdfThumbnailUrl(activeFocusedSource);
    
    const width = 800;
    const height = 900;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      url,
      "_blank",
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=no`
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50/60 font-sans antialiased text-slate-800 relative overflow-hidden">
      {!hideHeader && (
        <header className="flex-shrink-0 bg-white border-b border-slate-200/80 px-6 py-4 shadow-sm z-40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 flex-shrink-0 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white"><Sparkles className="w-4 h-4" /></div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">CatalogAI</h1>
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Semantic Discovery</span>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 min-h-0 flex flex-col">
        {hasSearched && messages.length > 0 && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch relative">
            
            {/* Left Frame: Independent Scrollable Answer Feed (70% width) */}
            <div className="lg:col-span-7 overflow-y-auto pr-2 space-y-8 h-full pb-8">
              {messages.map((item) => (
                <div key={item.id} className="space-y-6 border-b border-slate-200/60 pb-8 last:border-b-0">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="text-xs font-medium text-slate-400">Query: <span className="text-slate-800 font-semibold font-mono bg-slate-100 px-2 py-0.5 rounded ml-1">"{item.query}"</span></div>
                  </div>

                  {item.answer ? (
                    <div className="bg-[#C8E8FA] border border-slate-200/80 rounded-2xl relative flex flex-col md:flex-row items-stretch">
                      <div className="p-6 flex-1 space-y-3 overflow-visible">
                        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-indigo-600 uppercase">
                          <Quote className="w-3 h-3 transform rotate-180" />
                          <span>Answer</span>
                        </div>
                        <FormattedAnswer text={item.answer} sources={item.sources} onRefSelect={(idx) => setFocusedSourceIndex(idx)} />
                      </div>
                    </div>
                  ) : (
                    !searchApi.error && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 p-4 bg-white border border-slate-100 rounded-xl shadow-3xs">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>Synthesizing structural assets...</span>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>

            {/* Right Frame: Truly Fixed Document View Panel (30% width) */}
            <div className="lg:col-span-3 h-full pb-8 select-none relative">
              <div className="bg-slate-50 border border-slate-300 rounded-xl flex flex-col h-full overflow-hidden pointer-events-auto p-4 shadow-3xs">
                
                {/* Fixed Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Document Mapping Context</span>
                  </div>
                  {activeSources.length > 0 && (
                    <span className="text-[9px] font-mono bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                      Ref {focusedSourceIndex + 1} of {activeSources.length}
                    </span>
                  )}
                </div>

                {/* Content Workspace Area */}
                <div className="flex-1 min-h-0 flex flex-col justify-between relative pt-3">
                  {activeFocusedSource ? (
                    <div className="flex flex-col flex-1 min-h-0 justify-between gap-3 h-full">
                      
                      {/* Viewport Frame Container */}
                      <div className="relative w-full h-full flex-1 min-h-0 bg-slate-100 rounded-md border border-slate-200 overflow-auto flex items-center justify-center">
                        <img 
                          src={getPdfThumbnailUrl(activeFocusedSource)} 
                          alt="Viewport Thumbnail"
                          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                          className="w-full h-full object-contain transition-transform duration-200 ease-out"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80";
                          }}
                        />
                        
                        {/* Control Toolbar Action Bar */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 z-50 bg-slate-900/80 backdrop-blur-xs p-1 rounded-md shadow-md">
                          <button
                            onClick={handleZoomOut}
                            className="p-1 rounded text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[9px] font-mono text-slate-300 px-1 min-w-[32px] text-center">
                            {Math.round(zoomScale * 100)}%
                          </span>
                          <button
                            onClick={handleZoomIn}
                            className="p-1 rounded text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-3 bg-slate-700 mx-1" />
                          <button
                            onClick={handleResetZoom}
                            className="p-1 rounded text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Reset Zoom"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-3 bg-slate-700 mx-1" />
                          <button
                            onClick={handleOpenInNewWindow}
                            className="p-1 rounded text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Open in new window"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-3xs text-white text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider z-40">
                          {activeFocusedSource.source ? activeFocusedSource.source.split(".").pop() : "PDF"}
                        </div>
                        
                        <div className="absolute bottom-3 right-3 bg-indigo-600 text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold shadow-sm z-40">
                          Page {activeFocusedSource.page || "N/A"}
                        </div>
                      </div>

                      {/* Path Footer Panel */}
                      <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-lg space-y-1 shrink-0">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Active Context File Path</span>
                        <p className="text-[11px] text-slate-700 font-medium truncate" title={activeFocusedSource.source}>
                          {activeFocusedSource.source || "Unknown System Source"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 rounded-lg flex-1 flex flex-col items-center justify-center p-4 text-center text-slate-400 bg-white/50">
                      <BookOpen className="w-6 h-6 text-slate-300 mb-2 stroke-1" />
                      <p className="text-[11px] leading-normal font-medium max-w-[160px]">Click any text citation index pill to review structural source layout.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}