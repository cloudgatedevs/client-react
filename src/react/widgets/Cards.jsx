import { BookOpen, CalendarDays, Check, Clock3, FileText, Flag, FolderKanban, GraduationCap, MapPin, MessageSquare, Minus, Package, Plug, Quote, ShoppingBag, Target, Truck, Users, X } from 'lucide-react';
import { Badge, Checkbox, CountUp, IconButton, Progress } from './primitives.jsx';
import { BarChart, LineChart } from './charts.jsx';
import { CardAvatar, CardFrame, CardIcon, CardMedia, CardMeta, CardPrice, CardRating, CardSave, CardTags } from './card-shared.jsx';
import { cardDate, cardMoney, cardNumber, cardPercent } from './card-model.js';

function Status({status,tone='neutral'}) { return status ? <Badge tone={tone} dot>{status}</Badge> : null; }
function Person({name,avatar,detail}) { return <div className="cgw-pattern-person"><CardAvatar name={name} src={avatar} size="sm" /><div><strong>{name}</strong>{detail && <span>{detail}</span>}</div></div>; }
function Stats({stats,animate=true}) { return stats?.length ? <dl className="cgw-pattern-stats">{stats.map((stat,index)=><div key={index}><dt>{stat.label}</dt><dd>{cardNumber(stat.value)!==null ? <CountUp value={stat.value} formatValue={stat.formatValue} animate={animate} /> : stat.value ?? '—'}</dd></div>)}</dl> : null; }
function Completion({value,label='Progress'}) { const percent=cardPercent(value);return percent===null?null:<Progress label={label} value={percent} />; }
export function CardGrid({children,minCardWidth=260,className='',style}) {
  return <div className={`cgw-card-grid ${className}`} style={{'--cgw-card-min':`${Number.isFinite(minCardWidth)?Math.max(160,minCardWidth):260}px`,...style}}>{children}</div>;
}

