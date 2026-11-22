import { Component, type ReactNode } from 'react';

/** Renders nothing and tells the parent when its children fail (e.g. a chunk will not load). */
export class Fallback extends Component<{ onError: () => void; children: ReactNode }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
