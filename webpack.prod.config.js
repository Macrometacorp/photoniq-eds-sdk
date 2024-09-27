const path = require('path');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'photoniq-eds-sdk.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'PhotoniqEdsSdk',
        libraryTarget: 'umd',
        globalObject: 'this',
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    mode: 'production',
};