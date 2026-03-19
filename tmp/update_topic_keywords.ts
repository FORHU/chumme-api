import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const keywordMap: Record<string, string[]> = {
  // K-Pop
  "BTS": ["bts", "bangtan boys", "bts mv", "bts live", "bts fancam", "bts funny", "bts run"],
  "BLACKPINK": ["blackpink", "blackpink mv", "blackpink live", "born pink", "blink"],
  "EXO": ["exo", "exo live", "exo mv", "exo performance"],
  "TWICE": ["twice", "twice mv", "twice fancam", "once"],
  "SEVENTEEN": ["seventeen", "svt", "seventeen mv", "going seventeen"],
  "Stray Kids": ["stray kids", "skz", "stray kids mv", "stray kids performance"],
  "NCT": ["nct", "nct 127", "nct dream", "nct mv"],
  "Red Velvet": ["red velvet", "red velvet mv", "red velvet live", "reveluv"],
  "ITZY": ["itzy", "itzy mv", "itzy dance practice"],
  "ATEEZ": ["ateez", "ateez mv", "ateez live"],
  "ENHYPEN": ["enhypen", "enhypen mv", "enhypen cover"],
  "TXT": ["txt", "tomorrow x together", "txt mv"],
  "LE SSERAFIM": ["le sserafim", "le sserafim mv", "le sserafim dance"],
  "IVE": ["ive", "ive mv", "ive live", "wonyoung"],
  "NewJeans": ["newjeans", "new jeans mv", "newjeans live", "nwjns"],
  "(G)I-DLE": ["(g)i-dle", "g idle", "g idle mv", "soyeon"],
  "MAMAMOO": ["mamamoo", "mamamoo live", "mamamoo vocal"],
  "BIGBANG": ["bigbang", "big bang live", "bigbang mv"],
  "Super Junior": ["super junior", "suju", "super junior mv"],
  "Girls’ Generation": ["girls generation", "snsd", "snsd mv"],
  "IU": ["iu", "iu live", "iu concert", "lee ji-eun"],
  "Taeyeon": ["taeyeon", "taeyeon live", "taeyeon vocal"],
  "Baekhyun": ["baekhyun", "baekhyun live", "baekhyun solo"],
  "Taemin": ["taemin", "taemin dance", "taemin solo"],
  "Jennie": ["jennie", "jennie blackpink", "jennie solo"],
  "Lisa": ["lisa", "lisa blackpink", "lisa dance", "lisa solo"],
  "Rosé": ["rose", "rose blackpink", "rose solo", "rose cover"],
  "Jisoo": ["jisoo", "jisoo blackpink", "jisoo solo"],

  // Rock
  "Queen": ["queen band", "queen live", "freddie mercury"],
  "The Beatles": ["the beatles", "beatles live", "beatles remastered"],
  "Led Zeppelin": ["led zeppelin", "led zeppelin live", "led zep"],
  "Pink Floyd": ["pink floyd", "pink floyd live", "pink floyd full album"],
  "Nirvana": ["nirvana", "nirvana live", "kurt cobain"],
  "Metallica": ["metallica", "metallica live", "metallica concert"],
  "Guns N' Roses": ["guns n roses", "gnr", "guns and roses live"],
  "AC/DC": ["ac/dc", "acdc live", "ac/dc concert"],
  "Linkin Park": ["linkin park", "linkin park live", "chester bennington"],
  "Foo Fighters": ["foo fighters", "foo fighters live", "dave grohl"],
  "Red Hot Chili Peppers": ["red hot chili peppers", "rhcp", "rhcp live"],
  "Green Day": ["green day", "green day live", "green day concert"],
  "Arctic Monkeys": ["arctic monkeys", "arctic monkeys live"],
  "The Rolling Stones": ["rolling stones", "rolling stones live", "mick jagger"],

  // NBA
  "LeBron James": ["lebron james", "lebron highlights", "lebron dunks", "lakers lebron"],
  "Stephen Curry": ["stephen curry", "steph curry highlights", "curry 3 pointers", "warriors steph"],
  "Kevin Durant": ["kevin durant", "kd highlights", "durant scoring"],
  "Giannis Antetokounmpo": ["giannis antetokounmpo", "giannis highlights", "greek freak"],
  "Luka Dončić": ["luka doncic", "luka highlights", "luka magic"],
  "Nikola Jokić": ["nikola jokic", "jokic highlights", "jokic passes"],
  "Joel Embiid": ["joel embiid", "embiid highlights", "embiid mvp"],
  "Jayson Tatum": ["jayson tatum", "tatum highlights", "celtics tatum"],
  "Kawhi Leonard": ["kawhi leonard", "kawhi highlights", "the claw"],
  "Damian Lillard": ["damian lillard", "dame time", "lillard highlights"],
  "Anthony Davis": ["anthony davis", "ad highlights", "lakers ad"],
  "Jimmy Butler": ["jimmy butler", "jimmy buckets", "butler highlights"],
  "Devin Booker": ["devin booker", "booker highlights", "suns booker"],
  "Ja Morant": ["ja morant", "ja morant dunks", "morant highlights"],

  // Streetball
  "Rafer Alston (Skip to My Lou)": ["rafer alston", "skip to my lou", "and1 skip to my lou"],
  "Grayson Boucher (The Professor)": ["the professor", "the professor basketball", "grayson boucher"],
  "Troy Jackson (Escalade)": ["escalade and1", "troy jackson basketball", "escalade streetball"],
  "Philip Champion (Hot Sauce)": ["hot sauce and1", "hot sauce streetball", "hot sauce crosses"],
  "Waliyy Dixon (Main Event)": ["main event and1", "main event basketball"],
  "Larry Williams (Bone Collector)": ["bone collector", "bone collector basketball", "bone collector crosses"],
  "Brandon Armstrong": ["bdotadot5", "brandon armstrong", "nba impersonations"],
  "Guy Dupuy": ["guy dupuy", "guy dupuy dunk", "frequent flyer dunk"],
  "Jordan Kilganon": ["jordan kilganon", "kilganon dunks", "scorpion dunk"],

  // Indoor Volleyball
  "USA Men's National Team": ["usa volleyball mens", "usa mens volleyball", "usa volleyball highlights"],
  "Brazil Women's National Team": ["brazil womens volleyball", "volei feminino brasil"],
  "Italy Men's Club Teams": ["superlega volley", "italy volleyball club", "italian volleyball league"],
  "Korea Volleyball League Teams": ["kovo volleyball", "korean volleyball league"],
  "Philippine Super Liga Teams": ["pvl volleyball", "philippine volleyball league", "pvl highlights"],
  "Top Players": ["volleyball highlights", "volleyball spikes", "best volleyball players"],
  "Olympic Champions": ["olympic volleyball", "olympic volleyball finals"],
  
  // Beach Volleyball
  "FIVB Beach Volleyball World Tour": ["fivb beach volleyball", "beach pro tour", "fivb beach highlights"],
  "Olympic Beach Volleyball": ["olympic beach volleyball", "beach volleyball olympics"],
  "AVP Pro Beach Tour": ["avp beach volleyball", "avp tour highlights"],
  "Phil Dalhausser": ["phil dalhausser", "dalhausser blocks"],
  "Kerri Walsh Jennings": ["kerri walsh jennings", "kerri walsh blocks"],
  "Misty May-Treanor": ["misty may treanor", "misty may defense"],
  "Alison Cerutti": ["alison cerutti", "mamute beach volleyball"],
  "Ágatha Bednarczuk": ["agatha bednarczuk", "agatha beach volleyball"],
  "Sarah Pavan": ["sarah pavan", "sarah pavan blocks"],

  // Gaming
  "LOL Worlds": ["lol worlds", "league of legends worlds", "worlds highlights"],
  "Faker": ["faker", "faker highlights", "faker montages", "t1 faker"],
  "KDA": ["kda", "kda music", "kda league of legends", "pop stars kda"],
  "LoL Esports": ["lol esports", "lck highlights", "lcs highlights", "lec highlights"],
  "Champion Guides": ["lol champion guide", "league of legends gameplay", "lol challenger replay"],
};

