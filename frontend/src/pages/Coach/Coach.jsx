import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { coachService } from '../../services/coachService';
import { retryCoachTurn, shouldSubmitCoachOnEnter, startCoachTurn, updateCoachTurn } from '../../utils/coachConversation';

const suggestedQuestions = [
  'What should I train next?',
  'How has my bench changed?',
  'Summarize my recent workouts.',
];

function Coach() {
  const { logout } = useAuth();
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState(null);
  const [composerError, setComposerError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const nextIdRef = useRef(1);
  const controllerRef = useRef(null);
  const mountedRef = useRef(true);
  const conversationRef = useRef(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (stickToBottomRef.current && conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const updateTurn = (id, updates) => {
    if (mountedRef.current) setConversation((turns) => updateCoachTurn(turns, id, updates));
  };

  const submitQuestion = async (question, retry = null) => {
    if (controllerRef.current) return;
    const outgoing = (retry?.question || question || '').trim();
    if (!outgoing) {
      setComposerError('Enter a question for Coach.');
      return;
    }
    if (outgoing.length > 1000) {
      setComposerError('Keep your question under 1,000 characters.');
      return;
    }

    const coachId = retry?.coachId ?? nextIdRef.current + 1;
    if (retry) {
      setConversation((turns) => retryCoachTurn(turns, coachId));
    } else {
      const userId = nextIdRef.current;
      nextIdRef.current += 2;
      setConversation((turns) => startCoachTurn(turns, outgoing, userId, coachId));
      setMessage('');
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(true);
    setFailure(null);
    setComposerError('');
    setAnnouncement('');

    try {
      await coachService.streamCoachMessage({
        message: outgoing,
        signal: controller.signal,
        onEvent: (event) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          if (event.type === 'status') updateTurn(coachId, { status: event.message });
          if (event.type === 'text_delta') updateTurn(coachId, { delta: event.delta, status: '' });
          if (event.type === 'complete') {
            updateTurn(coachId, { streaming: false, status: '' });
            setAnnouncement('Coach response complete.');
          }
        },
      });
    } catch (error) {
      if (!mountedRef.current) return;
      if (error.response?.status === 401 || error.status === 401) {
        await logout();
        return;
      }
      updateTurn(coachId, { streaming: false, status: '', incomplete: true });
      setFailure({ coachId, question: outgoing });
      setAnnouncement(controller.signal.aborted ? 'Coach response cancelled.' : "Couldn't get a response.");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (mountedRef.current) setPending(false);
    }
  };

  const submitDraft = (event) => {
    event.preventDefault();
    void submitQuestion(message);
  };

  const handleComposerKeyDown = (event) => {
    if (shouldSubmitCoachOnEnter(event, window.matchMedia('(pointer: coarse)').matches)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const trackScroll = () => {
    const container = conversationRef.current;
    if (!container) return;
    stickToBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
  };

  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-4xl flex-col gap-6">
      <header className="border-b border-[#D2CFC7] pb-5">
        <h1 className="page-title mt-0">Coach</h1>
        <p className="page-copy">Ask about your workouts, progress, or program.</p>
      </header>

      <div ref={conversationRef} onScroll={trackScroll} role="log" aria-label="Coach conversation" aria-live="off" className="min-h-52 max-h-[55dvh] flex-1 space-y-6 overflow-y-auto overscroll-contain pr-1 sm:max-h-[62vh]">
        {conversation.length === 0 ? (
          <div className="space-y-5 py-6">
            <h2 className="text-xl font-semibold text-[#151714]">What would you like to know about your training?</h2>
            <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
              {suggestedQuestions.map((question) => <button key={question} type="button" className="btn-secondary text-left" disabled={pending} onClick={() => { void submitQuestion(question); }}>{question}</button>)}
            </div>
          </div>
        ) : conversation.map((turn) => (
          <article key={turn.id} className={`max-w-[min(100%,42rem)] rounded-lg px-4 py-3 sm:px-5 ${turn.role === 'user' ? 'ml-auto border border-[#D2CFC7] bg-[#E7E4DC]' : 'mr-auto border-l-2 border-[#2f4f46] bg-[#FAF9F6]'}`}>
            <h2 className="text-sm font-semibold text-[#4F534E]">{turn.role === 'user' ? 'You' : 'Coach'}</h2>
            {turn.content ? <p className="mt-2 whitespace-pre-wrap break-words text-base leading-7 text-[#151714]">{turn.content}</p> : <p className="mt-2 text-sm text-[#4F534E]">{turn.incomplete ? 'Response interrupted.' : turn.status || 'Reviewing your training…'}</p>}
            {turn.incomplete && turn.content && <p className="mt-2 text-sm text-[#62675f]">Incomplete response</p>}
            {failure?.coachId === turn.id && <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#D2CFC7] pt-3"><p className="text-sm text-[#8f3332]">Couldn't get a response.</p><button type="button" className="btn-secondary" disabled={pending} onClick={() => { void submitQuestion(failure.question, failure); }}>Retry</button></div>}
          </article>
        ))}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>

      <form onSubmit={submitDraft} className="border-t border-[#D2CFC7] pt-5">
        <label htmlFor="coach-message" className="block text-sm font-semibold text-[#151714]">Ask Coach</label>
        <div className="mt-2 rounded-lg border border-[#BDB8AD] bg-[#FAF9F6] p-2 focus-within:border-[#2f4f46] focus-within:ring-2 focus-within:ring-[#2f4f46]/15">
          <textarea id="coach-message" rows={3} maxLength={1000} placeholder="Ask about your training…" value={message} disabled={pending} onKeyDown={handleComposerKeyDown} onChange={(event) => { setMessage(event.target.value); setComposerError(''); }} className="w-full resize-y border-0 bg-transparent px-2 py-1 text-base leading-6 text-[#151714] outline-none focus:ring-0" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D2CFC7] px-1 pt-2">
            <span className="text-xs text-[#747872]">Send below, or press Enter on desktop. Shift+Enter adds a line.</span>
            <div className="flex gap-2">
              {pending && <button type="button" className="btn-secondary" onClick={() => controllerRef.current?.abort()}>Cancel</button>}
              <button type="submit" className="btn-primary" disabled={pending || !message.trim()}>{pending ? 'Reviewing…' : 'Send'}</button>
            </div>
          </div>
        </div>
        {composerError && <p role="alert" className="mt-2 text-sm text-[#8f3332]">{composerError}</p>}
      </form>
    </section>
  );
}

export default Coach;
