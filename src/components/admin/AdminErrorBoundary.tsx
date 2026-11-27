"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AdminErrorBoundary] Caught unhandled exception:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-full min-w-0 bg-red-950/20 border border-red-500/30 rounded-2xl p-6 sm:p-8 my-4 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-white font-black text-base sm:text-lg mb-1">
            {this.props.fallbackTitle || 'Section Display Interrupted'}
          </h3>
          <p className="text-red-300 text-xs sm:text-sm max-w-xl mx-auto mb-5 leading-relaxed">
            {this.state.error?.message || 'An unexpected client-side exception occurred while rendering this module.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-red-600/20"
            >
              🔄 Retry Section
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs transition-colors border border-white/10"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
