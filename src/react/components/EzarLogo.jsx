import logo from '../assets/ezar-logo.svg';

export function EzarLogo({ size = 28, decorative = false }) {
  return <img src={logo} width={size} height={size} alt={decorative ? '' : 'eZAR'} className="cg-ezar-logo" />;
}
