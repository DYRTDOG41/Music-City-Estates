// Every display in the Merch Room reads from this catalog.
// Add a verified product or affiliate URL to `purchaseUrl` whenever a real
// store or sponsor is ready. Leave it blank to keep the item in preview mode.
export const sponsorCatalog=[
  {
    id:'crown-tee',
    name:'Word Slaughter Crown Tee',
    brand:'Music City Estates',
    price:'$30',
    category:'Apparel',
    icon:'👕',
    color:0xd9d5d1,
    description:'Heavyweight performance tee with the Word Slaughter crown mark.',
    purchaseUrl:'',
    sponsored:false
  },
  {
    id:'warehouse-hoodie',
    name:'D-A Warehouse Hoodie',
    brand:'Music City Estates',
    price:'$60',
    category:'Apparel',
    icon:'🧥',
    color:0x17171b,
    description:'Black pullover hoodie inspired by the D-A Warehouse battle venue.',
    purchaseUrl:'',
    sponsored:false
  },
  {
    id:'battle-cap',
    name:'Battle Night Crown Cap',
    brand:'Music City Estates',
    price:'$25',
    category:'Headwear',
    icon:'🧢',
    color:0x9f1735,
    description:'Adjustable battle-night cap with an embroidered crown emblem.',
    purchaseUrl:'',
    sponsored:false
  },
  {
    id:'creator-headphones',
    name:'Creator Headphones',
    brand:'Future Sponsor Placement',
    price:'Price set by sponsor',
    category:'Studio Gear',
    icon:'🎧',
    color:0x2b72a8,
    description:'A click-ready studio gear placement reserved for a future retail or equipment sponsor.',
    purchaseUrl:'',
    sponsored:true
  }
];

