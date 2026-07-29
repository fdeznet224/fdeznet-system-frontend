/** Límite de errores global de la aplicación. */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('No fue posible cargar la pantalla', error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 text-center shadow-xl">
          <h1 className="text-xl font-semibold">No pudimos cargar esta pantalla</h1>
          <p className="mt-3 text-sm text-slate-400">
            Puede haber una versión nueva disponible o una interrupción temporal.
          </p>
          <button
            type="button"
            onClick={this.reload}
            className="mt-6 rounded-lg bg-cyan-500 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-cyan-400"
          >
            Recargar aplicación
          </button>
        </section>
      </main>
    );
  }
}
