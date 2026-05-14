// FRNDS — content (copy variants, menu, gallery, press)

window.FRNDS_CONTENT = {
  // Voice variants — Tweaks panel can swap
  voice: {
    sultry: {
      heroEyebrow: "Downtown Dubai · Est. 2022",
      heroTag: ["A late table, a low light,", "and a glass that lasts the hour."],
      heroSub: "Modern French · Japanese · Open until late",
      introH: ["Where ", "Paris", " keeps a", " standing", " reservation in ", "Tokyo."],
      introLead: "FRNDS is a low-lit room of brass arches, emerald banquettes and a chandelier that loves a long dinner. Two kitchens, one table — French composure, Japanese precision, and the kind of evening that ends three hours after it should.",
      introBody: [
        "Built around a swing-bar and a stained-glass altar of bottles, the room turns slowly from late lunch to long dinner to last cocktail. The crowd is the kind that knows the way back from the bar without asking.",
        "Reservations are encouraged. Quiet corners by request."
      ],
      brunchLead: "A brunch that begins after sunset.",
      reserveH: ["A seat at ", "FRNDS"]
    },
    playful: {
      heroEyebrow: "FRNDS · Downtown Dubai",
      heroTag: ["Same time, ", "same table?"],
      heroSub: "French + Japanese · Brunch · Shisha · Late",
      introH: ["The ", "inside joke", " of Downtown Dubai."],
      introLead: "FRNDS is the room you tell your closest people about and then immediately regret telling.",
      introBody: ["Two kitchens, one mood. Bring the group, stay long, order one more."],
      brunchLead: "The brunch that runs late on purpose.",
      reserveH: ["Pull up a ", "chair"]
    }
  },

  // Menu — categorized, French-Japanese
  menu: [
    {
      id: "snacks",
      label: "Snacks & Crudo",
      side: "Cold openers. Built to share, designed to linger.",
      items: [
        { name: "Otoro tartare", price: "AED 145", desc: "Tuna belly, oscietra caviar, smoked soy pearls, brioche toast.", tags: ["raw"] },
        { name: "Hamachi à la française", price: "AED 110", desc: "Yellowtail sashimi, beurre blanc, yuzu kosho, micro shiso." },
        { name: "Hokkaido scallop", price: "AED 135", desc: "Carpaccio, brown-butter dashi, finger lime, nori salt.", tags: ["signature"] },
        { name: "Burrata, ume & shiso", price: "AED 95", desc: "Stracciatella, pickled plum, crispy shallot, sesame oil." },
        { name: "Foie gras dorayaki", price: "AED 120", desc: "Pan-seared foie, sansho pepper, fig compote, fluffy pancake." },
        { name: "Steak tartare 'Ginza'", price: "AED 125", desc: "Hand-cut wagyu, ponzu, soft yolk, taro chip." }
      ]
    },
    {
      id: "sushi",
      label: "Sushi & Sashimi",
      side: "Cut to order. Nikiri-brushed. Eat with hands.",
      items: [
        { name: "Omakase nigiri · 8 pc", price: "AED 285", desc: "Chef's selection, brushed with house nikiri.", tags: ["chef's choice"] },
        { name: "A5 wagyu nigiri", price: "AED 95 / pc", desc: "Miyazaki wagyu, truffle pommade, smoked soy." },
        { name: "Bluefin trio", price: "AED 180", desc: "Akami, chutoro, otoro — sashimi flight." },
        { name: "Crispy rice, spicy tuna", price: "AED 85", desc: "Sushi rice cakes, tartare, jalapeño, micro-cress.", tags: ["signature"] },
        { name: "Lobster temaki", price: "AED 110", desc: "Hand-roll, butter-poached lobster, yuzu mayo." },
        { name: "Salmon, oscietra, gold", price: "AED 145", desc: "Sashimi, caviar, edible 24k leaf — for the occasion." }
      ]
    },
    {
      id: "robata",
      label: "Robata & Mains",
      side: "From the binchotan grill. From the French kitchen.",
      items: [
        { name: "Black cod, saikyo miso", price: "AED 220", desc: "72-hour marinated, sake-glazed, hoba leaf.", tags: ["signature"] },
        { name: "A5 wagyu, three ways", price: "AED 590", desc: "Robata, tataki, tartare. Wasabi, ponzu, café de Paris." },
        { name: "Canard à l'orange-yuzu", price: "AED 240", desc: "Duck breast, citrus glaze, pommes Anna, sansho." },
        { name: "Sea bass en papillote", price: "AED 195", desc: "Loup de mer, dashi-fennel, beurre nantais." },
        { name: "Lobster tagliolini", price: "AED 230", desc: "Half lobster, uni cream, bisque, chive oil." },
        { name: "Black truffle gyoza", price: "AED 130", desc: "Hand-folded, black truffle, brown butter, ponzu air." }
      ]
    },
    {
      id: "sweet",
      label: "Sweet",
      side: "The room is loud. Dessert is quiet.",
      items: [
        { name: "Yuzu tart, brûléed", price: "AED 65", desc: "Sablé breton, yuzu curd, torched meringue." },
        { name: "Matcha mille-feuille", price: "AED 70", desc: "Caramelised puff, matcha cream, raspberry." },
        { name: "Chocolate · miso · sea salt", price: "AED 75", desc: "Valrhona ganache, white miso caramel, sel gris.", tags: ["signature"] },
        { name: "Mochi flight", price: "AED 55", desc: "Five seasonal mochi, plated like petit fours." }
      ]
    },
    {
      id: "bar",
      label: "Cellar & Bar",
      side: "200+ labels. Cocktails by the hour, not the menu.",
      items: [
        { name: "The Geisha Negroni", price: "AED 85", desc: "Roku gin, Campari, sake vermouth, yuzu twist.", tags: ["signature"] },
        { name: "Saké Bellini, white peach", price: "AED 75", desc: "Junmai daiginjo, peach purée, prosecco." },
        { name: "Smoke & Mirrors", price: "AED 95", desc: "Mezcal, plum wine, hojicha, applewood smoke." },
        { name: "1923 Old Fashioned", price: "AED 95", desc: "Toki, mizunara wood, brown sugar, orange oil." },
        { name: "Cellar pours · by the glass", price: "from 60", desc: "Burgundy, Loire, Champagne, Sake, Mizunara." },
        { name: "Pairing flight · 4 courses", price: "AED 320", desc: "Sommelier's selection. France meets Japan, by the pour." }
      ]
    }
  ],

  // Gallery — uses the actual uploaded interior shots
  gallery: [
    { cls: "g-a", img: "images/bar-swing.avif", cap: "The swing bar · main room", num: "01" },
    { cls: "g-b", img: "images/bar-interior.jpg", cap: "Brass arch · entry", num: "02" },
    { cls: "g-c", img: "images/sparklers.jpg", cap: "After hours", num: "03" },
    { cls: "g-d", img: "images/mural-portrait.jpg", cap: "The mural · dining room", num: "04" },
    { cls: "g-e", img: "images/banquettes.jpg", cap: "Terrace banquettes", num: "05" },
    { cls: "g-f", img: "images/shisha-2.jpg", cap: "Lounge · shisha", num: "06" },
    { cls: "g-g", img: "images/shisha-1.jpg", cap: "Late hours", num: "07" },
    { cls: "g-h", img: "images/bar-front.webp", cap: "Cellar window", num: "08" }
  ],

  // Press
  press: [
    {
      quote: "A room that looks like it was lit by a cinematographer — and a kitchen that earns the room.",
      pub: "Time Out Dubai",
      auth: "Best New Openings · 2023"
    },
    {
      quote: "French composure, Japanese precision, and a swing-bar that has no business being this good.",
      pub: "Esquire Middle East",
      auth: "Dining · Dubai Edit"
    },
    {
      quote: "The kind of address you give to someone you want to impress, twice.",
      pub: "Vogue Arabia",
      auth: "City Guide · Downtown"
    }
  ],

  // Shisha flavors
  shishaFlavors: [
    "Rose · Damascus",
    "Cherry · Hojicha",
    "Mint · Yuzu",
    "Grape · Sumac",
    "Apple · Cinnamon",
    "Peach · Sake",
    "Watermelon · Mint",
    "Mixed Berries"
  ],

  // Marquee strip
  marquee: [
    "Modern French",
    "·",
    "Japanese",
    "·",
    "Brunch",
    "·",
    "Shisha Lounge",
    "·",
    "Late Bar",
    "·",
    "Downtown Dubai",
    "·",
    "Reservations encouraged"
  ]
};
