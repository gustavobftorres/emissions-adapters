import { Protocol } from "../types/adapters";
import { manualCliff, manualLinear } from "../adapters/manual";
import { balance, latest } from "../adapters/balance";

const token = "0xba100000625a3754423978a60c9317c58a424e3D";
const chain = "ethereum";

const WEEK = 7 * 24 * 60 * 60;
const weekly = (start: number, end: number, balPerWeek: number) =>
  manualLinear(start, end, (balPerWeek * (end - start)) / WEEK);

const toUnix = (d: Date) => Math.floor(d.getTime() / 1000);

function annualBoundaries(startBoundary: Date, yearsAhead: number): number[] {
  const out: number[] = [toUnix(startBoundary)];
  for (let i = 1; i <= yearsAhead; i++) {
    const d = new Date(startBoundary);
    d.setUTCFullYear(d.getUTCFullYear() + i);
    out.push(toUnix(d));
  }
  return out;
}

function buildVeBALSections(opts: {
  preStart: Date;             // e.g. 2020-06-01T00:00:00Z
  firstReduction: Date;       // e.g. 2023-03-28T00:00:00Z
  preWeekly: number;          // e.g. 145_000
  annualCoefficient: number;  // e.g. 1.189
  yearsAhead: number;         // how many annual steps to generate
  firstPostWeekly?: number;   // optional exact weekly for year #1 (e.g. 121_930)
}) {
  const { preStart, firstReduction, preWeekly, annualCoefficient, yearsAhead, firstPostWeekly } = opts;

  const sections: ReturnType<typeof manualLinear>[] = [];

  // Pre-reduction era
  const preStartTs = toUnix(preStart);
  const firstRedTs = toUnix(firstReduction);
  sections.push(weekly(preStartTs, firstRedTs, preWeekly));

  // Post-reduction eras (auto)
  const bounds = annualBoundaries(firstReduction, yearsAhead); // [year0, year1, ..., yearN]
  let wk = (firstPostWeekly ?? (preWeekly / annualCoefficient));

  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i];
    const end = bounds[i + 1];
    sections.push(weekly(start, end, wk));
    wk = wk / annualCoefficient; // next year's weekly
  }

  return sections;
}

// Start of BAL incentives (v1 fixed weekly era)
const V1_START = 1590969600; // 2020-06-01 00:00:00 UTC
const V1_START_DATE = new Date("2020-06-01T00:00:00Z");

const FIRST_REDUCTION_DATE = new Date("2023-03-28T00:00:00Z");

const WEEKLY_V1 = 145_000;     // pre-reduction weekly
const FIRST_POST_WEEKLY = 121_930; // exact weekly communicated for first year post-reduction
const RATE_REDUCTION_COEFFICIENT = 1.189;

const veBALAuto = buildVeBALSections({
  preStart: V1_START_DATE,
  firstReduction: FIRST_REDUCTION_DATE,
  preWeekly: WEEKLY_V1,
  annualCoefficient: RATE_REDUCTION_COEFFICIENT,
  yearsAhead: 30,
  firstPostWeekly: FIRST_POST_WEEKLY, // seed exact known step
});

const total = 100_000_000;
const balanceSection = (address: string, deployed: number, backfill: boolean) =>
  balance([address], token, chain, "balancer", deployed, backfill);

const balancer: Protocol = {

  "LP & voting incentives (veBAL)": [
    weekly(V1_START, Math.floor(FIRST_REDUCTION_DATE.getTime() / 1000), WEEKLY_V1),
    ...veBALAuto.slice(1), // drop the duplicated pre-reduction segment from builder
  ],


  "Liquidity Providers (Vault balance tracker - informational)": (backfill: boolean) =>
    balanceSection("0xBA12222222228d8Ba445958a75a0704d566BF2C8", 1618876800, backfill),

  "Founders, Options, Advisors, Investors": manualCliff(
    1696118400,
    total * 0.225
  ),

  Ecosystem: (backfill: boolean) =>
    balanceSection("0x10A19e7eE7d7F8a52822f6817de8ea18204F2e4f", 1618272000, backfill),

  "Balancer Labs Fundraising Fund": (backfill: boolean) =>
    balanceSection("0xB129F73f1AFd3A49C701241F374dB17AE63B20Eb", 1604192400, backfill),

  "Balancer Labs Contributors Incentives Program": (backfill: boolean) =>
    balanceSection("0xCDcEBF1f28678eb4A1478403BA7f34C94F7dDBc5", 1592870400, backfill),

  // ========== Metadata ==========
  meta: {
    notes: [
      "Incentives reflect BAL distributed to users via veBAL (LP & voting).",
      "Weekly emissions reduce once per year by RATE_REDUCTION_COEFFICIENT (default 1.189, ~4-year halving).",
      "First post-reduction weekly seeded to 121,930 BAL/week; subsequent years derived programmatically.",
      "BIP-734 (v3) changes protocol fee splits but not BAL emissions; incentives here are token emissions.",
      "Total emitted by veBAL over the long run ≈ 47.5M BAL (per docs).",
    ],
    sources: [
      "https://docs-v2.balancer.fi/concepts/governance/bal-token.html#supply--inflation-schedule",
      "https://governance.aave.com/t/deploy-bal-abal-from-the-collector-contract/9747",
      "https://medium.com/balancer-protocol/bals-inflation-schedule-update-e9b4815222b0",
      "https://forum.balancer.fi/t/bip-734-balancer-v3-launch-and-protocol-enhancements/6168",
    ],
    token: "coingecko:balancer",
    protocolIds: ["116", "2611"],
    incompleteSections: [
      {
        key: "Liquidity Providers (Vault balance tracker - informational)",
        allocation: total * 0.65,
        lastRecord: (backfill: boolean) => latest("balancer", 1618876800, backfill),
      },
      {
        key: "Ecosystem",
        allocation: total * 0.05,
        lastRecord: (backfill: boolean) => latest("balancer", 1618272000, backfill),
      },
      {
        key: "Balancer Labs Fundraising Fund",
        allocation: total * 0.05,
        lastRecord: (backfill: boolean) => latest("balancer", 1604192400, backfill),
      },
      {
        key: "Balancer Labs Contributors Incentives Program",
        allocation: total * 0.025,
        lastRecord: (backfill: boolean) => latest("balancer", 1592870400, backfill),
      },
    ],
  },

  categories: {
    farming: ["LP & voting incentives (veBAL)"],
    noncirculating: ["Ecosystem"],
    privateSale: [
      "Balancer Labs Fundraising Fund",
      "Balancer Labs Contributors Incentives Program",
    ],
    insiders: ["Founders, Options, Advisors, Investors"],
  },
};

export default balancer;
