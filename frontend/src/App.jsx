import { useState } from "react";
import { StatsBar } from "./components/StatsBar";
import { ChatPanel } from "./components/ChatPanel";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Syncs the top search bar results down to the dashboard canvas
  const handleSearchStart = (query) => {
    setHasSearched(true);
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
      {/* Top Navigation Control Room Bar */}
      <StatsBar 
        onSearchStart={handleSearchStart} 
        onSearchSuccess={handleSearchSuccess}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
      />

      {/* Main Workspace Display Grid Canvas */}
      <div className="flex-1">
        <ChatPanel 
          messages={messages}
          setMessages={setMessages}
          hasSearched={hasSearched}
          setHasSearched={setHasSearched}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          hideHeader={true} // Strips out the internal duplicated header
        />
      </div>
    </div>
  );
}