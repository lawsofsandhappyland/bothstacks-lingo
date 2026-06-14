import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BothLingo crashed:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-void text-ghost-white flex flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-flame-orange font-black text-2xl">¡Ay, caramba!</h1>
          <p className="text-slate-grey">Something went wrong. Reloading usually fixes it.</p>
          <button className="pill-button pill-button-fuchsia" onClick={this.handleReload}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
