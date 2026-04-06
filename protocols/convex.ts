import { manualCliff, manualLinear } from "../adapters/manual";
import { CliffAdapterResult, ProtocolV2, SectionV2 } from "../types/adapters";
import { queryCustom } from "../utils/queries";
import { periodToSeconds, readableToSeconds } from "../utils/time";

const deployTime = 1621292400;
const chain: any = "ethereum";
const CVX: string = "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b";
const DEPLOYER = "0x947b7742c403f20e5faccdac5e092c943e7d0277";
const TREASURY_ADDRESS = "0x1389388d01708118b497f59521f6943be2541bb7";
const MASTERCHEF = "0x5f465e9fcffc217c5849906216581a657cd60605";
const CHEF_REWARD_HOOK = "0x973c2f122dbfa2867e6f7a05d329414bff43eaea";
const CVX_DISTRIBUTION = "0x449f2fd99174e1785cf2a1c79e665fec3dd1ddc6";
const REWARD_PAID_TOPIC = "0xe2403640ba68fed3a2f88b7557551d1993f84b99bb10ff833f0cf8db0c5e0486";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_TOPIC = "0x0000000000000000000000000000000000000000000000000000000000000000";
const DEPLOYER_TOPIC = `0x000000000000000000000000${DEPLOYER.substring(2).toLowerCase()}`;
const TREASURY_TOPIC = `0x000000000000000000000000${TREASURY_ADDRESS.substring(2).toLowerCase()}`;
const MASTERCHEF_FROM_TOPIC = `0x000000000000000000000000${MASTERCHEF.substring(2)}`;
const CHEF_HOOK_TOPIC = `0x000000000000000000000000${CHEF_REWARD_HOOK.substring(2)}`;

// Curve LP rewards: CVX minted pro-rata for CRV claimed (excluding deployer pre-mint)
const curveLpRewards = async (): Promise<CliffAdapterResult[]> => {
  const data = await queryCustom(`
    SELECT
      toStartOfDay(timestamp) AS date,
      SUM(reinterpretAsUInt256(reverse(unhex(substring(data, 3))))) / 1e18 AS amount
    FROM evm_indexer.logs
    PREWHERE short_address = '${CVX.slice(0, 10)}' AND short_topic0 = '${TRANSFER_TOPIC.slice(0, 10)}'
    WHERE address = '${CVX}'
      AND topic0 = '${TRANSFER_TOPIC}'
      AND topic1 = '${ZERO_TOPIC}'
      AND topic2 != '${DEPLOYER_TOPIC}'
    GROUP BY date
    ORDER BY date ASC
  `, {});

  return data.map((d: any) => ({
    type: "cliff" as const,
    start: readableToSeconds(d.date),
    amount: Number(d.amount),
  }));
};

// Staking: CVX distributed to cvxCRV stakers via CvxDistribution (excl treasury)
const stakingRewards = async (): Promise<CliffAdapterResult[]> => {
  const data = await queryCustom(`
    SELECT
      toStartOfDay(timestamp) AS date,
      SUM(reinterpretAsUInt256(reverse(unhex(substring(data, 3))))) / 1e18 AS amount
    FROM evm_indexer.logs
    PREWHERE short_address = '${CVX_DISTRIBUTION.slice(0, 10)}' AND short_topic0 = '${REWARD_PAID_TOPIC.slice(0, 10)}'
    WHERE address = '${CVX_DISTRIBUTION}'
      AND topic0 = '${REWARD_PAID_TOPIC}'
      AND topic1 != '${TREASURY_TOPIC}'
    GROUP BY date
    ORDER BY date ASC
  `, {});

  return data.map((d: any) => ({
    type: "cliff" as const,
    start: readableToSeconds(d.date),
    amount: Number(d.amount),
  }));
};

// MasterChef LP farming: CVX distributed from MasterChef (excluding ChefRewardHook)
const masterchefFarming = async (): Promise<CliffAdapterResult[]> => {
  const data = await queryCustom(`
    SELECT
      toStartOfDay(timestamp) AS date,
      SUM(reinterpretAsUInt256(reverse(unhex(substring(data, 3))))) / 1e18 AS amount
    FROM evm_indexer.logs
    PREWHERE short_address = '${CVX.slice(0, 10)}' AND short_topic0 = '${TRANSFER_TOPIC.slice(0, 10)}'
    WHERE address = '${CVX}'
      AND topic0 = '${TRANSFER_TOPIC}'
      AND topic1 = '${MASTERCHEF_FROM_TOPIC}'
      AND topic2 != '${CHEF_HOOK_TOPIC}'
    GROUP BY date
    ORDER BY date ASC
  `, {});

  return data.map((d: any) => ({
    type: "cliff" as const,
    start: readableToSeconds(d.date),
    amount: Number(d.amount),
  }));
};


