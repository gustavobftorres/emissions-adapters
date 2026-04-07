import { Protocol } from "../types/adapters"
import { manualCliff, manualLinear, manualStep } from "../adapters/manual"
import { periodToSeconds } from "../utils/time"

const totalQty = 1000000000
const start = 1665532800

// Aptos inflation starts at 7% annually, declines 1.5% per year, floored at 3.25%.
// We model this by compounding monthly segments with the exact rate for each period,
// then calibrate the total to match actual supply from the API (accounts for validator
// performance losses where not all proposals succeed).
const annualRate = (timestamp: number) => {
  const yearsSinceGenesis =
    (timestamp - start) / periodToSeconds.year
  return Math.max(0.0325, 0.07 - 0.015 * yearsSinceGenesis)
}

const stakingInflation = async () => {
  const res = await fetch(
    "https://aptos-supply.dev.gcp.aptosdev.com/supply",
  )
  const data = await res.json()
  const currentSupply = Number(data.current_total_supply)
  const actualInflation = currentSupply - totalQty
  const now = Math.floor(Date.now() / 1000)
  const month = periodToSeconds.month

  // Build monthly segments with compounding supply and declining rate
  const segments: ReturnType<typeof manualLinear>[] = []
  let supply = totalQty
  let totalModeled = 0

  for (let t = start; t < now; t += month) {
    const segEnd = Math.min(t + month, now)
    const segFraction = (segEnd - t) / periodToSeconds.year
    const rate = annualRate(t + (segEnd - t) / 2) // midpoint rate
    const emission = supply * rate * segFraction

    segments.push(manualLinear(t, segEnd, emission))
    supply += emission
    totalModeled += emission
  }

  const scale = actualInflation / totalModeled
  return segments.map((s) => manualLinear(s.start, s.end, s.amount * scale))
}

const aptos: Protocol = {
  Community: [
    manualCliff(start, totalQty * 0.125),
    manualStep(
      start,
      periodToSeconds.month,
      120,
      (510217359.767 - totalQty * 0.125) / 120,
    ),
  ],
  "Staking Rewards": stakingInflation(),
  "Core Contributors": [
    manualStep(
      start + periodToSeconds.month * 13,
      periodToSeconds.month,
      6,
      (totalQty * 0.19 * 3) / 48,
    ),
    manualStep(
      start + periodToSeconds.month * 19,
      periodToSeconds.month,
      30,
      (totalQty * 0.19) / 48,
    ),
  ],
  Foundation: [
    manualCliff(start, totalQty * 0.005),
    manualStep(start, periodToSeconds.month, 120, (totalQty * 0.16) / 120),
  ],
  Investors: [
    manualStep(
      start + periodToSeconds.month * 13,
      periodToSeconds.month,
      6,
      (134782640.233 * 3) / 48,
    ),
    manualStep(
      start + periodToSeconds.month * 19,
      periodToSeconds.month,
      30,
      134782640.233 / 48,
    ),
  ],
  meta: {
    sources: ["https://aptosnetwork.com/currents/aptos-tokenomics-overview"],
    token: "coingecko:aptos",
    notes: [
      "Staking rewards follow Aptos' declining inflation schedule: 7% at launch, decreasing 1.5% per year to a 3.25% floor. Emissions are modeled monthly with compounding and calibrated against actual on-chain supply.",
    ],
    protocolIds: ["2725"],
  },
  categories: {
    noncirculating: ["Foundation","Community"],
    privateSale: ["Investors"],
    insiders: ["Core Contributors"],
    staking: ["Staking Rewards"],
  },
}
export default aptos;
