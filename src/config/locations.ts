export interface SubcityLocations {
  id: string;
  name: string;
  locations: string[];
}

/**
 * Addis Ababa subcities and their neighborhoods/specific locations.
 * Structured separately from form UI so entries can be updated or loaded
 * from an admin-managed source later without changing form logic.
 */
export const ADDIS_ABABA_SUBCITIES: SubcityLocations[] = [
  {
    id: 'addis-ketema',
    name: 'Addis Ketema',
    locations: [
      'Abinet',
      'Autobus Tera',
      'Gojam Berenda',
      'Merkato',
      'Mesalemia',
      'Tekle Haimanot',
    ],
  },
  {
    id: 'akaky-kaliti',
    name: 'Akaky Kaliti',
    locations: [
      'Akaki',
      'Gelan Condominium',
      'Kaliti',
      'Kilinto',
      'Koye Feche',
      'Saris',
      'Tuludimtu',
    ],
  },
  {
    id: 'arada',
    name: 'Arada',
    locations: [
      'Arat Kilo',
      'Eri Bekentu',
      'Giorgis',
      'Piassa',
      'Ras Mekonnen',
      'Sidist Kilo',
    ],
  },
  {
    id: 'bole',
    name: 'Bole',
    locations: [
      'Bole Arabsa',
      'Bole Atlas',
      'Bole Bulbula',
      'Bole Medhanialem',
      'Bole Michael',
      'Brass / Rwanda',
      'Gerji',
    ],
  },
  {
    id: 'gullele',
    name: 'Gullele',
    locations: [
      'Addisu Gebeya',
      'Entoto',
      'Kechene',
      'Rufael',
      'Semen Mazegaja',
      'Shiro Meda',
      'Wingate',
    ],
  },
  {
    id: 'kirkos',
    name: 'Kirkos',
    locations: [
      'Bambis',
      'Gotera',
      'Kazanchis',
      'Meskel Square',
      'Mexico',
      'Stadium / Legehar',
      'Wollo Sefer',
    ],
  },
  {
    id: 'kolfe-keranio',
    name: 'Kolfe Keranio',
    locations: [
      'Ayer Tena',
      'Betel',
      'Kara Kore',
      'Kolfe',
      'Tor Hailoch',
      'Weyra Sefer',
      'Zenebework',
    ],
  },
  {
    id: 'lemi-kura',
    name: 'Lemi Kura',
    locations: [
      'Ayat',
      'CMC',
      'Goro',
      'Hayat',
      'Jackros',
      'Meri Luke',
      'Summit',
    ],
  },
  {
    id: 'lideta',
    name: 'Lideta',
    locations: [
      'Balcha Hospital Area',
      'Cherkos West',
      'Geja Sefer',
      'Lideta Condominium',
      'Mexico Area',
      'Tor Hailoch East',
    ],
  },
  {
    id: 'nifas-silk-lafto',
    name: 'Nifas Silk-Lafto',
    locations: [
      'Bisrate Gabriel',
      'Haile Garment',
      'Hana Mariam',
      'Jemo 1',
      'Jemo 2',
      'Jemo 3',
      'Lafto',
      'Lebu',
      'Mebrat Hail',
      'Sarbet',
    ],
  },
  {
    id: 'yeka',
    name: 'Yeka',
    locations: [
      'Ferensay Legasion',
      'Kara',
      'Kebena',
      'Kotebe',
      'Megenagna',
      'Signal',
      'Yeka Abado',
    ],
  },
];

export function getLocationsForSubcity(subcityName: string): string[] {
  const match = ADDIS_ABABA_SUBCITIES.find((s) => s.name === subcityName);
  return match ? match.locations : [];
}

export function isValidSubcityLocation(subcityName: string, locationName: string): boolean {
  const locations = getLocationsForSubcity(subcityName);
  return locations.includes(locationName);
}
