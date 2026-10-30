"use client";
import { useEffect, useRef, useState } from "react";
import { pickQuizRound, type QuizQuestion } from "@/lib/trading-quiz";
import "./trading-quiz.css";
const HISTORY_KEY = "fc-trading-quiz-recent-v1";
export function TradingQuiz() {
  const [round, setRound] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [done, setDone] = useState(false);
  const recent = useRef<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  function start(focus = false) {
    const next = pickQuizRound(recent.current);
    recent.current = [...recent.current, ...next.map((q) => q.id)].slice(-15);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(recent.current));
    } catch {
      /* Quiz still works when storage is unavailable. */
    }
    setRound(next);
    setIndex(0);
    setAnswer(null);
    setScore(0);
    setSkipped(0);
    setDone(false);
    if (focus) requestAnimationFrame(() => heading.current?.focus());
  }
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(saved))
        recent.current = saved
          .filter((id: unknown) => typeof id === "string")
          .slice(-15);
    } catch {
      /* Ignore invalid or unavailable local history. */
    }
    start();
  }, []);
  function advance() {
    if (answer === null) setSkipped((v) => v + 1);
    if (index === 4) setDone(true);
    else setIndex((v) => v + 1);
    setAnswer(null);
    requestAnimationFrame(() => heading.current?.focus());
  }
  const question = round[index];
  return (
    <section
      id="trading-quiz"
      className="section container tq-section"
      aria-labelledby="quiz-title"
    >
      <div className="tq-intro">
        <p className="eyebrow">A FRESH PERSPECTIVE</p>
        <h2 id="quiz-title">
          Test your{" "}
          <br />
          trading knowledge<span>.</span>
        </h2>
        <p>
          Five questions. Three choices.
          <br />
          How well do you know the markets?
        </p>
        <div className="tq-decoration" aria-hidden="true">
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </div>
        <small>BEGINNER → INTERMEDIATE</small>
      </div>
      <div className="tq-card" aria-busy={!question}>
        {!question ? (
          <p role="status">Preparing your questions…</p>
        ) : done ? (
          <div className="tq-result">
            <p className="eyebrow">ROUND COMPLETE</p>
            <h3 ref={heading} tabIndex={-1}>
              A new perspective, unlocked.
            </h3>
            <p className="tq-score">
              {score}
              <span> / 5 correct</span>
            </p>
            <p>
              {skipped > 0
                ? `${skipped} ${skipped === 1 ? "question" : "questions"} skipped.`
                : "Thanks for taking part."}
            </p>
            <button className="button primary" onClick={() => start(true)}>
              Try another round ↗
            </button>
          </div>
        ) : (
          <>
            <div className="tq-meta">
              <span>{question.topic}</span>
              <span>QUESTION {index + 1} / 5</span>
            </div>
            <div
              className="tq-progress"
              aria-label={`Question ${index + 1} of 5`}
            >
              {round.map((q, i) => (
                <span key={q.id} className={i <= index ? "active" : ""} />
              ))}
            </div>
            <h3 ref={heading} tabIndex={-1} className="tq-question">
              {question.question}
            </h3>
            <div
              className="tq-options"
              role="group"
              aria-label="Answer choices"
            >
              {question.options.map((option, i) => {
                const correct = answer !== null && i === question.correct;
                const wrong = answer === i && i !== question.correct;
                return (
                  <button
                    key={question.id + i}
                    className={
                      "tq-option" +
                      (correct ? " correct" : wrong ? " wrong" : "")
                    }
                    aria-disabled={answer !== null}
                    onClick={() => {
                      if (answer !== null) return;
                      setAnswer(i);
                      if (i === question.correct) setScore((v) => v + 1);
                    }}
                  >
                    <span className="tq-letter">{"ABC"[i]}</span>
                    <span>{option}</span>
                    {correct ? (
                      <strong>✓ Correct</strong>
                    ) : wrong ? (
                      <strong>× Your answer</strong>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="tq-feedback" role="status" aria-live="polite">
              {answer !== null
                ? answer === question.correct
                  ? "Correct — nicely done."
                  : `Not quite. The correct answer is ${"ABC"[question.correct]}.`
                : "Choose your answer."}
            </div>
            <div className="tq-actions">
              <span>{score} correct this round</span>
              <button
                className={
                  "button " + (answer === null ? "secondary" : "primary")
                }
                onClick={advance}
              >
                {answer === null
                  ? "Skip question"
                  : index === 4
                    ? "See results"
                    : "Next question"}{" "}
                →
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
