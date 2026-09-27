// Shared by native buttons and card action links so both use the same appearances.
export function buttonClassName({variant='primary',appearance,size='md',fullWidth=false,className}) {
  const styled=appearance && !['ghost','link'].includes(variant);
  return ['cgw-button',`cgw-button--${variant}`,`cgw-button--${size}`,
    styled && `cgw-button--${appearance}`,fullWidth && 'cgw-button--full',className].filter(Boolean).join(' ');
}
