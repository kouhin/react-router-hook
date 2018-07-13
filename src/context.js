import createReactContext from 'create-react-context';

const createNamedContext = (name, defaultValue) => {
  const Ctx = createReactContext(defaultValue);
  Ctx.Consumer.displayName = `${name}.Consumer`;
  Ctx.Provider.displayName = `${name}.Provider`;
  return Ctx;
};

const { Provider, Consumer } = createNamedContext('RouterHook');
export { Provider as RouterHookProvider, Consumer as RouterHookConsumer };
