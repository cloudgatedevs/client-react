import {cardIndex} from './card-index.js';
import {cardSamples} from './card-examples.js';
const specific={
  "product-card": [
    [
      "price / compareAtPrice / currency / locale",
      "number / string",
      "Price is numeric (zero is valid); currency defaults to USD. A higher compare-at price is crossed out. Invalid or missing amounts display —."
    ],
    [
      "available",
      "boolean",
      "Defaults true. False shows Out of stock and disables the primary action."
    ],
    [
      "saved / onSavedChange",
      "boolean / (saved)=>void",
      "Controlled saved-item toggle; omitted unless a callback is provided."
    ],
    [
      "rating / reviewCount",
      "number",
      "Optional accessible rating (0–5) and review count."
    ],
    [
      "category / badge",
      "ReactNode",
      "Optional category and merchandising badge."
    ]
  ],
  "course-card": [
    [
      "instructor / instructorAvatar / level",
      "string",
      "Instructor identity, optional avatar URL and course level."
    ],
    [
      "lessons / duration / progress",
      "number / ReactNode / number",
      "Lesson count, display duration, completion 0–100. Missing progress is hidden; zero is displayed."
    ],
    [
      "rating / reviewCount",
      "number",
      "Optional rating and review count."
    ]
  ],
  "metric-chart-card": [
    [
      "value / formatValue / animate",
      "number | ReactNode / function / boolean",
      "Numeric values count up. The formatter also formats the chart; use consistent units. Animation respects reduced motion."
    ],
    [
      "data / series / xKey / chartType",
      "Record[] / ChartSeries[] / string / line|bar",
      "Existing SDK line or bar chart. xKey defaults label. series describes numeric measures."
    ],
    [
      "trend / trendTone / comparison",
      "ReactNode / Tone / ReactNode",
      "Caller supplies trend wording and whether it is good or bad; color never determines meaning automatically."
    ],
    [
      "showDataTable",
      "boolean",
      "Defaults true. Accessible values and Excel export beneath the graph."
    ]
  ],
  "timeline-card": [
    [
      "time / dateTime / actor / actorAvatar",
      "string",
      "Display time plus optional ISO datetime for the time element, actor and avatar URL."
    ],
    [
      "icon / tone / status / tags",
      "Icon / Tone / ReactNode / string[]",
      "Decorative event marker, status and tags."
    ],
    [
      "Timeline",
      "See the timeline widget entry",
      "Use the dedicated Timeline widget for connected events, activity feeds, milestones, grouping and progressive loading. TimelineCard remains the standalone entry."
    ]
  ],
  "article-card": [
    [
      "category / author / authorAvatar",
      "string",
      "Editorial category and author identity."
    ],
    [
      "publishedAt / dateTime / readingTime / tags",
      "string / string[]",
      "Display date, optional ISO datetime, reading-time text and tags. description is the excerpt."
    ]
  ],
  "profile-card": [
    [
      "name / role / avatar / location",
      "string",
      "Required name; optional role, avatar URL and location."
    ],
    [
      "stats / animate",
      "{label,value,formatValue?}[] / boolean",
      "Numeric statistics count up, respect reduced motion and expose final accessible values."
    ],
    [
      "status / statusTone / tags",
      "ReactNode / Tone / string[]",
      "Availability text and skills."
    ]
  ],
  "project-card": [
    [
      "progress / dueDate / status / statusTone",
      "number / ReactNode / Tone",
      "Completion 0–100, explicit due-date text and status."
    ],
    [
      "team / tags",
      "{id?,name,avatar?}[] / string[]",
      "Up to four visible avatars and an overflow count; every name remains in the team label."
    ]
  ],
  "task-card": [
    [
      "checked / onCheckedChange",
      "boolean / (checked)=>void",
      "Controlled completion checkbox. No callback means no checkbox; changing it does not persist until the caller saves."
    ],
    [
      "priority / priorityTone / assignee / assigneeAvatar / dueDate / tags",
      "ReactNode / Tone / string[]",
      "Priority, owner, due-date text and tags. Completed tasks retain their actions."
    ]
  ],
  "event-card": [
    [
      "date / locale",
      "string",
      "ISO date or datetime. Date-only values retain their calendar day across time zones. Invalid dates omit the date tile."
    ],
    [
      "time / location / attendees / category",
      "ReactNode / number",
      "Caller-formatted time with timezone, location and attendance count."
    ]
  ],
  "pricing-card": [
    [
      "name / price / currency / locale / period",
      "string / number",
      "Plan name, numeric price, currency and explicit billing basis (default per month). Zero is a valid free price."
    ],
    [
      "features",
      "(string | {label,included?})[]",
      "Features with check marks; excluded features have explicit accessible Not included text."
    ],
    [
      "featured / badge",
      "boolean / ReactNode",
      "Highlighted border and optional recommendation text; no payment occurs automatically."
    ]
  ],
  "file-card": [
    [
      "name / fileType / size / updatedAt / owner / icon / tags",
      "string / Icon / string[]",
      "File identity and caller-formatted metadata. Use action.href for a real download or action.onClick for a preview."
    ]
  ],
  "testimonial-card": [
    [
      "name / role / avatar / quote / rating",
      "string / ReactNode / number",
      "Attribution, quote and optional 0–5 rating. Quotes render as text, never HTML."
    ]
  ],
  "job-card": [
    [
      "company / logo / location / employmentType / compensation / postedAt / tags",
      "string / ReactNode / string[]",
      "Company identity and caller-formatted hiring details. Compensation is display text so ranges and units remain explicit."
    ]
  ],
  "listing-card": [
    [
      "location / price / currency / locale / priceSuffix / highlights",
      "string / number / string[]",
      "Location, numeric price, explicit price basis and amenities."
    ],
    [
      "saved / onSavedChange / rating / reviewCount / badge",
      "boolean / callback / number",
      "Controlled saved listing, optional rating and label."
    ]
  ],
  "goal-card": [
    [
      "value / target / formatValue / animate",
      "number / function / boolean",
      "Count up the current value; progress clamps 0–100. A non-positive or missing target shows No target set. Overshoot retains the actual value."
    ],
    [
      "deadline / tone",
      "ReactNode / Tone",
      "Explicit deadline text and marker tone."
    ]
  ],
  "notification-card": [
    [
      "time / dateTime / unread / tone / icon",
      "string / boolean / Tone / Icon",
      "Display time, ISO datetime, visible unread badge and decorative marker."
    ],
    [
      "onDismiss",
      "()=>void",
      "Controlled dismissal: the parent removes the notification. No automatic read/write operation."
    ]
  ],
  "integration-card": [
    [
      "name / icon / status / statusTone / account / tags",
      "string / Icon / Tone / string[]",
      "Connection identity and state. Call the authorized connection API in your action handler; this component does not connect services itself."
    ]
  ],
  "order-card": [
    [
      "orderNumber / placedAt / status / statusTone / deliveryLabel",
      "string / Tone",
      "Order identifier and caller-formatted status/date/delivery details."
    ],
    [
      "items / total / currency / locale",
      "{id?,name,quantity?,amount?}[] / number",
      "amount is the complete line total, not unit price. total is provided by the caller (including any tax/shipping). The card does not compute financial totals."
    ]
  ]
};
const interactions={
  "product-card": "saved={selected} onSavedChange={setSelected} action={{label:'Add to cart',onClick:()=>setMessage('Added to the sample cart.')}}",
  "course-card": "progress={progress} action={{label:'Continue learning',onClick:()=>setProgress(value=>Math.min(100,value+10))}}",
  "metric-chart-card": "formatValue={value=>'$'+Math.round(value).toLocaleString()}",
  "timeline-card": "action={{label:'View activity',onClick:()=>setMessage('Activity selected.')}}",
  "profile-card": "action={{label:selected?'Following':'Follow',onClick:()=>setSelected(value=>!value)}}",
  "task-card": "checked={selected} onCheckedChange={setSelected}",
  "integration-card": "status={selected?'Connected':'Not connected'} statusTone={selected?'success':'neutral'} action={{label:selected?'Disconnect':'Connect',onClick:()=>setSelected(value=>!value)}}",
  "listing-card": "saved={selected} onSavedChange={setSelected} action={{label:'Check availability',onClick:()=>setMessage('Availability requested in this example.')}}",
  "notification-card": "unread={!selected} action={{label:'Mark as read',onClick:()=>setSelected(true)}}",
  "goal-card": "value={740+progress} action={{label:'Add progress',onClick:()=>setProgress(value=>value+50)}}",
  "testimonial-card": ""
};
const common=[
  {name:'title / name / description / headingLevel / titleHref',type:'string / ReactNode / 2–6',description:'Use a string title for content cards, name for identity/plan/file cards and orderNumber for orders. description accepts ReactNode. Semantic heading level 2–6 (default 3). Optional titleHref link; never wrap a whole card containing controls in an anchor.'},
  {name:'action / secondaryAction',type:'CardAction',description:'{label,onClick?,href?,icon?,variant?,appearance?,disabled?,loading?}. Uses Button variants and solid/soft/outline appearances. Buttons require a handler. href uses an anchor; disabled/loading removes navigation. Handle async pending/errors in the caller and authorize server operations.'},
  {name:'loading / error / onRetry / empty / disabled',type:'boolean / Error|string / ()=>void',description:'Loading skeleton hides actions; error and empty replace the body. disabled disables built-in actions and controls. Custom children/footer must handle their own permissions and disabled state.'},
  {name:'children / footer / className / style',type:'ReactNode / CSS',description:'Compose additional content and footer information. Inherits theme, palette, spacing and surface tokens; no provider or router required.'},
];
const media={name:'image / media',type:'{src,alt,position?} / ReactNode',description:'Optional image with meaningful alt text and object position, or custom media content. Images load lazily and fall back on failure. Custom media is responsible for its accessibility.'};
export const cardWidgets=cardIndex.map(card=>({
  ...card,exports:[card.exportName],
  props:[...common,...(['product-card','course-card','article-card','listing-card','event-card'].includes(card.id)?[media]:[]),
    ...specific[card.id].map(([name,type,description])=>({name,type,description}))],
  example:`import { useState } from 'react';\nimport { ${card.exportName}, CardGrid, Alert } from '@cloudgatedevs/cloudgate-client-react/react/widgets';\n\nconst sample = ${JSON.stringify(cardSamples[card.id],null,2)};\n\n// Gallery data and local handlers. Connect actions to your application's APIs.\nexport default function Example() {\n  const [selected,setSelected]=useState(false), [progress,setProgress]=useState(38), [message,setMessage]=useState('');\n  return <div className="cgw-stack"><CardGrid minCardWidth={280}>\n    <${card.exportName} {...sample} ${interactions[card.id] ?? "action={{label:'View details',onClick:()=>setMessage('Sample item selected.')}}"} />\n  </CardGrid>{message && <Alert tone="success">{message}</Alert>}</div>;\n}`,
}));
export const cardGalleryWidget={
  id:'cards',name:'Card gallery',category:'Cards',exports:['CardGrid'],
  description:'Reusable card patterns for commerce, learning, dashboards, people, projects, bookings and activity.',
  props:[{name:'children / minCardWidth / className / style',type:'ReactNode / number / CSS',description:'Responsive grid with theme-aware gaps. minCardWidth defaults 260px; cards stack when the container is narrower. Use stable keys for lists.'}],
  example:`import { CardGrid, ProductCard, CourseCard, GoalCard } from '@cloudgatedevs/cloudgate-client-react/react/widgets';\nexport default function Example() {\n  return <CardGrid minCardWidth={280}>\n    <ProductCard title="Studio headphones" price={129} currency="USD" titleHref="/store/headphones" />\n    <CourseCard title="Designing digital products" instructor="Maya Chen" lessons={24} progress={38} titleHref="/courses/design" />\n    <GoalCard title="Community members" value={740} target={1000} />\n  </CardGrid>;\n}`,
};
