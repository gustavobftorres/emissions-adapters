import { manualCliff, manualLinear } from "../adapters/manual";
import { Protocol } from "../types/adapters";
import { queryDuneSQLCached } from "../utils/dune";
import { periodToSeconds } from "../utils/time";

const start: number = 1587510000;
const qty: number = 1e9;

function staking() {
  return queryDuneSQLCached(`
  SELECT date, amount FROM (
    SELECT
     to_unixtime(date) as date,
     (CAST(MAX(total_supply) AS DOUBLE) - CAST(LAG(MAX(total_supply)) OVER (ORDER BY date) AS DOUBLE)) / 1e24 as amount
    FROM near.block_chunks
    WHERE date >= date_add('day', -1, START)
    GROUP BY date
    ORDER BY date
  ) WHERE amount IS NOT NULL AND date >= ${start}
 `, start, { protocolSlug: "near", allocation: "Staking Rewards"})
}


const near: Protocol = {
  "Core Team": [
    manualCliff(start + periodToSeconds.year, qty * 0.14 * 0.25),
    manualLinear(
      start + periodToSeconds.year,
      start + periodToSeconds.year * 4,
      qty * 0.14 * 0.75,
    ),
  ],
  "Prior Backers 12m": manualLinear(
    start,
    start + periodToSeconds.year * 2,
    6259859,
  ),
  "Prior Backers 24m": manualLinear(
    start,
    start + periodToSeconds.year * 2,
    154642000,
  ),
  "Prior Backers 36m": manualLinear(
    start,
    start + periodToSeconds.year * 2,
    75733949,
  ),
  "Community Sale": [
    manualCliff(start, 25e6),
    manualLinear(start, start + periodToSeconds.month * 18, qty * 0.12 - 25e6),
  ],
  "Early Ecosystem": manualLinear(
    start,
    start + periodToSeconds.month * 6,
    3e7,
  ),
  "Early Ecosystem (Unlocked)": manualCliff(start, 8e7),
  "Early Ecosystem (Other)": manualLinear(
    start,
    start + periodToSeconds.year,
    7e6,
  ),
  "Foundation Endowment": [
    manualCliff(start, qty * 0.05),
    manualLinear(start, start + periodToSeconds.year * 2, qty * 0.05),
  ],
  "Community Grants": manualLinear(
    start,
    start + periodToSeconds.year * 5,
    172364192,
  ),
  "Operations Grants": manualLinear(
    start,
    start + periodToSeconds.year * 5,
    qty * 0.114,
  ),
  "Staking Rewards": staking,
  meta: {
    notes: [
      `Community Sale tokens have a 12 to 24 month lockup. Here we have taken an average of 18 months lock up.`,
      `Early Ecosystem (Unlocked) represents ~80M tokens provisioned for an unannounced distribution program. Early Ecosystem (Other) covers ~7M in miscellaneous grants with short lockups.`,
    ],
    sources: [`https://near.org/blog/near-token-supply-and-distribution`],
    token: `coingecko:near`,
    protocolIds: ["3221"],
  },
  categories: {
    insiders: ["Core Team"],
    privateSale: ["Prior Backers 12m", "Prior Backers 24m", "Prior Backers 36m"],
    publicSale: ["Community Sale"],
    staking: ["Staking Rewards"],
    farming: [
      "Community Grants",
      "Early Ecosystem",
      "Early Ecosystem (Unlocked)",
      "Early Ecosystem (Other)",
    ],
    noncirculating: ["Foundation Endowment", "Operations Grants"],
  },
};
export default near;
