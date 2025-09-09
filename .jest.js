export default {
    'transform': {},
    'verbose': true,
    'testSequencer': './test/jestTestSequencer.js',
    'testPathIgnorePatterns': [
        '/node_modules/',
        // tests below are intended to be executed manually
        'appSyncAirRoutesQueries.test.js',
        'appSyncCustomAirRoutesQueries.test.js',
        'apolloAirRoutesQueries.test.js',
        'apolloCustomAirRoutesQueries.test.js'
    ],
    'globals': {
        // neptune db that has pre-loaded air routes sample data host and port
        // ex. db-neptune-foo-bar.cluster-abc.us-west-2.neptune.amazonaws.com
        'AIR_ROUTES_DB_HOST': process.env.AIR_ROUTES_DB_HOST,
        // ex. 8182
        'AIR_ROUTES_DB_PORT': process.env.AIR_ROUTES_DB_PORT
    }
};
