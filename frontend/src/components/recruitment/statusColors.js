// One color per application status, shared by every status chart so a status always looks the same.
// Ordered along the workflow and checked with the dataviz palette validator: each neighbour stays
// distinguishable with color-vision deficiencies (ΔE >= 8), and all sit in a readable lightness band.
// Color is never alone: charts always pair it with the status label and count.
export const APPLICATION_STATUS_COLORS = {
  submitted: "#627df5", // brand periwinkle
  under_review: "#d08a00",
  shortlisted: "#8a5cf0",
  interview_scheduled: "#d4537e",
  interview_completed: "#1a9fb0",
  offer_extended: "#3f57c9",
  hired: "#13967f",
  rejected: "#d03b3b",
};

// For statuses the UI doesn't know (older data), so totals still add up.
export const OTHER_STATUS_COLOR = "#9aa3b5";
