import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card } from "ts-fsrs";

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export type DbCardFields = {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
};

export function newCardFields(now: Date = new Date()): DbCardFields {
  const card = createEmptyCard(now);
  return toDbFields(card);
}

function toDbFields(card: Card): DbCardFields {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

function toFsrsCard(fields: DbCardFields): Card {
  return {
    due: fields.due,
    stability: fields.stability,
    difficulty: fields.difficulty,
    elapsed_days: fields.elapsedDays,
    scheduled_days: fields.scheduledDays,
    learning_steps: fields.learningSteps,
    reps: fields.reps,
    lapses: fields.lapses,
    state: fields.state as State,
    last_review: fields.lastReview ?? undefined,
  };
}

/** 答对/答错映射为 FSRS 的 Good/Again，简化四级评分为二元反馈。 */
export function nextCardFields(
  current: DbCardFields,
  correct: boolean,
  now: Date = new Date()
): DbCardFields {
  const rating = correct ? Rating.Good : Rating.Again;
  const { card } = scheduler.next(toFsrsCard(current), now, rating);
  return toDbFields(card);
}

export { State as FsrsState };
