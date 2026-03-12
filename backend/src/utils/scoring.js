const ageBuckets = [
  { label: "Under 12", max: 12 },
  { label: "Under 14", max: 14 },
  { label: "Under 16", max: 16 },
  { label: "Under 18", max: 18 },
  { label: "Under 20", max: 20 }
];

export function calculateAge(dateOfBirth) {
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthGap = today.getMonth() - dob.getMonth();

  if (monthGap < 0 || (monthGap === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

export function resolveAgeCategory(age) {
  const bucket = ageBuckets.find((item) => age < item.max);
  return bucket ? bucket.label : "Under 20";
}

export function scoreByPosition(position) {
  const pointsMap = {
    1: 5,
    2: 3,
    3: 1
  };
  return pointsMap[position] || 0;
}

export function scoreByOutcome(outcome) {
  const pointsMap = {
    win: 5,
    draw: 2,
    loss: 0
  };
  return pointsMap[outcome] ?? 0;
}
