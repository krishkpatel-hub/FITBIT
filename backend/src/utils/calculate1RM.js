export function calculate1RM(weight, reps) {
  if (!weight || !reps) {
    return 0;
  }

  return Math.round(weight * (1 + reps / 30));
}

