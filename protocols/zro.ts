import { Protocol, SectionV2 } from "../types/adapters";
import { manualCliff, manualStep } from "../adapters/manual";
import { periodToSeconds } from "../utils/time";

const total = 1e9;
const start = 1718841600;

const communityTBD: SectionV2 = {
  displayName: "Community Allocation (TBD)",
  isTBD: true,
  methodology:
    "The remaining 13.3% of Community Allocation has no defined unlock schedule.",
  components: [
    {
      id: "community-remaining",
      name: "Community Allocation (TBD)",
      methodology:
        "3.8% from Future Initiatives and 9.5% from Ecosystem and Growth with no defined unlock schedule",
      isTBD: true,
      fetch: async () => [manualCliff(start, total * 0.133)],
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
    (total * 0.312) / 24,
  ),
  "Foundation": manualCliff("2025-09-20", 50_000_000),
  "Community Allocation (TBD)": communityTBD,
  meta: {
    version: 2,
    notes: [
      `The remaining 13.3% of Community Allocation have no defined unlock schedule and are marked as TBD.`,
      `The LayerZero Foundation bought back 50M tokens from early investors, reducing the original Strategic Partners allocation`,
      `The original 40M Tokens Repurchased were clawed back in a settlement with the FTX Estate and are now included in the Strategic Partners allocation.`
    ],
    sources: [
      "https://info.layerzero.foundation/introducing-zro-d39df554a9b7",
      "https://x.com/LayerZero_Core/status/1970152700735336612",
    ],
    token: "coingecko:layerzero",
    protocolIds: ["4867"],
  },
  categories: {
    farming: [
      "Community Allocation",
    ],
    noncirculating: ["Community Allocation (TBD)", "Foundation"],
    insiders: ["Core Contributors", "Strategic Partners"],
  },
};

export default zro;
