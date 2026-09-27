import { createContext, useContext, useId, useState } from 'react';
import { Heart, Image as ImageIcon, LoaderCircle, Star, UserRound } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, IconButton, Skeleton } from './primitives.jsx';
import { cardInitials, cardMoney, cardNumber } from './card-model.js';
import { buttonClassName } from './button-model.js';

const DisabledContext = createContext(false);
export function CardActions({action, secondaryAction}) {
  const disabled = useContext(DisabledContext);
  if (!action && !secondaryAction) return null;
  return <div className="cgw-pattern-actions">{[secondaryAction,action].filter(Boolean).map((item,index)=>{
    const inactive=disabled || item.disabled || item.loading;
    const variant=item.variant || (item===secondaryAction ? 'secondary' : 'primary');
    const Icon=item.icon;
    return item.href ? <a key={index} href={inactive ? undefined : item.href} aria-disabled={inactive || undefined}
      aria-busy={item.loading || undefined} className={buttonClassName({variant,appearance:item.appearance,size:'sm'})}
      onClick={inactive ? event=>event.preventDefault() : item.onClick}>
      {item.loading ? <LoaderCircle size={16} className="cgw-spin" aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}{item.label}
    </a> : <Button key={index} size="sm" variant={variant} appearance={item.appearance} disabled={disabled || item.disabled || !item.onClick} loading={item.loading}
      icon={Icon} onClick={item.onClick}>{item.label}</Button>;
  })}</div>;
}
export function CardFrame({kind, title, titleHref, headingLevel=3, eyebrow, description, leading, trailing, media,
  content, children, footer, action, secondaryAction, loading=false, error, onRetry, empty=false,
  emptyTitle='Nothing here yet', emptyDescription, disabled=false, featured=false, className='', style, id}) {
  const uid=useId(),titleId=`${uid}-title`,Heading=`h${[2,3,4,5,6].includes(headingLevel)?headingLevel:3}`;
  const interactive=!!(action || titleHref || secondaryAction);
  return <DisabledContext.Provider value={disabled}><article id={id} style={style} aria-labelledby={titleId} aria-busy={loading || undefined}
    className={`cgw-pattern-card cgw-pattern-card--${kind} ${featured?'cgw-pattern-card--featured':''} ${interactive?'cgw-pattern-card--interactive':''} ${className}`}>
    {loading ? <><span id={titleId} className="cgw-sr-only">{title}</span><div className="cgw-pattern-skeleton" role="status" aria-label={`Loading ${typeof title==='string'?title:'card'}`}>
      {media && <Skeleton height="10rem" />}<Skeleton width="38%" /><Skeleton width="75%" height="1.4rem" /><Skeleton width="90%" /><Skeleton height="3rem" />
    </div></> : <>
      {!error && !empty && media}
      <header className="cgw-pattern-head">
        {!error && !empty && leading}<div className="cgw-pattern-heading">{eyebrow && <div className="cgw-pattern-eyebrow">{eyebrow}</div>}
          <Heading id={titleId}>{titleHref && !disabled && !error && !empty ? <a href={titleHref}>{title}</a> : title}</Heading>
        </div>{!error && !empty && trailing}
      </header>
      {description && <p className="cgw-pattern-description">{description}</p>}
      {error ? <div className="cgw-pattern-body"><Alert tone="danger" title="Could not load this card">{error.message || String(error)}
        {onRetry && <Button size="sm" variant="secondary" onClick={onRetry} disabled={disabled}>Try again</Button>}</Alert></div> : empty ?
        <div className="cgw-pattern-body"><EmptyState title={emptyTitle} description={emptyDescription} /></div> : <>
          {(content || children) && <div className="cgw-pattern-body">{content}{children}</div>}
          {(footer || action || secondaryAction) && <footer className="cgw-pattern-foot">{footer}<CardActions action={action} secondaryAction={secondaryAction} /></footer>}
        </>}
    </>}
  </article></DisabledContext.Provider>;
}
export function CardMedia({image, media, icon:Icon=ImageIcon}) {
  const [failed,setFailed]=useState(null);
  if (media != null) return <div className="cgw-pattern-media">{media}</div>;
  return <div className="cgw-pattern-media">{image?.src && failed!==image.src ?
    <img src={image.src} alt={image.alt || ''} loading="lazy" decoding="async" style={{objectPosition:image.position}} onError={()=>setFailed(image.src)} /> :
    <div className="cgw-pattern-media-fallback" role={image?.alt?'img':undefined} aria-label={image?.alt || undefined} aria-hidden={image?.alt?undefined:true}><Icon size={48} strokeWidth={1.25} /></div>}
  </div>;
}
export function CardAvatar({name,src,size='md'}) {
  const [failed,setFailed]=useState(null);
  return <span className={`cgw-pattern-avatar cgw-pattern-avatar--${size}`} title={name} aria-label={name} role="img">
    {src && failed!==src ? <img src={src} alt="" loading="lazy" onError={()=>setFailed(src)} /> : name ? cardInitials(name) : <UserRound size={20} aria-hidden="true" />}
  </span>;
}
export function CardIcon({icon:Icon,tone='accent'}) {
  return Icon ? <span className={`cgw-pattern-icon cgw-tone--${tone}`}><Icon size={22} strokeWidth={1.65} aria-hidden="true" /></span> : null;
}
export function CardMeta({items}) {
  const values=(items || []).filter(item=>item && item.label != null && item.label !== '');
  if(!values.length) return null;
  return <ul className="cgw-pattern-meta">{values.map(({icon:Icon,label},index)=><li key={index}>{Icon && <Icon size={14} aria-hidden="true" />}{label}</li>)}</ul>;
}
export function CardTags({tags}) {
  return tags?.length ? <div className="cgw-pattern-tags">{tags.map((tag,index)=><Badge key={index}>{tag}</Badge>)}</div> : null;
}
export function CardRating({rating,reviewCount}) {
  if(cardNumber(rating)===null) return null;
  const value=Math.max(0,Math.min(5,rating));
  return <span className="cgw-pattern-rating" aria-label={`${value} out of 5${cardNumber(reviewCount)!==null?`, ${reviewCount} reviews`:''}`}>
    <Star size={14} fill="currentColor" aria-hidden="true" /><strong>{value.toFixed(1)}</strong>{cardNumber(reviewCount)!==null && <span>({reviewCount.toLocaleString()})</span>}
  </span>;
}
export function CardPrice({price,compareAtPrice,currency='USD',locale,priceSuffix}) {
  return <div className="cgw-pattern-price"><strong>{cardMoney(price,currency,locale)}</strong>{priceSuffix && <span>{priceSuffix}</span>}
    {cardNumber(price)!==null && cardNumber(compareAtPrice)!==null && compareAtPrice>price && <del aria-label={`Previously ${cardMoney(compareAtPrice,currency,locale)}`}>{cardMoney(compareAtPrice,currency,locale)}</del>}
  </div>;
}
export function CardSave({title,saved,onSavedChange}) {
  const disabled=useContext(DisabledContext);
  return onSavedChange ? <IconButton className="cgw-pattern-save" variant="secondary" size="sm" icon={Heart} label={`${saved?'Unsave':'Save'} ${title}`}
    aria-pressed={!!saved} disabled={disabled} onClick={()=>onSavedChange(!saved)} /> : null;
}
