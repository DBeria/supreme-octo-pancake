import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info); }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
          <p className="text-slate-600 mb-4">Open the browser console for details.</p>
          <pre className="bg-slate-100 p-3 rounded text-sm whitespace-pre-wrap">
            {String(this.state.error || '')}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
