import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { useCloudgate } from '../context.jsx';
export const BackofficeLink = forwardRef(function BackofficeLink({ to, ...props }, ref) {
  const { backofficePath } = useCloudgate();
  return <Link {...props} ref={ref} to={backofficePath(to)} />;
});
