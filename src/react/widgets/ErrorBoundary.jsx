import { Component } from 'react';
import { Alert, Button } from './primitives.jsx';

/**
 * Contains a render error to the section it wraps, so one broken cell, sub table or page does not
 * blank the whole application. The back-office Layout wraps every routed page in one and DataTable
 * wraps each expanded row; wrap other independent sections (a card, a tab panel) the same way.
 * Changing resetKey (for example the route path or a record id) clears the error.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { fallback, title = 'This section could not be displayed', description = 'Something went wrong while rendering it. The rest of the page still works.' } = this.props;
    if (typeof fallback === 'function') return fallback(error, this.reset);
    if (fallback !== undefined) return fallback;
    return (
      <Alert tone="danger" title={title} action={<Button size="sm" variant="secondary" onClick={this.reset}>Try again</Button>}>
        {description}
      </Alert>
    );
  }
}
