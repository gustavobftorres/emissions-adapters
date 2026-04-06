import { Protocol, SectionV2 } from "../types/adapters";
import { manualCliff, manualStep } from "../adapters/manual";
import { periodToSeconds } from "../utils/time";

const total = 1e9;
const start = 1718841600;

const communityTBD: SectionV2 = {
  displayName: "Community Allocation (TBD)",
  isTBD: true,
  methodology:
    "The remaining 13.3% of Community Allocation and 4% of Tokens Repurchased have no defined unlock schedule.",
  components: [
    {
      id: "community-remaining",
      name: "Community Allocation (TBD)",
      methodology:
        "3.8% from Future Initiatives and 9.5% from Ecosystem and Growth with no defined unlock schedule",
      isTBD: true,
      fetch: async () => [manualCliff(start, total * 0.133)],
    },
    {
      id: "tokens-repurchased",
      name: "Tokens Repurchased",
      methodology:
        "4% of supply repurchased and pledged to community with no defined unlock schedule",
      isTBD: true,
      fetch: async () => [manualCliff(start, total * 0.04)],
    },
  ],
};

const zro: Protocol = {
  "Community Allocation": manualCliff(start, total * 0.25),
  "Core Contributors": manualStep(
    start + periodToSeconds.year,
    periodToSeconds.month,
    24,
    (total * 0.255) / 24,
  ),
  "Strategic Partners": manualStep(
    start + periodToSeconds.year,
    periodToSeconds.month,
    24,
    (total * 0.322) / 24,
  ),
  "Community Allocation (TBD)": communityTBD,
  meta: {
    version: 2,
    notes: [
      `The remaining 13.3% of Community Allocation and 4% Tokens Repurchased have no defined unlock schedule and are marked as TBD.`,
    ],
    sources: ["https://info.layerzero.foundation/introducing-zro-d39df554a9b7"],
    token: "coingecko:layerzero",
    protocolIds: ["4867"],
  },
  categories: {
    farming: [
      "Community Allocation",
    ],
    noncirculating: ["Community Allocation (TBD)"],
    insiders: ["Core Contributors", "Strategic Partners"],
  },
};

export default zro;
