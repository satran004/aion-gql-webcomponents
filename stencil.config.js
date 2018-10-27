import { sass } from '@stencil/sass';
export const config = {
    namespace: 'aion-webcomponents',
    outputTargets: [
        {
            type: 'dist'
        },
        {
            type: 'www',
            serviceWorker: null
        }
    ],
    plugins: [
        sass({
            injectGlobalPaths: [
                'src/global/variables.scss'
            ]
        })
    ]
};
