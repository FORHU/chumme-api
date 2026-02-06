/**
 * VOCAL ROLES CONFIGURATION
 * Maps role indices to human-readable names for the Karaoke UI.
 */
export const VOCAL_ROLES = {
  0: {
    name: "All / Chorus",
    key: "all",
    color: "#FFD700", // Gold
    description:
      "The gatekeeper is disabled. Everyone in the studio can sing together. Perfect for big group moments and anthems.",
  },
  1: {
    name: "Main Vocal",
    key: "main",
    color: "#FF4D4D", // Red
    description:
      "The primary singer for the section. Carries the main melody and focus of the verse.",
  },
  2: {
    name: "Lead Vocal",
    key: "lead",
    color: "#4D79FF", // Blue
    description:
      "Supports the main melody, often singing high-visibility and technically difficult parts.",
  },
  3: {
    name: "Sub Vocal",
    key: "sub",
    color: "#4DFF88", // Green
    description:
      "Supports the main and lead vocals with harmonies, fills, and background lines.",
  },
  4: {
    name: "Rapper",
    key: "rapper",
    color: "#CC66FF", // Purple
    description:
      "Dedicated to rhythmic speech/rap sections. Usually has distinct timing and flow.",
  },
  5: {
    name: "Backing Vocal",
    key: "backing",
    color: "#FF9933", // Orange",
    description:
      "Handles ad-libs, echoes, and ambient vocal support to thicken the sound.",
  },
};

export const getVocalChoices = () => {
  return Object.entries(VOCAL_ROLES).map(([id, data]) => ({
    id: parseInt(id),
    ...data,
  }));
};
