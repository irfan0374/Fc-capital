export type QuizQuestion = {
  id: string;
  topic: string;
  question: string;
  options: [string, string, string];
  correct: number;
};
export const quizQuestions: QuizQuestion[] = [
  {
    id: "spread",
    topic: "Trading costs",
    question: "What does the bid–ask spread represent?",
    options: [
      "The difference between the buying and selling quotes",
      "The total daily price movement",
      "The amount of margin in your account",
    ],
    correct: 0,
  },
  {
    id: "base",
    topic: "Currency pairs",
    question: "In EUR/USD, which currency is the base currency?",
    options: ["US dollar", "Euro", "Both currencies"],
    correct: 1,
  },
  {
    id: "quote",
    topic: "Currency pairs",
    question: "EUR/USD is quoted at 1.1000. What does this mean?",
    options: [
      "One US dollar buys 1.10 euros",
      "One euro buys 110 US dollars",
      "One euro is worth 1.10 US dollars",
    ],
    correct: 2,
  },
  {
    id: "long",
    topic: "Market direction",
    question: "Ignoring costs, when does a long position gain value?",
    options: [
      "When the market price rises",
      "When the market price falls",
      "Whenever volatility falls",
    ],
    correct: 0,
  },
  {
    id: "short",
    topic: "Market direction",
    question: "Ignoring costs, when does a short position gain value?",
    options: [
      "When the market price rises",
      "When the market price falls",
      "When the spread widens",
    ],
    correct: 1,
  },
  {
    id: "leverage",
    topic: "Leverage",
    question: "What can leverage magnify?",
    options: ["Profits only", "Losses only", "Both profits and losses"],
    correct: 2,
  },
  {
    id: "margin",
    topic: "Margin",
    question:
      "At 5% initial margin, how much margin is required for $10,000 of exposure?",
    options: ["$500", "$50", "$5,000"],
    correct: 0,
  },
  {
    id: "stop",
    topic: "Order types",
    question:
      "Does a standard, non-guaranteed stop-loss guarantee the exact exit price?",
    options: [
      "Yes, in every market",
      "No, execution may differ during gaps or fast markets",
      "Yes, if the position is small",
    ],
    correct: 1,
  },
  {
    id: "limit",
    topic: "Order types",
    question: "What does a buy limit order specify?",
    options: [
      "Buy at any available price",
      "Buy only above the limit price",
      "Buy at the limit price or lower",
    ],
    correct: 2,
  },
  {
    id: "market",
    topic: "Order types",
    question: "What does a market order prioritize?",
    options: [
      "Execution at the best available price",
      "A guaranteed exact price",
      "Execution only at the previous closing price",
    ],
    correct: 0,
  },
  {
    id: "slippage",
    topic: "Execution",
    question: "What is slippage?",
    options: [
      "A fee charged for every order",
      "A difference between the expected and actual execution price",
      "The distance between two moving averages",
    ],
    correct: 1,
  },
  {
    id: "size",
    topic: "Position sizing",
    question:
      "With the same instrument and price movement, doubling position size does what to profit or loss before costs?",
    options: ["Halves it", "Leaves it unchanged", "Doubles it"],
    correct: 2,
  },
  {
    id: "risk",
    topic: "Risk arithmetic",
    question: "What is 1% of a $5,000 account balance?",
    options: ["$50", "$500", "$5"],
    correct: 0,
  },
  {
    id: "reward",
    topic: "Risk and reward",
    question:
      "A trade risks $100 for a potential $200 profit. What is its risk-to-reward ratio?",
    options: ["2:1", "1:2", "1:1"],
    correct: 1,
  },
  {
    id: "volatility",
    topic: "Market behavior",
    question: "What does higher price volatility generally describe?",
    options: [
      "Guaranteed upward prices",
      "Lower trading costs",
      "Larger or more frequent price fluctuations",
    ],
    correct: 2,
  },
  {
    id: "equity",
    topic: "Account basics",
    question:
      "Ignoring other adjustments, balance plus unrealized profit or loss equals what?",
    options: ["Account equity", "The bid–ask spread", "Position size"],
    correct: 0,
  },
  {
    id: "correlation",
    topic: "Market relationships",
    question:
      "Two instruments with strong positive correlation tend to move how?",
    options: [
      "In opposite directions",
      "In the same direction",
      "At identical prices",
    ],
    correct: 1,
  },
  {
    id: "pip",
    topic: "Currency pairs",
    question:
      "For a pair where one pip is 0.0001, a move from 1.1000 to 1.1010 is how many pips?",
    options: ["1 pip", "100 pips", "10 pips"],
    correct: 2,
  },
  {
    id: "drawdown",
    topic: "Risk arithmetic",
    question:
      "An account falls from $1,000 to $900. What gain is needed to return to $1,000?",
    options: ["Approximately 11.1%", "Exactly 10%", "Exactly 9%"],
    correct: 0,
  },
  {
    id: "candle",
    topic: "Chart reading",
    question: "What does a standard candlestick show for its time period?",
    options: [
      "Only trading volume",
      "Open, high, low, and close prices",
      "Only the opening and closing prices",
    ],
    correct: 1,
  },
];
export function pickQuizRound(
  recent: string[],
  random = Math.random,
): QuizQuestion[] {
  const shuffled = [...quizQuestions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return [
    ...shuffled.filter((q) => !recent.includes(q.id)),
    ...shuffled.filter((q) => recent.includes(q.id)),
  ].slice(0, 5);
}
