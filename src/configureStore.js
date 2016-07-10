import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import reducer, { initialState } from './routerModule';

export default function configureStore(extraArgument = {}) {
  const store = createStore(
    reducer,
    initialState,
    applyMiddleware(thunk.withExtraArgument(extraArgument)),
  );
  return store;
}
