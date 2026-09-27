import { lazy, Suspense } from 'react';
import { Skeleton } from './primitives.jsx';

// The full icon registry is only needed by the browser/picker, not normal widgets.
const Library = lazy(() => import('./IconLibraryContent.jsx'));
export function IconLibrary(props) {
  return <Suspense fallback={<div className="cgw-stack" role="status" aria-label="Loading icon library">
    <Skeleton width="60%" height="2rem" /><Skeleton height="12rem" />
  </div>}><Library {...props} /></Suspense>;
}