async function generateKeywords() {
  console.log("Generating discovery keywords for Topic Categories...");
  const topics = await prisma.chummeTopicCategory.findMany();
  
  let updatedCount = 0;
  
  for (const topic of topics) {
    // If it has NO discoveryKeywords, or we want to overwrite it
    const newKeywords = keywordMap[topic.name];
    
    if (newKeywords && newKeywords.length > 0) {
      // Ensure we only store unique keywords
      const currentKeywords = new Set(topic.discoveryKeywords || []);
      newKeywords.forEach(k => currentKeywords.add(k));
      
      const mergedKeywords = Array.from(currentKeywords);
      
      await prisma.chummeTopicCategory.update({
        where: { id: topic.id },
        data: { discoveryKeywords: mergedKeywords }
      });
      
      console.log(`Updated [${topic.name}]: ${mergedKeywords.join(", ")}`);
      updatedCount++;
    } else {
      // Fallback: Just use the topic name itself as a generic keyword
      if (!topic.discoveryKeywords || topic.discoveryKeywords.length === 0) {
        await prisma.chummeTopicCategory.update({
          where: { id: topic.id },
          data: { discoveryKeywords: [topic.name.toLowerCase()] }
        });
        console.log(`Updated [${topic.name}]: fallback generic keyword -> ${topic.name.toLowerCase()}`);
        updatedCount++;
      }
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} Topic Categories with specific Discovery Keywords!`);
}

generateKeywords()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
