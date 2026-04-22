import type { FeedQuestion } from "./api";

export type QuestionViewStatus = "open" | "closed" | "resolved";

export function getQuestionViewStatus(question: FeedQuestion): QuestionViewStatus {
  if (question.status === "resolved" || question.closed_reason === "cancelled") {
    return "resolved";
  }
  if (question.status === "closed") {
    return "closed";
  }
  return "open";
}
