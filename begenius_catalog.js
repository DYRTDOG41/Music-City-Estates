// BeGenius releases are kept in one catalog so the 3D room never needs to be
// rebuilt when a song is added or an official YouTube destination changes.
// The initial links mirror the destinations published on begeniusrecords.com.
export const beGeniusReleases = [
  { id: 'pretty-things', artist: 'Deante’ Hitchcock', title: 'Pretty Things', credit: 'BeGenius production team', youtubeId: '5A_to2kbNf4' },
  { id: 'dangerous-for-you', artist: 'BOB & Chley', title: 'Dangerous For You', credit: 'BeGenius production team', youtubeId: 'bVhba19xc_g' },
  { id: 'cry-bhabie', artist: 'Alabama Barker', title: 'Cry Bhabie', credit: 'BeGenius production team', youtubeId: 'y1M8Ea46MgU' },
  { id: 'konnichiwa', artist: 'Future', title: 'Konnichiwa', credit: 'RushDee / BeGenius production credit', youtubeId: 'gfjCJvbfbGs' },
  { id: 'pay2play', artist: 'Baby Osamaa', title: 'Pay2Play', credit: 'BeGenius production team', youtubeId: 'oUiVVNkuOVA' },
  { id: 'red-rum', artist: 'Chris Brown', title: 'Red Rum', credit: 'RushDee / BeGenius production credit', youtubeId: 'qZtonlwL5kQ' },
  { id: 'bang', artist: 'Courtney Bell, Royce Da 5’9” & Benny the Butcher', title: 'Bang', credit: 'BeGenius production team', youtubeId: 'oByWoTFcC1A' },
  { id: 'momma-dont-worry', artist: 'Lil Wayne, Future & Lil Baby', title: 'Momma Don’t Worry', credit: 'RushDee / BeGenius production credit', youtubeId: 'Gkc6gj9yq6E' },
  { id: 'fallin-4-u', artist: 'Nicki Minaj', title: 'Fallin 4 U', credit: 'RushDee / BeGenius production credit', youtubeId: '-zoFAIR0GxE' },
  { id: 'damaged-goods', artist: 'Serayah', title: 'Damaged Goods', credit: 'BeGenius production team', youtubeId: 'ze-3Ep1E-aI' },
  { id: 'soul', artist: 'Ace Hood', title: 'S.O.U.L.', credit: 'BeGenius production team', youtubeId: 'D8ZjRBI6qyw' },
  { id: 'last-time-i-saw-you', artist: 'Nicki Minaj', title: 'Last Time I Saw You', credit: 'RushDee / BeGenius production credit', youtubeId: 'tjjADhzQKNM' },
  { id: 'cmon-freestyle', artist: 'NLE Choppa', title: 'C’mon Freestyle', credit: 'BeGenius production team', youtubeId: '2PMOFJSc9Mo' }
].map((release) => ({
  ...release,
  thumbnailUrl: `https://i.ytimg.com/vi/${release.youtubeId}/hqdefault.jpg`,
  youtubeUrl: `https://www.youtube.com/watch?v=${release.youtubeId}`
}));

// These are presentation labels, not certification claims. Approved plaque
// photographs can replace each slot later without changing the room layout.
export const beGeniusPlaques = [
  { title: 'RushDee', subtitle: 'Founder & CEO' },
  { title: 'Multi-Platinum', subtitle: 'Producer & Songwriter' },
  { title: 'Grammy-Nominated', subtitle: 'Creative Leadership' },
  { title: 'BeGenius', subtitle: 'Artist Development' },
  { title: 'Film • TV • Gaming', subtitle: 'Sync & Placement Work' },
  { title: 'Music Ownership', subtitle: 'Build Long-Term Careers' }
];
