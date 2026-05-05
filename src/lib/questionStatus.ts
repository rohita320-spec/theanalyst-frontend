import type { FeedQuestion } from "./api";

export type QuestionViewStatus = "open" | "closed" | "resolved" | "draft";

export function getQuestionViewStatus(question: FeedQuestion): QuestionViewStatus {
  if ((question.status as string) === "draft") {
    return "draft";
  }
  if (question.status === "resolved" || question.closed_reason === "cancelled") {
    return "resolved";
  }
  if (question.status === "closed") {
    return "closed";
  }
  return "open";
}
