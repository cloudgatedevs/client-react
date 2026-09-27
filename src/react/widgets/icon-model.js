const essentials = 'Search House LayoutDashboard Settings SlidersHorizontal User Users Shield Lock KeyRound Mail Bell MessageCircle Calendar Clock Folder FileText Image Upload Download Plus Minus Check X ChevronRight ArrowRight ArrowLeft Ellipsis Pencil Trash Copy Save RefreshCw ExternalLink Link Eye EyeOff Menu PanelLeft Heart Star Sparkles CircleHelp Info CircleAlert CircleCheck CircleX ShoppingCart CreditCard Package Database ChartColumn ChartLine Globe Code Terminal Zap Filter List Grid2x2 Sun Moon Smartphone Monitor'.split(' ');
const essentialRank = new Map(essentials.map((name, index) => [name, index]));
export const iconCategories = [
  { id: 'essentials', label: 'Essentials', matches: name => essentialRank.has(name) },
  { id: 'navigation', label: 'Navigation', matches: name => /^(Arrow|Chevron|Chevrons|Move|Navigation|Compass|Menu|Panel|Layout|Sidebar|ExternalLink|Link|House|Home|Map|Route)/.test(name) },
  { id: 'people', label: 'People & access', matches: name => /^(User|Users|Contact|Person|Accessibility|Hand|Fingerprint|Shield|Lock|Unlock|Key|LogIn|LogOut|IdCard|BadgeCheck)/.test(name) },
  { id: 'content', label: 'Files & editing', matches: name => /^(File|Folder|Notebook|Book|Clipboard|Copy|Pencil|Pen|Eraser|Text|Type|Letter|Align|List|Bold|Italic|Underline|Heading|Quote|Paperclip|Save|Trash|Scissors|Highlighter|Case)/.test(name) },
  { id: 'communication', label: 'Communication', matches: name => /^(Mail|Message|Phone|Bell|Send|Inbox|AtSign|Megaphone|Radio|Rss|Speech|Voicemail)/.test(name) },
  { id: 'data', label: 'Data & development', matches: name => /^(Chart|Trending|Database|Table|Sheet|Columns|Rows|Grid|Gauge|Activity|Code|Terminal|Braces|Brackets|Binary|Bug|Git|Workflow|Webhook|Server|Network|Cpu|Variable|Function|Sigma)/.test(name) },
  { id: 'commerce', label: 'Commerce', matches: name => /^(Shopping|Store|CreditCard|Wallet|Banknote|Coins|Dollar|Euro|Pound|Receipt|Package|Box|Boxes|Truck|Tag|Tags|Ticket|Gift|Percent|BadgeDollar)/.test(name) },
  { id: 'media', label: 'Media & devices', matches: name => /^(Image|Camera|Video|Film|Music|Mic|Headphone|Play|Pause|Skip|Volume|Audio|Tv|Monitor|Smartphone|Tablet|Laptop|Keyboard|Mouse|Printer|Wifi|Bluetooth|Battery|Plug)/.test(name) },
  { id: 'nature', label: 'Nature & weather', matches: name => /^(Sun|Moon|Cloud|Snow|Wind|Rain|Umbrella|Thermometer|Tree|Flower|Leaf|Sprout|Mountain|Waves|Droplet|Flame|Earth|Globe|Bird|Cat|Dog|Fish|Rabbit)/.test(name) },
  { id: 'design', label: 'Design & shapes', matches: name => /^(Circle|Square|Rectangle|Triangle|Hexagon|Octagon|Pentagon|Diamond|Shapes|Shape|Palette|Paint|Brush|Pipette|Swatch|Blend|Contrast|Crop|Frame|Figma|Framer|Spline|Vector|Component|Layers|Blocks)/.test(name) },
  { id: 'status', label: 'Actions & status', matches: name => /^(Check|X$|Plus|Minus|Loader|Refresh|Rotate|Undo|Redo|Repeat|Info|Help|Question|Alert|Badge|Ban|Flag|Bookmark|Heart|Star|Sparkles|Zap|Power|Toggle|CircleCheck|CircleX|CircleAlert)/.test(name) },
  { id: 'places', label: 'Places & travel', matches: name => /^(Building|Landmark|Hospital|School|University|Church|Castle|Factory|Hotel|Warehouse|Door|Fence|Brick|Construction|Car|Bus|Train|Tram|Plane|Ship|Sailboat|Bike|Rocket|Taxi|Luggage|Baggage|Tent|Navigation|MapPin)/.test(name) },
  { id: 'life', label: 'Food & everyday', matches: name => /^(Apple|Banana|Cherry|Citrus|Grape|Carrot|Salad|Sandwich|Pizza|Hamburger|Beef|Fish|Egg|Croissant|Cake|Cookie|Candy|IceCream|Coffee|Cup|Milk|Martini|Wine|Beer|Bottle|Utensils|Cooking|Chef|Bed|Bath|Sofa|Armchair|Lamp|Shirt|Watch|Umbrella|Scissors|Gamepad|Dice|Trophy|Medal|Award|Dumbbell|HeartPulse|Stethoscope|Pill|Syringe)/.test(name) },
];
const synonyms = [
  [/^(House|Home)/, 'home start'], [/Search/, 'find lookup magnify'], [/Settings|Sliders/, 'preferences configure controls'],
  [/Trash/, 'delete remove bin'], [/Pencil|^Pen/, 'edit write'], [/^X$|CircleX/, 'close cancel dismiss'],
  [/Mail/, 'email envelope'], [/Users?/, 'account profile person team'], [/Shield|Lock|Key/, 'security permissions authentication'],
  [/Chart|Trending/, 'analytics graph statistics metrics'], [/CircleHelp/, 'question support help'],
  [/Refresh|Rotate/, 'reload sync repeat'], [/Download|Upload/, 'transfer import export'], [/Bell/, 'notification alert'],
  [/Heart|Star/, 'favorite like rating'], [/Calendar|Clock|Timer/, 'date time schedule'], [/Ellipsis/, 'more options dots'],
  [/Loader/, 'loading busy spinner'], [/CircleCheck|^Check/, 'success done complete'], [/CircleAlert|TriangleAlert/, 'warning error attention'],
];
export const iconLabel = name => name.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export function createIconIndex(icons) {
  return Object.keys(icons).filter(name => /^[A-Z][A-Za-z0-9]*$/.test(name)).map(name => {
    const categories = iconCategories.filter(category => category.matches(name)).map(category => category.id);
    const keywords = synonyms.filter(([pattern]) => pattern.test(name)).map(([, words]) => words).join(' ');
    return { name, label: iconLabel(name), categories,
      search: normalize(`${name} ${keywords} ${iconCategories.filter(category => categories.includes(category.id)).map(category => category.label).join(' ')}`) };
  }).sort((a, b) => (essentialRank.get(a.name) ?? 999) - (essentialRank.get(b.name) ?? 999) || a.name.localeCompare(b.name));
}
export function searchIcons(index, query = '', category = 'all') {
  const words = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  return index.filter(icon => (category === 'all' || (category === 'other' ? !icon.categories.length : icon.categories.includes(category))) && words.every(word => icon.search.includes(word)));
}
export function iconSnippet(name, size = 24, strokeWidth = 2, tone = 'default') {
  // Names come from the installed registry, never arbitrary executable input.
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) throw new Error('Invalid icon component name.');
  return `import { ${name} } from 'lucide-react';\n\n<${name}\n  size={${size}}\n  strokeWidth={${strokeWidth}}${tone === 'accent' ? '\n  style={{ color: "rgb(var(--accent-text))" }}' : ''}\n  aria-hidden="true"\n/>`;
}
