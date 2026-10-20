export type CoachTurn = {
  id: number;
  role: 'user' | 'coach';
  content: string;
  status?: string;
  streaming?: boolean;
  incomplete?: boolean;
};

export const startCoachTurn = (turns: CoachTurn[], question: string, userId: number, coachId: number): CoachTurn[] => [
  ...turns,
  { id: userId, role: 'user', content: question },
  { id: coachId, role: 'coach', content: '', status: 'Reviewing your training…', streaming: true },
];

export const retryCoachTurn = (turns: CoachTurn[], coachId: number): CoachTurn[] => turns.map((turn) =>
  turn.id === coachId ? { ...turn, content: '', status: 'Reviewing your training…', streaming: true, incomplete: false } : turn);

export const updateCoachTurn = (turns: CoachTurn[], coachId: number, update: Partial<CoachTurn> & { delta?: string }): CoachTurn[] => turns.map((turn) => {
  if (turn.id !== coachId) return turn;
  const { delta, ...fields } = update;
  return { ...turn, ...fields, content: delta === undefined ? turn.content : `${turn.content}${delta}` };
});

export const shouldSubmitCoachOnEnter = (event: { key: string; shiftKey: boolean; isComposing?: boolean; nativeEvent?: { isComposing?: boolean } }, coarsePointer: boolean): boolean =>
  event.key === 'Enter' && !event.shiftKey && !event.isComposing && !event.nativeEvent?.isComposing && !coarsePointer;
