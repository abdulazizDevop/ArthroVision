export function calculateDAS28(
  tjc28: number,
  sjc28: number,
  vas: number,
  esr?: number,
  crp?: number
): { score: number; interpretation: string; type: string } | null {
  if (tjc28 === undefined || sjc28 === undefined || vas === undefined) return null;

  let score = 0;
  let type = "";

  if (crp !== undefined && crp > 0) {
    // Prefer CRP if available
    score = 0.56 * Math.sqrt(tjc28) + 0.28 * Math.sqrt(sjc28) + 0.36 * Math.log(crp + 1) + 0.014 * vas + 0.96;
    type = "DAS28-CRP";
  } else if (esr !== undefined && esr > 0) {
    score = 0.56 * Math.sqrt(tjc28) + 0.28 * Math.sqrt(sjc28) + 0.70 * Math.log(esr) + 0.014 * vas;
    type = "DAS28-ESR";
  } else {
    return null;
  }

  // Round to 2 decimal places
  score = Math.round(score * 100) / 100;

  let interpretation = "";
  if (score < 2.6) interpretation = "Remissiya";
  else if (score <= 3.2) interpretation = "Past faollik";
  else if (score <= 5.1) interpretation = "O'rtacha faollik";
  else interpretation = "Yuqori faollik";

  return { score, interpretation, type };
}
