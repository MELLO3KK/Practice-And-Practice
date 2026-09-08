/* Quiz Master - Router */

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
    }

    register(path, handler) {
        this.routes[path] = handler;
    }

    navigate(path) {
        if (this.routes[path]) {
            this.currentRoute = path;
            this.routes[path]();
            window.history.pushState({ path }, '', path);
        }
    }

    init() {
        const initialPath = window.location.pathname === '/' ? '/home' : window.location.pathname;
        this.navigate(initialPath);

        window.addEventListener('popstate', (e) => {
            if (e.state?.path && this.routes[e.state.path]) {
                this.currentRoute = e.state.path;
                this.routes[e.state.path]();
            }
        });
    }
}

const router = new Router();
