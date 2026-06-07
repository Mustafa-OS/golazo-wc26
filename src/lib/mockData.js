// ============================================================================
// MOCK DATA
// ----------------------------------------------------------------------------
// Lets the whole app run + look real with `npm run dev` before any Firebase /
// API-Football wiring exists. Once the Cloud Functions are live, the same
// shapes come out of Firestore and this file is no longer imported.
// Shapes mirror what functions/apiFootball.js -> normaliseMatch produces.
// ============================================================================

const sq = (team, code, players) =>
  players.map((p, i) => ({
    id: `${code}-${i}`,
    name: p[0],
    position: p[1],
    team,
    teamCode: code,
  }));

export const MOCK_MATCHES = [
  {
    id: 'm-eng-cro',
    kickoff: '2026-06-14T20:00:00Z',
    stage: 'Group L',
    home: {
      name: 'England', code: 'ENG', flag: '🏴',
      players: sq('England', 'ENG', [
        ['Pickford', 'G'], ['Walker', 'D'], ['Stones', 'D'], ['Saka', 'F'],
        ['Bellingham', 'M'], ['Rice', 'M'], ['Foden', 'M'], ['Kane', 'F'],
        ['Palmer', 'M'], ['Trippier', 'D'], ['Watkins', 'F'],
      ]),
    },
    away: {
      name: 'Croatia', code: 'CRO', flag: '🇭🇷',
      players: sq('Croatia', 'CRO', [
        ['Livaković', 'G'], ['Gvardiol', 'D'], ['Modrić', 'M'], ['Kovačić', 'M'],
        ['Kramarić', 'F'], ['Perišić', 'F'], ['Sutalo', 'D'], ['Majer', 'M'],
        ['Budimir', 'F'], ['Juranović', 'D'], ['Pašalić', 'M'],
      ]),
    },
  },
  {
    id: 'm-arg-alg',
    kickoff: '2026-06-16T23:00:00Z',
    stage: 'Group J',
    home: {
      name: 'Argentina', code: 'ARG', flag: '🇦🇷',
      players: sq('Argentina', 'ARG', [
        ['E. Martínez', 'G'], ['Molina', 'D'], ['Otamendi', 'D'], ['Mac Allister', 'M'],
        ['Fernández', 'M'], ['Messi', 'F'], ['Álvarez', 'F'], ['Di María', 'F'],
        ['Tagliafico', 'D'], ['De Paul', 'M'], ['L. Martínez', 'F'],
      ]),
    },
    away: {
      name: 'Algeria', code: 'ALG', flag: '🇩🇿',
      players: sq('Algeria', 'ALG', [
        ['Mandrea', 'G'], ['Mandi', 'D'], ['Bensebaini', 'D'], ['Bennacer', 'M'],
        ['Mahrez', 'F'], ['Bounedjah', 'F'], ['Atal', 'D'], ['Zerrouki', 'M'],
        ['Amoura', 'F'], ['Aït-Nouri', 'D'], ['Gouiri', 'F'],
      ]),
    },
  },
  {
    id: 'm-bra-ger',
    kickoff: '2026-06-17T19:00:00Z',
    stage: 'Group C',
    home: {
      name: 'Brazil', code: 'BRA', flag: '🇧🇷',
      players: sq('Brazil', 'BRA', [
        ['Alisson', 'G'], ['Marquinhos', 'D'], ['Militão', 'D'], ['Danilo', 'D'],
        ['Casemiro', 'M'], ['Bruno G.', 'M'], ['Raphinha', 'F'], ['Vinícius Jr', 'F'],
        ['Rodrygo', 'F'], ['Neymar', 'F'], ['Endrick', 'F'],
      ]),
    },
    away: {
      name: 'Germany', code: 'GER', flag: '🇩🇪',
      players: sq('Germany', 'GER', [
        ['Neuer', 'G'], ['Rüdiger', 'D'], ['Tah', 'D'], ['Raum', 'D'],
        ['Kimmich', 'M'], ['Gündoğan', 'M'], ['Musiala', 'M'], ['Wirtz', 'M'],
        ['Sané', 'F'], ['Havertz', 'F'], ['Füllkrug', 'F'],
      ]),
    },
  },
  {
    id: 'm-fra-esp',
    kickoff: '2026-06-18T19:00:00Z',
    stage: 'Group D',
    home: {
      name: 'France', code: 'FRA', flag: '🇫🇷',
      players: sq('France', 'FRA', [
        ['Maignan', 'G'], ['Koundé', 'D'], ['Saliba', 'D'], ['T. Hernández', 'D'],
        ['Tchouaméni', 'M'], ['Camavinga', 'M'], ['Rabiot', 'M'], ['Griezmann', 'F'],
        ['Dembélé', 'F'], ['Mbappé', 'F'], ['Thuram', 'F'],
      ]),
    },
    away: {
      name: 'Spain', code: 'ESP', flag: '🇪🇸',
      players: sq('Spain', 'ESP', [
        ['U. Simón', 'G'], ['Carvajal', 'D'], ['Le Normand', 'D'], ['Cucurella', 'D'],
        ['Rodri', 'M'], ['Pedri', 'M'], ['Gavi', 'M'], ['D. Olmo', 'M'],
        ['Yamal', 'F'], ['N. Williams', 'F'], ['Morata', 'F'],
      ]),
    },
  },
];

// A few fake humans for the leaderboard so it never looks empty in dev.
export const MOCK_LEADERBOARD = [
  { uid: 'u1', name: 'Aryan K.', dept: 'EEE', points: 412, streak: 4 },
  { uid: 'u2', name: 'Priya S.', dept: 'Computing', points: 388, streak: 2 },
  { uid: 'u3', name: 'Tom H.', dept: 'Mech Eng', points: 351, streak: 0 },
  { uid: 'me', name: 'You', dept: 'Design Eng', points: 309, streak: 3 },
  { uid: 'u4', name: 'Wei L.', dept: 'Maths', points: 297, streak: 1 },
  { uid: 'u5', name: 'Sofia R.', dept: 'Bioeng', points: 244, streak: 0 },
];
