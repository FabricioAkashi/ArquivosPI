/** Motion presets are shared by Arc UI components. */
export const motionTokens = {
  /** Interface motion stays under 300ms; exits are quicker than entries. */
  duration: { instant: 0.1, fast: 0.15, exit: 0.14, standard: 0.2, considered: 0.36 },
  ease: {
    enter: [0.16, 1, 0.3, 1],
    exit: [0.7, 0, 0.84, 0],
    standard: [0.22, 1, 0.36, 1],
    inOut: [0.65, 0, 0.35, 1],
  },
  spring: {
    responsive: { type: "spring", stiffness: 520, damping: 44 },
    gentle: { type: "spring", stiffness: 340, damping: 34 },
    snappy: { type: "spring", visualDuration: 0.2, bounce: 0 },
    smooth: { type: "spring", visualDuration: 0.3, bounce: 0 },
    morph: { type: "spring", visualDuration: 0.3, bounce: 0 },
  },
  stagger: { char: 0.016, word: 0.04, line: 0.08, item: 0.035 },
  blur: { subtle: 2, soft: 4, text: 8 },
} as const;
