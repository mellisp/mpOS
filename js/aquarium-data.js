/* Aquarium Dataset — coordinates and metadata sourced from Wikidata (wikidata.org)
   Each entry: [name, city, latitude, longitude, website, year opened] */
const AQUARIUMS = [
  // North America — USA
  ["Georgia Aquarium", "Atlanta, GA, USA", 33.76343, -84.395075, "https://www.georgiaaquarium.org", 2005],
  ["Monterey Bay Aquarium", "Monterey, CA, USA", 36.618253, -121.901481, "https://www.montereybayaquarium.org", 1984],
  ["Shedd Aquarium", "Chicago, IL, USA", 41.867778, -87.613889, "https://www.sheddaquarium.org", 1930],
  ["National Aquarium", "Baltimore, MD, USA", 39.285095, -76.608287, "https://www.aqua.org", 1981],
  ["Aquarium of the Pacific", "Long Beach, CA, USA", 33.76216, -118.19692, "https://www.aquariumofpacific.org", 1998],
  ["Tennessee Aquarium", "Chattanooga, TN, USA", 35.0557, -85.3108, "https://www.tnaqua.org", 1992],
  ["Mystic Aquarium", "Mystic, CT, USA", 41.373611, -71.952778, "https://www.mysticaquarium.org", 1973],
  ["Dallas World Aquarium", "Dallas, TX, USA", 32.78354, -96.80552, "https://www.dwazoo.com", 1992],
  ["Seattle Aquarium", "Seattle, WA, USA", 47.6077, -122.343, "https://www.seattleaquarium.org", 1977],
  ["New England Aquarium", "Boston, MA, USA", 42.359017, -71.050683, "https://www.neaq.org", 1969],
  ["Ripley's Aquarium of Canada", "Toronto, ON, Canada", 43.642481, -79.38605, "https://www.ripleyaquariums.com/canada", null],
  ["Vancouver Aquarium", "Vancouver, BC, Canada", 49.3006, -123.131, "https://www.vanaqua.org", 1956],
  ["Audubon Aquarium of the Americas", "New Orleans, LA, USA", 29.9503, -90.0631, "https://www.auduboninstitute.org/visit/aquarium", 1990],
  ["OdySea Aquarium", "Scottsdale, AZ, USA", 33.554722, -111.877778, "https://www.odyseaaquarium.com", null],
  ["South Carolina Aquarium", "Charleston, SC, USA", 32.791111, -79.925556, "https://www.scaquarium.org", 2000],
  ["Newport Aquarium", "Newport, KY, USA", 39.0944, -84.4976, "https://www.newportaquarium.com", null],
  ["Birch Aquarium", "La Jolla, CA, USA", 32.865833, -117.250556, "https://aquarium.ucsd.edu", null],
  ["Florida Aquarium", "Tampa, FL, USA", 27.9442, -82.445, "https://www.flaquarium.org", 1995],
  ["Waikiki Aquarium", "Honolulu, HI, USA", 21.2659, -157.822, "https://www.waikikiaquarium.org", 1904],
  ["Oregon Coast Aquarium", "Newport, OR, USA", 44.6178, -124.047, "https://www.aquarium.org", 1992],
  ["Clearwater Marine Aquarium", "Clearwater, FL, USA", 27.97686, -82.81907, "https://seewinter.com", 1972],
  ["Loveland Living Planet Aquarium", "Draper, UT, USA", 40.532222, -111.893889, "https://www.thelivingplanet.com", 2014],

  // Central America & Caribbean
  ["Acuario de Veracruz", "Veracruz, Mexico", 19.1973, -96.134, "", null],
  ["Interactive Aquarium Cancun", "Cancun, Mexico", 21.1329, -86.7488, "", null],

  // South America
  ["AquaRio", "Rio de Janeiro, Brazil", -22.893056, -43.192778, "https://www.aquariomarinhodorio.com.br", 2016],
  ["Acqua Mundo", "Guaruja, Brazil", -23.986944, -46.231944, "https://www.acquamundo.com.br", null],

  // Europe — Western
  ["Oceanario de Lisboa", "Lisbon, Portugal", 38.763526, -9.09375, "https://www.oceanario.pt", 1998],
  ["L'Aquarium de Barcelona", "Barcelona, Spain", 41.376667, 2.184167, "https://www.aquariumbcn.com", 1995],
  ["Oceanografic Valencia", "Valencia, Spain", 39.452867, -0.348047, "https://www.cac.es/en/oceanografic", 2003],
  ["Aquarium of Genoa", "Genoa, Italy", 44.41019, 8.926508, "https://www.acquariodigenova.it", 1992],
  ["Nausicaa", "Boulogne-sur-Mer, France", 50.73019, 1.59474, "https://www.nausicaa.co.uk", 1991],
  ["Aquarium de Paris", "Paris, France", 48.86222, 2.29083, "https://www.cineaqua.com", null],
  ["Sea Life London Aquarium", "London, UK", 51.5019, -0.118889, "https://www.visitsealife.com/london", 1992],
  ["The Deep", "Hull, UK", 53.738611, -0.330556, "https://www.thedeep.co.uk", 2002],
  ["National Marine Aquarium", "Plymouth, UK", 50.3666, -4.1313, "https://www.national-aquarium.co.uk", 1998],

  // Europe — Northern
  ["Den Bla Planet", "Copenhagen, Denmark", 55.638, 12.656, "https://denblaaplanet.dk", 1999],
  ["Liseberg Ocean", "Gothenburg, Sweden", 57.6943, 11.9891, "", null],
  ["Sea Life Helsinki", "Helsinki, Finland", 60.1618, 24.9349, "", null],
  ["Polaria", "Tromso, Norway", 69.643685, 18.949871, "https://www.polaria.no", 1998],
  ["Bergen Aquarium", "Bergen, Norway", 60.3997, 5.3038, "https://www.akvariet.no", 1960],

  // Europe — Central & Eastern
  ["Tropicarium Budapest", "Budapest, Hungary", 47.407829, 19.01808, "", null],
  ["Sea Life Munich", "Munich, Germany", 48.1738, 11.5562, "https://www.visitsealife.com/muenchen", null],
  ["Ozeaneum", "Stralsund, Germany", 54.3156, 13.0969, "https://www.ozeaneum.de", 2008],
  ["Moskvarium", "Moscow, Russia", 55.833056, 37.618611, "https://www.moskvarium.ru", 2015],

  // Africa
  ["Two Oceans Aquarium", "Cape Town, South Africa", -33.908056, 18.417667, "https://www.aquarium.co.za", 1995],
  ["uShaka Marine World", "Durban, South Africa", -29.866667, 31.043333, "https://www.ushakamarineworld.co.za", 2004],
  ["Cango Wildlife Ranch", "Oudtshoorn, South Africa", -33.566111, 22.213611, "https://www.cango.co.za", null],

  // Middle East
  ["The Lost Chambers Aquarium", "Dubai, UAE", 25.131909, 55.118356, "", null],
  ["National Aquarium Abu Dhabi", "Abu Dhabi, UAE", 24.402053, 54.495837, "https://thenationalaquarium.ae", 2021],
  ["Istanbul Aquarium", "Istanbul, Turkey", 40.964167, 28.8, "https://www.istanbulakvaryum.com", 2011],
  ["Antalya Aquarium", "Antalya, Turkey", 36.878907, 30.660675, "https://www.antalyaaquarium.com", null],

  // South Asia
  ["Taraporewala Aquarium", "Mumbai, India", 18.9493, 72.8201, "", null],
  ["VGP Marine Kingdom", "Chennai, India", 12.912187, 80.250312, "", null],

  // East Asia — China
  ["Chimelong Ocean Kingdom", "Zhuhai, China", 22.1001, 113.53, "https://zh.chimelong.com/oceankingdom", null],
  ["Shanghai Ocean Aquarium", "Shanghai, China", 31.24255, 121.49717, "https://www.sh-soa.com", null],
  ["Beijing Aquarium", "Beijing, China", 39.943304, 116.334708, "", null],
  ["Ocean Park Hong Kong", "Hong Kong, China", 22.245861, 114.175917, "https://www.oceanpark.com.hk", null],

  // East Asia — Japan
  ["Churaumi Aquarium", "Okinawa, Japan", 26.694389, 127.877944, "https://churaumi.okinawa", 2002],
  ["Osaka Aquarium Kaiyukan", "Osaka, Japan", 34.654472, 135.428889, "https://www.kaiyukan.com", 1990],
  ["Sumida Aquarium", "Tokyo, Japan", 35.709889, 139.809861, "https://www.sumida-aquarium.com", 2012],
  ["Enoshima Aquarium", "Fujisawa, Japan", 35.309667, 139.479889, "https://www.enosui.com", 1952],
  ["Toba Aquarium", "Toba, Japan", 34.4817, 136.846, "https://aquarium.co.jp", 1955],

  // East Asia — South Korea
  ["COEX Aquarium", "Seoul, South Korea", 37.512619, 127.058812, "https://www.coexaqua.com", null],
  ["Aqua Planet Jeju", "Jeju, South Korea", 33.4328, 126.9278, "", null],

  // East Asia — Taiwan
  ["National Museum of Marine Biology and Aquarium", "Pingtung, Taiwan", 22.046485, 120.697678, "https://www.nmmba.gov.tw/english/index.aspx", 2000],

  // Southeast Asia
  ["S.E.A. Aquarium", "Singapore", 1.258611, 103.818611, "https://www.rwsentosa.com/en/play/singapore-oceanarium", null],
  ["Manila Ocean Park", "Manila, Philippines", 14.579306, 120.972486, "https://www.manilaoceanpark.com", 2008],
  ["Underwater World Pattaya", "Pattaya, Thailand", 12.9243, 100.8721, "", null],
  ["Jakarta Aquarium", "Jakarta, Indonesia", -6.175112, 106.789987, "", null],
  ["Aquaria KLCC", "Kuala Lumpur, Malaysia", 3.153393, 101.713078, "https://www.aquariaklcc.com", 2005],

  // Oceania
  ["Sydney Sea Life Aquarium", "Sydney, Australia", -33.8694, 151.202, "https://www.sydneyaquarium.com.au", 1988],
  ["Melbourne Sea Life Aquarium", "Melbourne, Australia", -37.82083, 144.95778, "https://www.visitsealife.com/melbourne", null],
  ["Cairns Aquarium", "Cairns, Australia", -16.918592, 145.773639, "https://www.cairnsaquarium.com.au", null],
  ["AQWA", "Perth, Australia", -31.82668, 115.738118, "https://www.aqwa.com.au", 1988],
  ["Kelly Tarlton's Sea Life Aquarium", "Auckland, New Zealand", -36.845833, 174.817222, "https://www.visitsealife.com/auckland", 1985],
  ["National Aquarium of New Zealand", "Napier, New Zealand", -39.500833, 176.918889, "https://www.nationalaquarium.co.nz", null]
];
