// Adapts raw API incident objects to the display shape the cards, detail
// screens and map markers were built around (mock-data shaped).
// Already display-shaped items (e.g. the bundled mock incidents) pass
// through intact — only missing display fields are filled in.

const TYPE_META = {
  "red-flag": { emoji: "🚩", label: "Red Flag" },
  intervention: { emoji: "⚠️", label: "Intervention" },
  sos: { emoji: "🚨", label: "SOS Alert" },
};

const SOS_KEYWORD_EMOJI = [
  ["accident", "🚗"],
  ["ambulance", "🚑"],
  ["medical", "🚑"],
  ["fire", "🔥"],
  ["crime", "🚔"],
  ["flood", "🌊"],
];

function sosEmoji(title = "") {
  const lower = String(title).toLowerCase();
  const hit = SOS_KEYWORD_EMOJI.find(([word]) => lower.includes(word));
  return hit ? hit[1] : "🚨";
}

function roundCoord(value) {
  const num = Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(6)) : value ?? "";
}

export function relativeAge(isoDate) {
  if (!isoDate) return "recently";
  let normalized = String(isoDate).trim();
  // If the ISO timestamp is missing timezone offset (naive from SQLite/DB), enforce UTC parsing
  if (!normalized.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }
  const dateObj = new Date(normalized);
  const timeMs = dateObj.getTime();
  if (Number.isNaN(timeMs)) return "recently";

  const seconds = Math.max(0, (Date.now() - timeMs) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(seconds / 86400);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function adaptIncident(item) {
  if (!item) return item;

  const base = {
    ...item,
    latitude: roundCoord(item.latitude),
    longitude: roundCoord(item.longitude),
    status: item.status === "draft" ? "pending" : item.status,
    location: item.location || item.location_name || "Kenya",
    age: item.age || relativeAge(item.created_at),
  };

  // API-shaped objects carry `incident_type` — map them onto the display shape.
  if (item.incident_type) {
    const meta = TYPE_META[item.incident_type] || TYPE_META.intervention;
    const isAnonymousSos =
      item.incident_type === "sos" &&
      (!item.author || item.author === "Anonymous");
    return {
      ...base,
      type: item.incident_type === "sos" ? sosEmoji(item.title) : meta.emoji,
      category: meta.label,
      reporter: isAnonymousSos ? "Anonymous · SOS" : item.author || "Citizen",
    };
  }

  // Already display-shaped (bundled mock data) — guarantee the fields exist.
  return {
    ...base,
    type: item.type ?? "⚠️",
    category: item.category ?? "Report",
    reporter: item.reporter || item.author || "Citizen",
  };
}

export function adaptIncidents(items = []) {
  return items.map(adaptIncident);
}
