import { LinearAdapterResult, Protocol, CliffAdapterResult } from "../types/adapters";
import { manualCliff, manualLinear } from "../adapters/manual";
import { periodToSeconds } from "../utils/time";
import { queryDune } from "../utils/dune";

const mainnet = 1585008000; // March 24, 2020
const inflationStart = 1612915200; // February 10, 2021

const seed = 79_290_466;
const founding = 63_151_982;
const validator = 25_331_653;
const strategic = 9_175_520;
const coinlist = 8_000_000;
const team = 62_495_003;
const foundation = 51_110_131;
const community = 190_024_515;

const DUNE_QUERY_ID = "5166082";

// Fetch past staking rewards from Dune and return both data and the last timestamp
const stakingRewardsDune = async (): Promise<{ data: CliffAdapterResult[]; lastTimestamp: number }> => {
  const duneData = await queryDune(DUNE_QUERY_ID, true);
  // Dune returns { timestamp: epoch seconds, sol_reward: number }
  const filtered = duneData.map((row: any) => ({
    type: "cliff",
    start: Number(row.timestamp),
    amount: Number(row.sol_reward),
    isUnlock: false,
    isForecast: false,
  }));
  const lastTimestamp = Math.max(...duneData.map((row: any) => Number(row.timestamp)));
  return { data: filtered, lastTimestamp };
};

// Forecast future staking rewards, starting after last Dune timestamp
function stakingRewardsForecast(splitTimestamp: number): LinearAdapterResult[] {
  const sections: LinearAdapterResult[] = [];
  const initialSupply = 488_579_270;
  const disinflationRate = 0.15;
  let inflationRate = 8;
  let start = inflationStart;
  let total = initialSupply;

  // Simulate inflation up to splitTimestamp
  while (start <= splitTimestamp) {
    const amount = total * (inflationRate / (12 * 100));
    total += amount;
    start += periodToSeconds.month;
    inflationRate *= (1 - disinflationRate) ** (1 / 12);
  }

  // Forecast from after splitTimestamp until terminal rate
  while (inflationRate > 1.5) {
    const amount = total * (inflationRate / (12 * 100));
    sections.push({
      type: "linear",
      start,
      end: start + periodToSeconds.month,
      amount,
      isForecast: true,
    });
    total += amount;
    start += periodToSeconds.month;
    inflationRate *= (1 - disinflationRate) ** (1 / 12);
  }
  return sections;
}

const stakingRewards = async (): Promise<(CliffAdapterResult | LinearAdapterResult)[]> => {
  const { data, lastTimestamp } = await stakingRewardsDune();
  return [
    ...data,
    ...stakingRewardsForecast(lastTimestamp),
  ];
};

const solana: Protocol = {
  "Seed Sale": manualCliff("2021-01-07", seed),
  "Founding Sale": manualCliff("2021-01-07", founding),
  "Validator Sale": manualCliff("2021-01-07", validator),
  "Strategic Sale": manualCliff("2021-01-07", strategic),
  "CoinList Auction": manualCliff(mainnet, coinlist),
  Community: [
    manualLinear("2020-03-01", "2021-01-01", community * 0.13),
    manualCliff("2021-01-07", community * 0.87),
  ],
  Foundation: [
    manualCliff(mainnet, foundation * 0.005),
    manualCliff("2021-01-07", foundation * 0.995),
  ],
  Team: [
    manualCliff("2021-01-07", team * 0.5),
    manualLinear(
      "2021-01-07",
      "2023-01-07",
      team * 0.5,
    ),
  ],
  "Staking Rewards": stakingRewards,
  meta: {
    sources: [
      "https://www.binance.com/en/research/projects/solana",
      "https://solana.com/news/solana-foundation-transparency-reports",
      "https://coinlist.co/solana",
      "https://docs.solana.com/inflation/inflation_schedule",
      "https://dune.com/queries/5166082",
    ],
    token: "coingecko:solana",
    protocolIds: ["4611"],
    chain: "solana",
    notes: [
      `Past staking rewards are fetched from Dune, the rest is forecasted after the last Dune data point at an 8% initial rate reducing by 15% per year until 1.5% terminal rate`,
      `Burns are not modelled`
    ]
  },
  categories: {
    publicSale: ["CoinList Auction"],
    staking: ["Staking Rewards"],
    farming: ["Community"],
    noncirculating: ["Foundation"],
    privateSale: ["Seed Sale", "Strategic Sale", "Founding Sale", "Validator Sale"],
    insiders: ["Team"],
  },
};
export default solana;
