// lib/emoji.ts
// Single source of truth for category slug → emoji mapping.
// Import this everywhere instead of duplicating CATEGORY_EMOJI.

export const CATEGORY_EMOJI: Record<string, string> = {
  // English slugs
  "animal-coloring-pages": "🦁", "fairy-tales": "🐉", "space-science": "🚀",
  "holiday-coloring": "🎄", "nature-coloring": "🌿", "food-drinks": "🍕",
  "fantasy-coloring": "🐉", "seasonal-coloring": "🍂", "characters": "🎭",
  "emotions-mindfulness": "💛", "education": "📚", "jobs-professions": "👷",
  "pattern-coloring": "🔷", "vehicles": "🚗", "sports": "⚽",
  // German
  "tiere": "🦁", "fahrzeuge": "🚗", "bildung": "📚", "charaktere": "🎭",
  "emotionen-achtsamkeit": "💛", "feiertage": "🎄", "maerchen": "🐉",
  "natur": "🌿", "saisonale": "🍂", "fantasy": "🐉", "weltraum": "🚀",
  "sport": "⚽", "berufe-jobs": "👷", "muster": "🔷", "essen-getraenke": "🍕",
  // Spanish
  "animales": "🦁", "vehiculos": "🚗", "educacion": "📚",
  "emociones-mindfulness": "💛", "festivos": "🎄", "cuentos-de-hadas": "🐉",
  "naturaleza": "🌿", "estacional": "🍂", "ciencia-espacial": "🚀",
  "deportes": "⚽", "trabajos-profesiones": "👷", "patrones": "🔷",
  // French
  "animaux": "🦁", "vehicules": "🚗", "personnages": "🎭",
  "emotions-pleine-conscience": "💛", "jours-feries": "🎄",
  "contes-de-fees": "🐉", "nature-2": "🌿", "saisonnier": "🍂",
  "science-espace": "🚀", "sports-2": "⚽",
  // Italian
  "animali": "🦁", "veicoli": "🚗", "istruzione": "📚",
  "emozioni-mindfulness": "💛", "festivita": "🎄", "fiabe": "🐉",
  // Dutch
  "dieren": "🦁", "voertuigen": "🚗", "onderwijs": "📚",
  // Portuguese
  "animais": "🦁", "veiculos": "🚗", "educacao": "📚",
};

export function categoryEmoji(slug: string): string {
  return CATEGORY_EMOJI[slug] ?? "🎨";
}
