import { useState } from "react";
import { StatsBar } from "./StatsBar";
import { MainCanvas } from "./MainCanvas"; // Your lower grid/viewer panel split layout

export default function Dashboard() {
  const [messages, setMessages] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);

  const handleSearchStart = (query) => {
    setHasSearched(true);
    setGlobalSearchLoading(true);
    
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "user",
        query: query,
        answer: null,
        sources: [],
      },
    ]);
  };

  const handleSearchSuccess = (res) => {
    setGlobalSearchLoading(false);
    setMessages((prev) =>
      prev.map((msg, idx) =>
        idx === prev.length - 1
          ? {
              ...msg,
              answer: res.answer,
              sources: res.sources || [],
              confidence: res.confidence,
              method: res.retrieval_method,
            }
          : msg
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col">
      {/* Structural Header Action Bar */}
      <StatsBar 
        onSearchStart={handleSearchStart} 
        onSearchSuccess={handleSearchSuccess}
        onSearchError={() => setGlobalSearchLoading(false)}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
      />

      {/* Main Vector Context Canvas Grid Viewport */}
      <div className="flex-1">
        <MainCanvas 
          messages={messages} 
          setMessages={setMessages}
          hasSearched={hasSearched} 
          globalLoading={globalSearchLoading}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />
      </div>
    </div>
  );
}