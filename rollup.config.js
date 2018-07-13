import babel from 'rollup-plugin-babel';
import { uglify } from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import autoExternal from 'rollup-plugin-auto-external';

const NAME = 'ReactRouterHook';

const config = {
  input: 'src/index.js',
  output: {
    name: NAME,
    indent: false,
    exports: 'named',
    globals: {
      react: 'React'
    }
  },
  plugins: [
    babel({
      exclude: 'node_modules/**'
    }),
    resolve({
      jsnext: true
    }),
    commonjs({
      include: /node_modules/
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    }),
    autoExternal()
  ]
};

if (process.env.NODE_ENV === 'production') {
  config.plugins.push(
    uglify({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false
      }
    })
  );
}

export default config;
