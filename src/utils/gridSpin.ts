export function buildSpinPlan(params: {
  currentIndex: number;
  targetIndex: number;
  perimeterSize: number;
  fullLaps: number;
  slowdownSteps: number;
}) {
  const { currentIndex, targetIndex, perimeterSize, fullLaps, slowdownSteps } =
    params;
  const totalTravel =
    fullLaps * perimeterSize +
    ((targetIndex - currentIndex + perimeterSize) % perimeterSize) +
    slowdownSteps;

  const plan: number[] = [];
  for (let step = 1; step <= totalTravel; step += 1) {
    plan.push((currentIndex + step) % perimeterSize);
  }

  if (plan.at(-1) !== targetIndex) {
    const distance =
      (targetIndex - (plan.at(-1) ?? 0) + perimeterSize) % perimeterSize;
    for (let step = 1; step <= distance; step += 1) {
      plan.push(((plan.at(-1) ?? currentIndex) + 1) % perimeterSize);
    }
  }

  return plan;
}

export function getSpinDelay(params: { step: number; totalSteps: number }) {
  const { step, totalSteps } = params;
  const progress = step / totalSteps;

  if (progress < 0.18) return 42;
  if (progress < 0.68) return 74;
  if (progress < 0.88) return 128;
  if (progress < 0.94) return 186;
  return 248;
}
