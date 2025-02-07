import { useState,useEffect, useMemo } from "react";
import { Bot, Loader2, MessageSquare, Send, User2 } from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "./Button.js";
import { Input } from "./Input.js";
import './aiChat.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { LuSparkles } from "react-icons/lu";

function useMessagesWithThinking(messages) {
  return useMemo(() =>
    messages.map((m) => {
      if (m.role === "assistant") {
        const thinkEndIndex = m.content.indexOf("</think>");
        if (thinkEndIndex !== -1) {
          const thinkContent = m.content.substring(m.content.indexOf("<think>") + 7, thinkEndIndex);
          const responseContent = m.content.substring(thinkEndIndex + 8);
          return { ...m, finishedThinking: true, think: thinkContent, content: responseContent };
        } else {
          return { ...m, finishedThinking: false, think: m.content.replace("<think>", ""), content: "" };
        }
      }
      return m;
    }), [messages]
  );
}

async function chat(userMessage) {
  try {
    const response = await fetch("https://app.fortuneone.in/api/proxy-ollama.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: [{ role: "user", content: userMessage }]
      }),
    });

    return response;
  } catch (error) {
    console.error("Error fetching chat data:", error);
    throw error;
  }
}

function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [premise, setPremise] = useState("You are a helpful assistant. Always provide detailed answers.");
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    if (!chatStarted) setChatStarted(true);
  
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
  
    // Save the new messages to localStorage
    localStorage.setItem("chatMessages", JSON.stringify(newMessages));
  
    try {
      const response = await chat(newMessages); // Pass newMessages directly
      if (!response.body) return;
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let assistantResponse = "";
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split("\n");
        buffer = lines.pop() || "";
  
        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const parsed = JSON.parse(line);
            assistantResponse += parsed.message?.content || "";
  
            // Add both user and assistant responses to the message array
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              return lastMsg?.role === "assistant"
                ? [...prev.slice(0, -1), { role: "assistant", content: assistantResponse }]
                : [...prev, { role: "assistant", content: assistantResponse }];
            });
  
            // Save both user and assistant messages to localStorage
            localStorage.setItem("chatMessages", JSON.stringify([...newMessages, { role: "assistant", content: assistantResponse }]));
  
          } catch (error) {
            console.error("Error parsing JSON line:", error);
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages);
      setMessages(parsedMessages);
      
      // Automatically set chatStarted to true if there are stored messages
      if (parsedMessages.length > 0) {
        setChatStarted(true);
      }
    }
  }, []);
  
  
  const messagesWithThinkingSplit = useMessagesWithThinking(messages);

  return (
    <div className="flex flex-col min-h-screen bg-prime5 relative">
      <div className="flex flex-col min-h-56 bg-gray border-radius w-98 mt-24 mb-24 w-11/12 max-w-6xl mx-auto p-4">
        {!chatStarted && (
          <div className="h-700 flex justify-center items-center p-4">
            <div className="text-center">
              <LuSparkles className="w-7em h-3em icon-cd885b" />
              <h5 className="fs-32 text-cd885b">Ask Elara AI Assistant</h5>
              <div>
                <input
                  disabled
                  className="d-none h-10 ms-16 fs-20R text-black rounded-md border-0 px-5 py-2 text-sm bg-transparent"
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  placeholder="Set system premise..."
                />
                <p className="w-56rem ms-16 fs-20R text-black rounded-md border-0 px-5 py-2 text-sm bg-transparent">{premise}</p>
              </div>
            </div>
          </div>

        )}

        {chatStarted && (
          <div className="Overflow-chat px-4 pt-4 pb-4">
            {messagesWithThinkingSplit
              .filter(({ role }) => role === "user" || role === "assistant")
              .map((m, index) => (
                <AIMessage key={index} message={m} />
              ))}
          </div>
        )}

        <div className="mt-auto w-97 m-2 bg-white shadow-md rounded">
          <form onSubmit={handleSubmit} className="mx-auto bg-white p-3 rounded">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="w-full bg-white border-0 pl-10 py-2 input-no-outline"
                  value={input}
                  disabled={loading}
                  placeholder="Ask your Elara..."
                  onChange={(e) => setInput(e.target.value)}
                />


              </div>
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-white hover:bg-white/90 flex items-center justify-center space-x-2 py-2 px-4 border-0 rounded-md text-sm"
              >
                {loading ? (
                  <div className="spinner-border spinner-border-sm" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>

  );
}

export default AIChat;

const AIMessage = ({ message }) => {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 my-2 ${message.role === "user" ? "bg-user text-white" : "bg-gray-800 text-gray-100"}`}>
        <div className="flex items-center gap-2 mb-2 justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            {message.role === "user" ? <User2 className="h-1em w-2em" /> : message.finishedThinking ? <LuSparkles className="h-4 w-4" /> : <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>}
            {message.role === "user" ? "You" : "Elara"}
          </span>
          {message.role === "assistant" && <button className="text-xs italic cursor-pointer bg-transparent border-0 ms-4" ></button>}
        </div>
        {message.think && <div className="mb-2 text-sm italic border-l-2 border-gray-600 pl-2 py-1 text-gray-300"><Markdown>{message.think}</Markdown></div>}
        <article className={`prose max-w-none prose-invert
          }`}><Markdown>{message.content}</Markdown></article>

      </div>
    </div>
  );
};


