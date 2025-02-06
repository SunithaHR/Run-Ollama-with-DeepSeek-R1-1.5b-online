import { useState, useMemo } from "react";
import { Bot, Loader2, MessageSquare, Send, User2 } from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "./Button.js";
import { Input } from "./Input.js";
import './aiChat.css';
import 'bootstrap/dist/css/bootstrap.min.css';


// Function to handle messages and their thought process
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
        // message
      }),
    });

    // Return the response
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await chat([{ role: "system", content: premise }, ...newMessages]);
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

        // Process each line of the response
        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const parsed = JSON.parse(line);
            assistantResponse += parsed.message?.content || "";
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              return lastMsg?.role === "assistant"
                ? [...prev.slice(0, -1), { role: "assistant", content: assistantResponse }]
                : [...prev, { role: "assistant", content: assistantResponse }];
            });
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

  const messagesWithThinkingSplit = useMessagesWithThinking(messages);

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <div className="p-4 container mx-auto max-w-4xl space-y-4">
        <div className="flex gap-2">
          <Input className="flex h-10 w-100 rounded-md border-0 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex-1 bg-gray-800 border-gray-700 text-gray-100" value={premise} onChange={(e) => setPremise(e.target.value)} placeholder="Set system premise..." />
        </div>
      </div>
      <div className="flex-1 px-4 pt-4 container mx-auto max-w-4xl pb-32">
        {messagesWithThinkingSplit.filter(({ role }) => role === "user" || role === "assistant").map((m, index) => <AIMessage key={index} message={m} />)}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-800 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="container mx-auto max-w-4xl">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="flex-1 bg-gray-900 border-gray-700 text-gray-100 pl-10 w-100 rounded-md py-2" value={input} disabled={loading} placeholder="Ask your local DeepSeek..." onChange={(e) => setInput(e.target.value)} />
            </div>
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-user hover:bg-primary/90 flex items-center justify-center space-x-2 py-2 px-4 rounded-md rounded-md text-sm"
            >
              {loading ? (
                <div class="spinner-border spinner-border-sm" role="status">
                  <span class="visually-hidden">Loading...</span>
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
  );
}

export default AIChat;

const AIMessage = ({ message }) => {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-lg p-4 my-2 ${message.role === "user" ? "bg-user text-black" : "bg-gray-800 text-gray-100"}`}>
        <div className="flex items-center gap-2 mb-2 justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            {message.role === "user" ? <User2 className="h-4 w-4" /> : message.finishedThinking ? <Bot className="h-4 w-4" /> : <div class="spinner-border spinner-border-sm" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>}
            {message.role === "user" ? "You" : "DeepSeek R1 (32b)"}
          </span>
          {message.role === "assistant" && <button className="text-xs italic cursor-pointer bg-transparent border-0 " onClick={() => setCollapsed(!collapsed)}>{collapsed ? "show thoughts" : "hide thoughts"}</button>}
        </div>
        {message.think && !collapsed && <div className="mb-2 text-sm italic border-l-2 border-gray-600 pl-2 py-1 text-gray-300"><Markdown>{message.think}</Markdown></div>}
        <article className="prose max-w-none prose-invert"><Markdown>{message.content}</Markdown></article>
      </div>
    </div>
  );
};