// Treasury distributions: CVX transfers from treasury (excluding MasterChef recycling)
const treasuryDistributions = async (): Promise<CliffAdapterResult[]> => {
  const data = await queryCustom(`
    SELECT
      toStartOfDay(timestamp) AS date,
      SUM(reinterpretAsUInt256(reverse(unhex(substring(data, 3))))) / 1e18 AS amount
    FROM evm_indexer.logs
    PREWHERE short_address = '${CVX.slice(0, 10)}' AND short_topic0 = '${TRANSFER_TOPIC.slice(0, 10)}'
    WHERE address = '${CVX}'
      AND topic0 = '${TRANSFER_TOPIC}'
      AND topic1 = '${TREASURY_TOPIC}'
      AND topic2 != '${MASTERCHEF_FROM_TOPIC}'
    GROUP BY date
    ORDER BY date ASC
  `, {});

  return data.map((d: any) => ({
    type: "cliff" as const,
    start: readableToSeconds(d.date),
    amount: Number(d.amount),
  }));
};

const curveLpSection: SectionV2 = {
  displayName: "Curve LP Rewards",
  methodology: "CVX minted pro-rata for CRV claimed by Curve LPs on Convex (50% allocation)",
  isIncentive: true,
  components: [
    {
      id: "curve-lp-mints",
      name: "Curve LP Reward Mints",
      methodology: "Tracks CVX minted (Transfer from 0x0) when Curve LPs claim CRV rewards through Convex's Booster.",
      isIncentive: true,
      fetch: curveLpRewards,
      metadata: {
        contract: CVX,
        chain: "ethereum",
        chainId: "1",
        eventSignature: TRANSFER_TOPIC,
      },
    },
  ],
};

const stakingSection: SectionV2 = {
  displayName: "Staking Rewards",
  methodology: "Tracks CVX rewards distributed to token holders through staking",
  isIncentive: false,
  components: [
    {
      id: "staking-rewards",
      name: "cvxCRV Staking Rewards",
      methodology: "Tracks RewardPaid events from cvxCRV staking contract, excluding rewards sent to treasury. These rewards go to token holders who stake their cvxCRV.",
      isIncentive: false,
      fetch: stakingRewards,
      metadata: {
        contract: CVX_DISTRIBUTION,
        chain: "ethereum",
        chainId: "1",
        eventSignature: REWARD_PAID_TOPIC,
      },
    },
  ],
};

const farmingSection: SectionV2 = {
  displayName: "Farming Incentives",
  methodology: "CVX incentives distributed to LPs and external parties via MasterChef and Treasury",
  isIncentive: true,
  components: [
    {
      id: "masterchef-farming",
      name: "MasterChef LP Farming",
      methodology: "Tracks CVX transfers from MasterChef to LP farmers, excluding ChefRewardHook which routes to CvxDistribution staking.",
      isIncentive: true,
      fetch: masterchefFarming,
      metadata: {
        contract: CVX,
        masterchef: MASTERCHEF,
        chain: "ethereum",
        chainId: "1",
        eventSignature: TRANSFER_TOPIC,
      },
    },
    {
      id: "treasury-distributions",
      name: "Treasury Distributions",
      methodology: "Tracks CVX transfers from treasury to external addresses, excluding Masterchef recycling. These go to LPs, partners, and other non-token-holder recipients.",
      isIncentive: true,
      fetch: treasuryDistributions,
      metadata: {
        contract: CVX,
        treasury: TREASURY_ADDRESS,
        chain: "ethereum",
        chainId: "1",
        eventSignature: TRANSFER_TOPIC,
      },
    },
  ],
};

const convex: ProtocolV2 = {
  "Curve LP Rewards": curveLpSection,
  "Staking Rewards": stakingSection,
  "Farming Incentives": farmingSection,
  Investors: manualLinear(
    deployTime,
    deployTime + periodToSeconds.year,
    3300000,
  ),
  Team: manualLinear(deployTime, deployTime + periodToSeconds.year, 10000000),
  "veCRV voters": manualCliff(deployTime, 1000000),
  "veCRV holders": manualCliff(deployTime, 1000000),
  meta: {
    version: 2,
    sources: [
      "https://docs.convexfinance.com/convexfinance/general-information/tokenomics",
      "https://docs.convexfinance.com/convexfinance/faq/contract-addresses"
    ],
    token: `${chain}:${CVX}`,
    protocolIds: ["319"],
    total: 100_000_000,
    notes: [
      "Curve LP rewards (50%) tracked via CVX mint events from zero address",
    ],
  },
  categories: {
    airdrop: ["veCRV voters","veCRV holders"],
    staking: ["Staking Rewards"],
    farming: ["Curve LP Rewards", "Farming Incentives"],
    privateSale: ["Investors"],
    insiders: ["Team"],
  },
};

export default convex;
