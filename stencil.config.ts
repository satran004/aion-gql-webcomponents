import { Config } from '@stencil/core';
import { sass } from '@stencil/sass';
import builtins from 'rollup-plugin-node-builtins';

export const config: Config = {
  namespace: 'aion-gql-webcomponents',
  outputTargets:[
    {
      type: 'dist'
    },
    {
      type: 'www',
      serviceWorker: null
    }
  ],
  plugins: [
    builtins(),
    sass({
      injectGlobalPaths: [
        'src/global/variables.scss'
      ]
    })
  ]
};
