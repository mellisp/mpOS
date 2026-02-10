/* Aquarium Dataset — ~80 aquariums worldwide
   Each entry: [name, city, latitude, longitude] */
var AQUARIUMS = [
  // North America — USA
  ["Georgia Aquarium", "Atlanta, GA, USA", 33.7634, -84.3951],
  ["Monterey Bay Aquarium", "Monterey, CA, USA", 36.6183, -121.9018],
  ["Shedd Aquarium", "Chicago, IL, USA", 41.8676, -87.6140],
  ["National Aquarium", "Baltimore, MD, USA", 39.2851, -76.6083],
  ["Aquarium of the Pacific", "Long Beach, CA, USA", 33.7625, -118.1965],
  ["Tennessee Aquarium", "Chattanooga, TN, USA", 35.0557, -85.3111],
  ["Mystic Aquarium", "Mystic, CT, USA", 41.3732, -71.9625],
  ["Dallas World Aquarium", "Dallas, TX, USA", 32.7836, -96.8014],
  ["Seattle Aquarium", "Seattle, WA, USA", 47.6076, -122.3430],
  ["New England Aquarium", "Boston, MA, USA", 42.3591, -71.0497],
  ["Ripley's Aquarium of Canada", "Toronto, ON, Canada", 43.6424, -79.3860],
  ["Vancouver Aquarium", "Vancouver, BC, Canada", 49.3007, -123.1306],
  ["Audubon Aquarium of the Americas", "New Orleans, LA, USA", 29.9500, -90.0631],
  ["OdySea Aquarium", "Scottsdale, AZ, USA", 33.5358, -111.8854],
  ["South Carolina Aquarium", "Charleston, SC, USA", 32.7901, -79.9234],
  ["Newport Aquarium", "Newport, KY, USA", 39.0949, -84.4963],
  ["Birch Aquarium", "La Jolla, CA, USA", 32.8669, -117.2510],
  ["Florida Aquarium", "Tampa, FL, USA", 27.9425, -82.4444],
  ["Waikiki Aquarium", "Honolulu, HI, USA", 21.2659, -157.8212],
  ["Oregon Coast Aquarium", "Newport, OR, USA", 44.6175, -124.0472],
  ["Clearwater Marine Aquarium", "Clearwater, FL, USA", 27.9778, -82.8014],
  ["Loveland Living Planet Aquarium", "Draper, UT, USA", 40.5288, -111.8967],

  // Central America & Caribbean
  ["Acuario de Veracruz", "Veracruz, Mexico", 19.1973, -96.1340],
  ["Interactive Aquarium Cancun", "Cancun, Mexico", 21.1329, -86.7488],

  // South America
  ["AquaRio", "Rio de Janeiro, Brazil", -22.8935, -43.1920],
  ["Acqua Mundo", "Guaruja, Brazil", -23.9875, -46.2564],

  // Europe — Western
  ["Oceanario de Lisboa", "Lisbon, Portugal", 38.7636, -9.0937],
  ["L'Aquarium de Barcelona", "Barcelona, Spain", 41.3764, 2.1841],
  ["Oceanografic Valencia", "Valencia, Spain", 39.4528, -0.3476],
  ["Aquarium of Genoa", "Genoa, Italy", 44.4097, 8.9263],
  ["Nausicaa", "Boulogne-sur-Mer, France", 50.7254, 1.5937],
  ["Aquarium de Paris", "Paris, France", 48.8630, 2.2870],
  ["Sea Life London Aquarium", "London, UK", 51.5020, -0.1195],
  ["The Deep", "Hull, UK", 53.7384, -0.3187],
  ["National Marine Aquarium", "Plymouth, UK", 50.3682, -4.1382],

  // Europe — Northern
  ["Den Bla Planet", "Copenhagen, Denmark", 55.6381, 12.6562],
  ["Liseberg Ocean", "Gothenburg, Sweden", 57.6943, 11.9891],
  ["Sea Life Helsinki", "Helsinki, Finland", 60.1618, 24.9349],
  ["Polaria", "Tromso, Norway", 69.6457, 18.9580],
  ["Bergen Aquarium", "Bergen, Norway", 60.3996, 5.3041],

  // Europe — Central & Eastern
  ["Tropicarium Budapest", "Budapest, Hungary", 47.4309, 19.0567],
  ["Sea Life Munich", "Munich, Germany", 48.1266, 11.5514],
  ["Ozeaneum", "Stralsund, Germany", 54.3151, 13.0899],
  ["Moskvarium", "Moscow, Russia", 55.8281, 37.4674],

  // Africa
  ["Two Oceans Aquarium", "Cape Town, South Africa", -33.9077, 18.4179],
  ["uShaka Marine World", "Durban, South Africa", -29.8684, 31.0466],
  ["Cango Wildlife Ranch", "Oudtshoorn, South Africa", -33.5872, 22.2025],

  // Middle East
  ["The Lost Chambers Aquarium", "Dubai, UAE", 25.1310, 55.1172],
  ["National Aquarium Abu Dhabi", "Abu Dhabi, UAE", 24.4005, 54.4990],
  ["Istanbul Aquarium", "Istanbul, Turkey", 41.0042, 28.8404],
  ["Antalya Aquarium", "Antalya, Turkey", 36.8576, 30.7282],

  // South Asia
  ["Taraporewala Aquarium", "Mumbai, India", 18.9543, 72.8143],
  ["VGP Marine Kingdom", "Chennai, India", 12.9040, 80.2522],

  // East Asia — China
  ["Chimelong Ocean Kingdom", "Zhuhai, China", 22.1036, 113.5372],
  ["Shanghai Ocean Aquarium", "Shanghai, China", 31.2414, 121.5014],
  ["Beijing Aquarium", "Beijing, China", 39.9403, 116.3326],
  ["Ocean Park Hong Kong", "Hong Kong, China", 22.2467, 114.1748],

  // East Asia — Japan
  ["Churaumi Aquarium", "Okinawa, Japan", 26.6939, 127.8778],
  ["Osaka Aquarium Kaiyukan", "Osaka, Japan", 34.6548, 135.4290],
  ["Sumida Aquarium", "Tokyo, Japan", 35.7101, 139.7960],
  ["Enoshima Aquarium", "Fujisawa, Japan", 35.3101, 139.4798],
  ["Toba Aquarium", "Toba, Japan", 34.4782, 136.8433],

  // East Asia — South Korea
  ["COEX Aquarium", "Seoul, South Korea", 37.5117, 127.0594],
  ["Aqua Planet Jeju", "Jeju, South Korea", 33.4317, 126.9261],

  // East Asia — Taiwan
  ["National Museum of Marine Biology and Aquarium", "Pingtung, Taiwan", 22.0453, 120.6979],

  // Southeast Asia
  ["S.E.A. Aquarium", "Singapore", 1.2589, 103.8194],
  ["Manila Ocean Park", "Manila, Philippines", 14.5810, 120.9838],
  ["Underwater World Pattaya", "Pattaya, Thailand", 12.9243, 100.8721],
  ["Jakarta Aquarium", "Jakarta, Indonesia", -6.1484, 106.7858],
  ["Aquaria KLCC", "Kuala Lumpur, Malaysia", 3.1527, 101.7118],

  // Oceania
  ["Sydney Sea Life Aquarium", "Sydney, Australia", -33.8700, 151.2022],
  ["Melbourne Sea Life Aquarium", "Melbourne, Australia", -37.8211, 144.9579],
  ["Cairns Aquarium", "Cairns, Australia", -16.9213, 145.7753],
  ["AQWA", "Perth, Australia", -31.8266, 115.7338],
  ["Kelly Tarlton's Sea Life Aquarium", "Auckland, New Zealand", -36.8464, 174.8150],
  ["National Aquarium of New Zealand", "Napier, New Zealand", -39.4836, 176.8942]
];
