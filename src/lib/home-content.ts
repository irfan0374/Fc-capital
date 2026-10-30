export const instruments: Record<
  string,
  { symbol: string; name: string; type: string }[]
> = {
  Forex: [
    {
      symbol: "EUR/USD",
      name: "Euro / US Dollar",
      type: "Major currency pair",
    },
    {
      symbol: "GBP/USD",
      name: "British Pound / US Dollar",
      type: "Major currency pair",
    },
    {
      symbol: "USD/JPY",
      name: "US Dollar / Japanese Yen",
      type: "Major currency pair",
    },
  ],
  Indices: [
    { symbol: "US 500", name: "US large-cap index", type: "Index CFD" },
    { symbol: "US TECH", name: "US technology index", type: "Index CFD" },
    { symbol: "UK 100", name: "UK large-cap index", type: "Index CFD" },
  ],
  Commodities: [
    { symbol: "GOLD", name: "Gold / US Dollar", type: "Metal CFD" },
    { symbol: "SILVER", name: "Silver / US Dollar", type: "Metal CFD" },
    { symbol: "OIL", name: "Crude oil", type: "Energy CFD" },
  ],
};
