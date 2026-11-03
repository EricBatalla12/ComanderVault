// Búsqueda de comandantes en la API pública de Scryfall (https://scryfall.com/docs/api)

const API = 'https://api.scryfall.com';
let controller;

const imagesOf = (card) => {
  const face = card.image_uris ? card : card.card_faces?.find((f) => f.image_uris) || {};
  const iu = face.image_uris || {};
  return { art: iu.art_crop || '', image: iu.normal || iu.large || '' };
};

export const toCommander = (card) => {
  const { art, image } = imagesOf(card);
  const text = card.oracle_text || card.card_faces?.map((f) => f.oracle_text).join('\n') || '';
  return {
    scryfallId: card.id,
    name: card.name,
    typeLine: card.type_line || card.card_faces?.[0]?.type_line || '',
    colors: card.color_identity || [],
    art,
    image,
    scryfallUri: card.scryfall_uri || '',
    edhrecUri: card.related_uris?.edhrec || '',
    canPartner:
      (card.keywords || []).some((k) => /partner|friends forever|doctor's companion/i.test(k)) ||
      /choose a background|partner with/i.test(text),
  };
};

/** Busca cartas que pueden ser comandante. Devuelve [] si no hay resultados. */
export async function searchCommanders(term, { anyCard = false } = {}) {
  const q = term.trim();
  if (q.length < 2) return [];
  controller?.abort();
  controller = new AbortController();
  const query = anyCard ? q : `${q} (is:commander OR t:background)`;
  const url = `${API}/cards/search?order=edhrec&unique=cards&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Scryfall respondió ${res.status}`);
  const json = await res.json();
  return (json.data || []).slice(0, 12).map(toCommander);
}

/** URL de imagen que funciona sin conocer el id (redirección de Scryfall). */
export const namedImage = (name, version = 'art_crop') =>
  `${API}/cards/named?format=image&version=${version}&exact=${encodeURIComponent(name)}`;
