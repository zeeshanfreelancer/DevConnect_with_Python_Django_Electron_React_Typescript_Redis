
import { useMemo, useState, useEffect } from 'react';
import {
  checkBackendHealth,
  getConversations,
  createConversation,
  getMessages,
  sendMessage as sendMessageApi,
} from "./services/api";

import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  FileText,
  Hash,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Phone,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Users,
  Video,
} from 'lucide-react'

type Message = {
  id: number
  sender: string
  text: string
  time: string
  mine?: boolean
}

type Conversation = {
  id: number
  name: string
  initials: string
  color: string
  preview: string
  time: string
  unread: number
  online: boolean
  messages: Message[]
}

const navItems = [
  { label: 'Activity', icon: Activity },
  { label: 'Chat', icon: MessageSquare },
  { label: 'Teams', icon: Users },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Files', icon: FileText },
]

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationError, setConversationError] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [activeNav, setActiveNav] = useState('Chat')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId,
  )

  async function loadConversations() {
    try {
      setLoadingConversations(true);
      setConversationError("");

      const data = await getConversations();

      const colors = [
        "bg-violet-500",
        "bg-blue-500",
        "bg-emerald-500",
        "bg-amber-500",
      ];

      const formattedConversations: Conversation[] = data.map(
        (conversation, index) => ({
          id: conversation.id,
          name: conversation.title,
          initials: conversation.title
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          color: colors[index % colors.length],
          preview: conversation.last_message || "No messages yet",
          time: new Date(conversation.updated_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unread: 0,
          online: false,
          messages: [],
        })
      );

      setConversations(formattedConversations);

      setActiveId((currentId) => {
        if (
          currentId !== null &&
          formattedConversations.some((item) => item.id === currentId)
        ) {
          return currentId;
        }

        return formattedConversations[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Conversation loading error:", error);
      setConversationError("Unable to load conversations.");
    } finally {
      setLoadingConversations(false);
    }
  }

  async function handleCreateConversation() {
    const title = window.prompt("Enter conversation name:");

    if (!title?.trim()) return;

    try {
      const created = await createConversation(title.trim());

      const newConversation: Conversation = {
        id: created.id,
        name: created.title,
        initials: created.title
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        color: "bg-violet-500",
        preview: created.last_message || "No messages yet",
        time: new Date(created.updated_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        unread: 0,
        online: false,
        messages: [],
      };

      setConversations((current) => [newConversation, ...current]);
      setActiveId(created.id);
    } catch (error) {
      console.error("Create conversation error:", error);
      alert("Unable to create conversation.");
    }
  }

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [conversations, search],
  )

  async function sendMessage() {
    const text = draft.trim();

    if (!text || !activeConversation) return;

    try {
      const savedMessage = await sendMessageApi(
        activeConversation.id,
        "Zeeshan",
        text
      );

      const newMessage: Message = {
        id: savedMessage.id,
        sender: savedMessage.sender,
        text: savedMessage.text,
        time: new Date(savedMessage.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mine: true,
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeId
            ? {
              ...conversation,
              preview: text,
              time: newMessage.time,
              messages: [...conversation.messages, newMessage],
            }
            : conversation
        )
      );

      setDraft("");
    } catch (error) {
      console.error("Send message error:", error);
      alert("Message could not be sent. Please try again.");
    }
  }

  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [backendMessage, setBackendMessage] = useState("");

  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        setBackendStatus("Connected");
        setBackendMessage(data.message);
      })
      .catch((error) => {
        console.error("Backend connection error:", error);
        setBackendStatus("Disconnected");
        setBackendMessage("Unable to connect to Django backend.");
      });
  }, []);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeId === null) return;

    let cancelled = false;

    async function loadMessages() {
      try {
        setMessagesLoading(true);
        setMessagesError("");

        const data = await getMessages(activeId!);

        if (cancelled) return;

        const formattedMessages: Message[] = data.map((message) => ({
          id: message.id,
          sender: message.sender,
          text: message.text,
          time: new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          mine: message.sender === "Zeeshan",
        }));

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === activeId
              ? { ...conversation, messages: formattedMessages }
              : conversation
          )
        );
      } catch (error) {
        console.error("Message loading error:", error);

        if (!cancelled) {
          setMessagesError("Unable to load messages.");
        }
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-800">
      <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-white p-3 shadow-lg">
        <p className="font-semibold">
          Backend: {backendStatus}
        </p>
        <p className="text-sm text-gray-500">
          {backendMessage}
        </p>
      </div>
      {/* Main navigation */}
      <aside className="flex w-[72px] shrink-0 flex-col items-center bg-[#f5f5f5] py-5">
        <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
          <MessageSquare size={23} strokeWidth={2.4} />
        </div>

        <div className="flex w-full flex-1 flex-col items-center gap-3">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              title={label}
              className={`relative flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-xl transition ${activeNav === label
                ? 'bg-white text-violet-700 shadow-sm'
                : 'text-slate-500 hover:bg-white hover:text-slate-800'
                }`}
            >
              {activeNav === label && (
                <span className="absolute left-0 h-7 w-1 rounded-r-full bg-violet-600" />
              )}
              <Icon size={21} strokeWidth={1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-5">
          <button
            title="Settings"
            onClick={() => setActiveNav('Settings')}
            className="text-slate-500 hover:text-slate-800"
          >
            <Settings size={21} />
          </button>
          <button title="Help" className="text-slate-500 hover:text-slate-800">
            <CircleHelp size={21} />
          </button>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-orange-400 text-sm font-semibold text-white">
            Z
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#f5f5f5] bg-emerald-500" />
          </div>
        </div>
      </aside>

      {/* Conversation list */}
      <section className="flex w-[320px] shrink-0 flex-col border-r border-slate-200 bg-white">
        <header className="flex h-[76px] items-center justify-between px-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {activeNav === 'Chat' ? 'Chat' : activeNav}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Stay connected with your team
            </p>
          </div>
          <button
            title="New chat"
            onClick={handleCreateConversation}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <Plus size={19} />
          </button>
        </header>

        <div className="px-4 pb-3">
          <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
            <Search size={17} className="shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-5 border-b border-slate-100 px-5 pb-3 text-sm">
          <button className="border-b-2 border-violet-600 pb-1 font-semibold text-violet-700">
            Recent
          </button>
          <button className="pb-1 text-slate-500 hover:text-slate-800">
            Unread
          </button>
          <button className="pb-1 text-slate-500 hover:text-slate-800">
            Groups
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">

          {loadingConversations && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              Loading conversations...
            </p>
          )}

          {conversationError && (
            <p className="px-4 py-8 text-center text-sm text-red-500">
              {conversationError}
            </p>
          )}
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setActiveId(conversation.id)}
              className={`mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${activeId === conversation.id
                ? 'bg-violet-50'
                : 'hover:bg-slate-50'
                }`}
            >
              <div className="relative shrink-0">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${conversation.color} text-sm font-semibold text-white`}
                >
                  {conversation.initials}
                </div>
                {conversation.online && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">
                    {conversation.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {conversation.time}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {conversation.preview}
                </p>
              </div>

              {conversation.unread > 0 && (
                <span className="mt-5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
                  {conversation.unread}
                </span>
              )}
            </button>
          ))}

          {filteredConversations.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              No conversations found.
            </p>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400 font-semibold text-white">
              Z
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Zeeshan</p>
              <p className="text-xs text-emerald-600">Available</p>
            </div>
            <ChevronDown size={17} className="text-slate-400" />
          </div>
        </div>
      </section>

      {/* Main conversation */}
      <main className="flex min-w-0 flex-1 flex-col bg-white">
        {activeConversation ? (
          <>
            <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200 px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${activeConversation.color} text-sm font-semibold text-white`}
                >
                  {activeConversation.initials}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {activeConversation.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <span
                      className={`h-2 w-2 rounded-full ${activeConversation.online
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                        }`}
                    />
                    {activeConversation.online ? 'Available' : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  title="Audio call (coming soon)"
                  className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
                >
                  <Phone size={19} />
                </button>
                <button
                  title="Video call (coming soon)"
                  className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
                >
                  <Video size={20} />
                </button>
                <button
                  title="Notifications"
                  className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
                >
                  <Bell size={19} />
                </button>
                <button
                  title="More options"
                  className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-400">
                  Today
                </span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              {messagesLoading && (
                <p className="text-center text-sm text-slate-400">
                  Loading messages...
                </p>
              )}

              {messagesError && (
                <p className="text-center text-sm text-red-500">
                  {messagesError}
                </p>
              )}

              {activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-2.5 ${message.mine ? 'justify-end' : 'justify-start'
                    }`}
                >
                  {!message.mine && (
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${activeConversation.color} text-[10px] font-semibold text-white`}
                    >
                      {activeConversation.initials}
                    </div>
                  )}

                  <div
                    className={`flex max-w-[75%] flex-col ${message.mine ? 'items-end' : 'items-start'
                      }`}
                  >
                    <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-medium text-slate-600">
                        {message.mine ? 'You' : message.sender}
                      </span>
                      <span>{message.time}</span>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.mine
                        ? 'rounded-br-md bg-violet-600 text-white'
                        : 'rounded-bl-md bg-slate-100 text-slate-700'
                        }`}
                    >
                      {message.text}
                    </div>
                    {message.mine && (
                      <span className="mt-1 text-violet-500">
                        <CheckCheck size={14} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 px-6 pb-5 pt-2">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  sendMessage()
                }}
                className="rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100"
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder={`Message ${activeConversation.name}`}
                  rows={2}
                  className="block max-h-32 min-h-16 w-full resize-y bg-transparent px-4 py-3 text-sm outline-none placeholder:text-slate-400"
                />

                <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Attach file (coming soon)"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button
                      type="button"
                      title="Emoji (coming soon)"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <Smile size={18} />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                    <Send size={15} />
                  </button>
                </div>
              </form>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                Press Enter to send · Shift + Enter for a new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Select a conversation to get started.
          </div>
        )}
      </main>
    </div>
  )
}

export default App
