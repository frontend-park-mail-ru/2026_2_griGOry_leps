let currentUser = null;
const listeners = [];

export function setUser(user) {
  currentUser = user;
  listeners.forEach((fn) => fn(user));
}

export function getUser() {
  return currentUser;
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const index = listeners.indexOf(fn);
    if (index > -1) listeners.splice(index, 1);
  };
}