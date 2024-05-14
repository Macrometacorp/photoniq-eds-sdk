const path = require('path');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'photoniq-eds-ws.min.js',
        path: path.resolve(__dirname, 'dist'),
        library: 'PhotoniqEdsWs',
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