import { CliffAdapterResult, Protocol, SectionV2 } from "../types/adapters";
import { queryCustom } from "../utils/queries";
import { readableToSeconds } from "../utils/time";

const liquidityRewards = async (): Promise<CliffAdapterResult[]> => {
  const data = await queryCustom(`
     SELECT
      toStartOfDay(timestamp) AS date,
      SUM(reinterpretAsUInt256(reverse(unhex(substring(data, 3, 64))))) / 1e18 AS amount
  FROM evm_indexer.logs
  PREWHERE short_address = '0x9040e41e' AND short_topic0 = '0x72d2511a'
  WHERE address in ('0x9040e41ef5e8b281535a96d9a48acb8cfabd9a48')
    AND topic0 = '0x72d2511ac7dd6d1171d9b798c2662417660eb70235ed1b47dfe9a015929cdf40'
    AND timestamp >= toDateTime('2022-11-15')
  GROUP BY date
  ORDER BY date DESC
  `, {});

  const result: CliffAdapterResult[] = [];
  for (let i = 0; i < data.length; i++) {
    result.push({
      type: "cliff",
      start: readableToSeconds(data[i].date),
      amount: Number(data[i].amount),
      isUnlock: false,
    });
  }
  return result;
};

const referralRewards = async (): Promise<CliffAdapterResult[]> => {
  const data = await queryCustom(`
    SELECT
      toStartOfDay(timestamp) AS date,
      SUM(reinterpretAsUInt256(reverse(unhex(substring(data, 131, 64))))) / 1e18 AS amount
  FROM evm_indexer.logs
  PREWHERE short_address = '0xe50b2cea' AND short_topic0 = '0x18bdb6ad'
  WHERE address in ('0xe50b2ceac4f60e840ae513924033e753e2366487')
    AND topic0 = '0x18bdb6adb84039f917775d1fb8e7b7e7737ad5915d12eef0e4654b85e18d07b4'
    AND timestamp >= toDateTime('2022-11-15')
  GROUP BY date
  ORDER BY date DESC
  `, {});

  const result: CliffAdapterResult[] = [];
  for (let i = 0; i < data.length; i++) {
    result.push({
      type: "cliff",
      start: readableToSeconds(data[i].date),
      amount: Number(data[i].amount),
      isUnlock: false,
    });
  }
  return result;
};

const incentives: SectionV2 = {
  methodology: "Incentives are distributed through the referral program and liquidity mining. We used event logs to calculate the total amount distributed.",
  isIncentive: true,
  components: [{
    id: "referral-rewards",
    name: "Referral Rewards",
    methodology: "Tracks Claimed events from the Across Merkle Distributor contract",
    isIncentive: true,
    fetch: referralRewards,
  },
    {
      id: "liquidity-rewards",
      isIncentive: true,
      methodology: "Tracks RewardsWithdrawn events from the Across Accelerating Distributor contract",
      name: "Liquidity Rewards",
      fetch: liquidityRewards,
    },
  ]
}

const across: Protocol = {
  "Incentives": incentives,
  meta: {
    notes: [
      `Incentives include referral and liquidity rewards.`,
    ],
    token: "ethereum:0x44108f0223a3c3028f5fe7aec7f9bb2e66bef82f",
    sources: [
      `https://medium.com/across-protocol/happy-birthday-across-to-we-got-you-something-11dbef976d6a`,
      "https://etherscan.io/address/0x9040e41ef5e8b281535a96d9a48acb8cfabd9a48",
      "https://etherscan.io/address/0xe50b2ceac4f60e840ae513924033e753e2366487"
    ],
    version: 2,
    protocolIds: ["1207"],
    incentivesOnly: true
  },
  categories: {
    farming: ["Referral Rewards", "Liquidity Rewards"],
  },
};

export default across;