export function ProductCard(props) {
  const {title,category,badge,price,compareAtPrice,currency,locale,rating,reviewCount,image,media,available=true,saved,onSavedChange,action}=props;
  return <CardFrame {...props} kind="product" eyebrow={<>{category}{badge && <Badge tone="accent">{badge}</Badge>}</>}
    media={<CardMedia image={image} media={media} icon={ShoppingBag} />} trailing={<CardSave title={title} saved={saved} onSavedChange={onSavedChange} />}
    action={action ? {...action,disabled:action.disabled || !available} : undefined}
    content={<><CardRating rating={rating} reviewCount={reviewCount} /><CardPrice {...{price,compareAtPrice,currency,locale}} />
      {!available && <Badge tone="neutral">Out of stock</Badge>}</>} />;
}
export function CourseCard(props) {
  const {instructor,instructorAvatar,level,lessons,duration,rating,reviewCount,progress,image,media}=props;
  return <CardFrame {...props} kind="course" eyebrow={level} media={<CardMedia image={image} media={media} icon={GraduationCap} />}
    content={<>{instructor && <Person name={instructor} avatar={instructorAvatar} detail="Instructor" />}
      <CardMeta items={[{icon:BookOpen,label:lessons==null?null:`${lessons} lessons`},{icon:Clock3,label:duration}]} />
      <CardRating rating={rating} reviewCount={reviewCount} /><Completion value={progress} label="Course progress" /></>} />;
}
export function MetricChartCard(props) {
  const {title,value,formatValue,trend,trendTone='neutral',comparison,data=[],series=[],xKey='label',chartType='line',animate=true,showDataTable=true}=props;
  const Chart=chartType==='bar'?BarChart:LineChart;
  return <CardFrame {...props} kind="metric-chart" content={<>
    <div className="cgw-pattern-metric"><strong>{cardNumber(value)!==null?<CountUp value={value} formatValue={formatValue} animate={animate} />:value ?? '—'}</strong>
      {trend && <Badge tone={trendTone}>{trend}</Badge>}</div>{comparison && <p className="cgw-pattern-muted">{comparison}</p>}
    <Chart label={`${title} trend`} data={data} series={series} xKey={xKey} formatValue={formatValue} height={190} animate={animate} showDataTable={showDataTable} />
  </>} />;
}
export {Timeline,TimelineCard} from './Timeline.jsx';
export function ArticleCard(props) {
  const {category,image,media,author,authorAvatar,publishedAt,dateTime,readingTime,tags}=props;
  return <CardFrame {...props} kind="article" eyebrow={category} media={<CardMedia image={image} media={media} icon={FileText} />}
    content={<>{author && <Person name={author} avatar={authorAvatar} detail={publishedAt && <time dateTime={dateTime}>{publishedAt}</time>} />}
      <CardMeta items={[{icon:Clock3,label:readingTime}]} /><CardTags tags={tags} /></>} />;
}
export function ProfileCard(props) {
  const {name,avatar,role,location,status,statusTone,stats,tags,animate=true}=props;
  return <CardFrame {...props} kind="profile" title={name} eyebrow={role} leading={<CardAvatar name={name} src={avatar} size="lg" />}
    trailing={<Status status={status} tone={statusTone} />} content={<><CardMeta items={[{icon:MapPin,label:location}]} /><Stats stats={stats} animate={animate} /><CardTags tags={tags} /></>} />;
}
export function ProjectCard(props) {
  const {status,statusTone='accent',progress,dueDate,team=[],tags}=props;
  return <CardFrame {...props} kind="project" leading={<CardIcon icon={FolderKanban} />} trailing={<Status status={status} tone={statusTone} />}
    content={<><CardTags tags={tags} /><Completion value={progress} label="Project progress" /><div className="cgw-pattern-between">
      <CardMeta items={[{icon:CalendarDays,label:dueDate}]} />{!!team.length && <div className="cgw-pattern-team" aria-label={`Team: ${team.map(member=>member.name).join(', ')}`}>
        {team.slice(0,4).map((member,index)=><CardAvatar key={member.id ?? index} name={member.name} src={member.avatar} size="sm" />)}
        {team.length>4 && <span className="cgw-pattern-team-more">+{team.length-4}</span>}</div>}
    </div></>} />;
}
export function TaskCard(props) {
  const {title,checked=false,onCheckedChange,priority,priorityTone='neutral',assignee,assigneeAvatar,dueDate,tags}=props;
  return <CardFrame {...props} kind="task" className={`${checked?'cgw-pattern-task--done':''} ${props.className || ''}`}
    leading={onCheckedChange && <Checkbox label={<span className="cgw-sr-only">Complete {title}</span>} checked={checked} disabled={props.disabled} onChange={event=>onCheckedChange(event.target.checked)} />}
    trailing={priority && <Badge tone={priorityTone}><Flag size={12} aria-hidden="true" />{priority}</Badge>}
    content={<><CardTags tags={tags} /><div className="cgw-pattern-between">{assignee && <Person name={assignee} avatar={assigneeAvatar} />}
      <CardMeta items={[{icon:CalendarDays,label:dueDate}]} /></div>{checked && <Badge tone="success">Completed</Badge>}</>} />;
}
export function EventCard(props) {
  const {date,time,location,attendees,category,locale,image,media}=props,dateInfo=cardDate(date,locale);
  return <CardFrame {...props} kind="event" eyebrow={category} media={(image || media) && <CardMedia image={image} media={media} icon={CalendarDays} />}
    leading={dateInfo && <time className="cgw-pattern-date" dateTime={date} aria-label={dateInfo.label}><span>{dateInfo.month}</span><strong>{dateInfo.day}</strong></time>}
    content={<CardMeta items={[{icon:Clock3,label:time},{icon:MapPin,label:location},{icon:Users,label:attendees==null?null:`${attendees.toLocaleString()} attending`}]} />} />;
}
export function PricingCard(props) {
  const {name,price,currency,locale,period='per month',features=[],featured=false,badge}=props;
  return <CardFrame {...props} kind="pricing" title={name} featured={featured} trailing={badge && <Badge tone="accent">{badge}</Badge>}
    content={<><CardPrice price={price} currency={currency} locale={locale} priceSuffix={period} /><ul className="cgw-pattern-features">
      {features.map((item,index)=>{const feature=typeof item==='string'?{label:item,included:true}:item,Icon=feature.included===false?Minus:Check;
        return <li key={index} data-excluded={feature.included===false || undefined}><Icon size={16} aria-hidden="true" />
          <span>{feature.included===false && <span className="cgw-sr-only">Not included: </span>}{feature.label}</span></li>;})}
    </ul></>} />;
}
export function FileCard(props) {
  const {name,fileType,size,updatedAt,owner,icon=FileText,tags}=props;
  return <CardFrame {...props} kind="file" title={name} eyebrow={fileType} leading={<CardIcon icon={icon} />}
    content={<><CardMeta items={[{label:size},{icon:Clock3,label:updatedAt},{icon:Users,label:owner}]} /><CardTags tags={tags} /></>} />;
}
export function TestimonialCard(props) {
  const {name,avatar,role,quote,rating}=props;
  return <CardFrame {...props} kind="testimonial" title={name} leading={<CardAvatar name={name} src={avatar} />} eyebrow={role}
    content={<><Quote size={26} className="cgw-pattern-quote-icon" aria-hidden="true" /><blockquote className="cgw-pattern-quote">{quote}</blockquote><CardRating rating={rating} /></>} />;
}
export function JobCard(props) {
  const {company,logo,location,employmentType,compensation,tags,postedAt}=props;
  return <CardFrame {...props} kind="job" eyebrow={company} leading={<CardAvatar name={company} src={logo} />}
    content={<><CardMeta items={[{icon:MapPin,label:location},{icon:Clock3,label:employmentType}]} />
      {compensation && <strong className="cgw-pattern-compensation">{compensation}</strong>}<CardTags tags={tags} />{postedAt && <p className="cgw-pattern-muted">{postedAt}</p>}</>} />;
}
export function ListingCard(props) {
  const {title,image,media,location,price,currency,locale,priceSuffix,highlights,rating,reviewCount,saved,onSavedChange,badge}=props;
  return <CardFrame {...props} kind="listing" eyebrow={badge && <Badge tone="accent">{badge}</Badge>} media={<CardMedia image={image} media={media} icon={MapPin} />}
    trailing={<CardSave title={title} saved={saved} onSavedChange={onSavedChange} />}
    content={<><CardMeta items={[{icon:MapPin,label:location}]} /><CardRating rating={rating} reviewCount={reviewCount} /><CardTags tags={highlights} />
      <CardPrice {...{price,currency,locale,priceSuffix}} /></>} />;
}
export function GoalCard(props) {
  const {value,target,formatValue=(number)=>number.toLocaleString(),deadline,animate=true,tone='accent'}=props,percent=cardPercent(value,target);
  return <CardFrame {...props} kind="goal" leading={<CardIcon icon={Target} tone={tone} />}
    content={<><div className="cgw-pattern-metric"><strong>{cardNumber(value)!==null?<CountUp value={value} formatValue={formatValue} animate={animate} />:'—'}</strong>
      <span className="cgw-pattern-muted">{cardNumber(target)!==null && target>0?`of ${formatValue(target)}`:'No target set'}</span></div>
      {percent!==null && <Progress value={percent} label="Goal progress" />}<CardMeta items={[{icon:CalendarDays,label:deadline}]} />
      {percent===100 && <Badge tone="success">Target reached</Badge>}</>} />;
}
export function NotificationCard(props) {
  const {title,time,dateTime,unread=false,tone='info',icon=MessageSquare,onDismiss}=props;
  return <CardFrame {...props} kind="notification" className={`${unread?'cgw-pattern-notification--unread':''} ${props.className || ''}`}
    leading={<CardIcon icon={icon} tone={tone} />} eyebrow={<>{time && <time dateTime={dateTime}>{time}</time>}{unread && <Badge tone="accent" dot>Unread</Badge>}</>}
    trailing={onDismiss && <IconButton size="sm" icon={X} label={`Dismiss ${title}`} disabled={props.disabled} onClick={onDismiss} />} />;
}
export function IntegrationCard(props) {
  const {name,icon=Plug,status='Not connected',statusTone='neutral',account,tags}=props;
  return <CardFrame {...props} kind="integration" title={name} leading={<CardIcon icon={icon} />} trailing={<Status status={status} tone={statusTone} />}
    content={<>{account && <p className="cgw-pattern-muted">{account}</p>}<CardTags tags={tags} /></>} />;
}
export function OrderCard(props) {
  const {orderNumber,status,statusTone='neutral',placedAt,items=[],total,currency,locale,deliveryLabel}=props;
  return <CardFrame {...props} kind="order" title={`Order ${orderNumber}`} eyebrow={placedAt} leading={<CardIcon icon={Package} />}
    trailing={<Status status={status} tone={statusTone} />} content={<><ul className="cgw-pattern-order-items">
      {items.map((item,index)=><li key={item.id ?? index}><span>{item.name}<small>Quantity {item.quantity ?? 1}</small></span><strong>{cardMoney(item.amount,currency,locale)}</strong></li>)}
    </ul><div className="cgw-pattern-order-total"><span>Total</span><strong>{cardMoney(total,currency,locale)}</strong></div>
    <CardMeta items={[{icon:Truck,label:deliveryLabel}]} /></>} />;
}
