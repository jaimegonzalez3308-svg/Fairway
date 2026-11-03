// Public identity only. Update this URL if Fairway moves to a custom domain.
export const site = {
  name: "Fairway",
  url: "https://fairway-leon-golf.jjrtecl.chatgpt.site/",
  title: "Fairway · Golfistas y partidas de golf en León",
  description:
    "Encuentra golfistas en León, consulta clubes y organiza partidas. Filtra por club, handicap y disponibilidad, y acuerda la hora en el chat del grupo.",
  socialImage: "/images/fairway-social.png",
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: site.url,
  description: site.description,
  inLanguage: "es-MX",
};
