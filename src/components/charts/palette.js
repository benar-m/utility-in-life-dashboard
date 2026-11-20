// Chart colours. The categorical order is fixed (assign by entity, never by rank) and was
// checked with the dataviz validator: lightness band, chroma, colour-blind separation of
// neighbours and normal-vision separation all pass on the white surface. Orange is just
// under 3:1 against white, so charts always carry visible labels, a legend or a table.
export const CATEGORICAL = ["#12999E", "#E8742A", "#4C63D8", "#D9467A", "#9C7A12", "#7A52C7"];

// Single-series charts use the brand teal.
export const PRIMARY = CATEGORICAL[0];

// Status colours are reserved for state and always ship with a text label.
export const STATUS = {
  good: "#1E8E5A",
  warning: "#C98A12",
  critical: "#D2453B",
  neutral: "#94A3B8",
};

export const ATTENDANCE_COLORS = {
  present: STATUS.good,
  late: STATUS.warning,
  absent: STATUS.critical,
  excused: STATUS.neutral,
};

export const GRID = "#E7EBF0";
export const SURFACE = "#FFFFFF";
