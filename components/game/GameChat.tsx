'use client';

import { sendChatMessage, initChat } from '@/lib/gameSocketActions';
import { socket } from '@/lib/socket';
import type { ChatChannel, ChatMessage } from '@/models/game';
import { useEffect, useRef, useState } from 'react';

const CHANNEL_LABELS: Record<ChatChannel, string> = {
  village: 'Village Chat',
};

type Props = {
  lobbyName?: string;
  refreshKey: string;
  currentUserId?: string;
};

export default function GameChat({
  lobbyName,
  refreshKey,
  currentUserId,
}: Props) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [history, setHistory] = useState<Partial<Record<ChatChannel, ChatMessage[]>>>(
    {},
  );
  const [canSend, setCanSend] = useState<Partial<Record<ChatChannel, boolean>>>({});
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagePaneRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);

  useEffect(() => {
    if (!lobbyName) return;

    initChat(lobbyName, (response) => {
      if (!response?.ok || !response.chat) {
        setChannels([]);
        setCanSend({});
        setHistory({});
        setActiveChannel(null);
        return;
      }

      setChannels(response.chat.channels);
      setCanSend(response.chat.canSend ?? {});
      setHistory(response.chat.history ?? {});
      setActiveChannel((current) =>
        current && response.chat?.channels.includes(current)
          ? current
          : (response.chat?.channels[0] ?? null),
      );
    });
  }, [lobbyName, refreshKey]);

  useEffect(() => {
    const onChatMessage = (
      message: ChatMessage,
      callback?: (response: { ok: boolean }) => void,
    ) => {
      setHistory((current) => {
        const nextMessages = [...(current[message.channel] ?? []), message];
        return {
          ...current,
          [message.channel]: nextMessages,
        };
      });
      callback?.({ ok: true });
    };

    socket.on('chat:message', onChatMessage);
    return () => {
      socket.off('chat:message', onChatMessage);
    };
  }, []);

  const activeMessages = activeChannel ? history[activeChannel] ?? [] : [];
  const activeChannelCanSend = activeChannel ? canSend[activeChannel] === true : false;
  const helperText = error ?? '';

  useEffect(() => {
    const pane = messagePaneRef.current;
    if (!pane) return;
    if (shouldStickToBottomRef.current) {
      pane.scrollTop = pane.scrollHeight;
    }
  }, [activeChannel, activeMessages.length]);

  if (!lobbyName || channels.length === 0) {
    return null;
  }

  const submitMessage = () => {
    if (!lobbyName || !activeChannel) return;
    if (!activeChannelCanSend) return;

    const trimmedDraft = draft.trim();
    if (!trimmedDraft) return;

    sendChatMessage(lobbyName, activeChannel, trimmedDraft, (response) => {
      if (!response?.ok) {
        setError(response?.error ?? 'Unable to send message');
        return;
      }
      if (response.throttled) {
        setError('You are sending messages too quickly');
        return;
      }
      setDraft('');
      setError(null);
    });
  };

  return (
    <section className="fixed bottom-4 left-4 z-40 w-[min(92vw,24rem)] rounded-2xl border border-slate-800 bg-slate-950/92 p-3 text-left shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            {activeChannel ? CHANNEL_LABELS[activeChannel] : 'Village Chat'}
          </h2>
        </div>
        {channels.length > 1 ? (
          <div className="flex max-w-[10rem] flex-wrap justify-end gap-1">
            {channels.map((channel) => (
              <button
                key={channel}
                type="button"
                className={[
                  'rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors',
                  activeChannel === channel
                    ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                    : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500',
                ].join(' ')}
                onClick={() => {
                  setActiveChannel(channel);
                  setError(null);
                }}
              >
                {CHANNEL_LABELS[channel]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div
        ref={messagePaneRef}
        className="lobby-scroll mt-3 h-44 overflow-y-scroll pr-1"
        onScroll={(event) => {
          const pane = event.currentTarget;
          const distanceFromBottom =
            pane.scrollHeight - pane.scrollTop - pane.clientHeight;
          shouldStickToBottomRef.current = distanceFromBottom < 24;
        }}
      >
        <div className="flex min-h-full flex-col justify-end gap-2">
          {activeMessages.length > 0 ? (
            activeMessages.map((message) => (
              <article
                key={message.id}
                className={
                  message.userId === 'system' && message.tone === 'death'
                    ? 'w-full rounded-md border border-red-400/70 bg-red-700/30 px-2 py-1.5 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.12)]'
                    : 'border-b border-slate-800/70 pb-1 last:border-b-0'
                }
              >
                <div className="flex items-baseline gap-2">
                  {message.userId !== 'system' ? (
                    <p
                      className={[
                        'shrink-0 text-[11px] font-semibold',
                        message.audience === 'dead'
                          ? 'text-slate-500'
                          : message.audience === 'werewolf'
                            ? 'text-red-400'
                            : message.userId === currentUserId
                              ? 'text-sky-300'
                              : 'text-amber-300',
                      ].join(' ')}
                    >
                      {message.name}:
                    </p>
                  ) : null}
                  <p
                    className={[
                      'min-w-0 flex-1 whitespace-pre-wrap break-words text-xs leading-5',
                      message.userId === 'system'
                        ? message.tone === 'death'
                          ? 'font-semibold text-red-50'
                          : 'italic text-slate-400'
                        : 'text-slate-300',
                    ].join(' ')}
                  >
                    {message.content}
                  </p>
                  <p
                    className={[
                      'shrink-0 text-[10px]',
                      message.userId === 'system' && message.tone === 'death'
                        ? 'text-red-100/80'
                        : 'text-slate-500',
                    ].join(' ')}
                  >
                    {new Date(message.sentAt).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 px-3 py-5 text-center text-xs text-slate-500">
              No messages yet.
            </div>
          )}
        </div>
      </div>

      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          submitMessage();
        }}
      >
        <textarea
          value={draft}
          maxLength={300}
          rows={2}
          className={[
            'w-full resize-none rounded-lg border px-2.5 py-2 text-xs text-slate-100 outline-none transition-colors placeholder:text-slate-500',
            activeChannelCanSend
              ? 'border-slate-800 bg-slate-900/80 focus:border-amber-400/70'
              : 'cursor-not-allowed border-slate-900 bg-slate-950/80 text-slate-500',
          ].join(' ')}
          placeholder={`Message ${activeChannel ? CHANNEL_LABELS[activeChannel].toLowerCase() : 'chat'}...`}
          disabled={!activeChannelCanSend}
          onChange={(event) => {
            setDraft(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submitMessage();
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="max-w-[11rem] text-[10px] leading-4 text-slate-500">
            {helperText}
          </p>
          <button
            type="submit"
            disabled={!activeChannelCanSend}
            className={[
              'rounded-lg border px-3 py-2 text-xs font-semibold transition',
              activeChannelCanSend
                ? 'border-slate-700 bg-slate-800/80 text-white hover:bg-slate-800'
                : 'cursor-not-allowed border-slate-900 bg-slate-950 text-slate-500',
            ].join(' ')}
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
